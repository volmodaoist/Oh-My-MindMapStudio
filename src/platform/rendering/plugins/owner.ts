/** 单引擎插件会话：惰性挂载、活动组件迁移、冻结测量与编辑保护。 */
import { Component } from 'obsidian';
import type { App, EventRef } from 'obsidian';
import { PLUGIN_SLOT_CLASS, PLUGIN_SLOT_ID, PLUGIN_LIVE_CLASS, PLUGIN_INTERACTIVE_ATTR, PLUGIN_AUTO_WIDTH_ATTR } from '../../../core/plugin-content-types';
import type { PluginBlockRequest } from '../../../core/plugin-content-types';
import { fencedNodeBlocks, normalizeBlockSource } from '../../../markdown';
import { pluginPresentation } from './snapshot';
import { renderNativePlugin } from './native';
import type { PluginRenderRequest, PluginAdapter } from './native';
import { getCodeTabApi } from './code-tab';
import type { CodeTabSession } from './code-tab';
import type { CodeTabApi } from './code-tab-api';

export interface PluginOwnerDeps {
	app: App;
	sourcePath: () => string;
	onSettled: (holder: HTMLElement) => void;
	onChange?: (nodeId: string, index: number, expected: string, next: string | null) => Promise<void>;
	onEntry: (id: string, snapshot: (() => HTMLElement | null) | null) => void;
}
interface Specification { source: string; language: string; adapter: PluginAdapter }
interface Entry extends Specification {
	id: string; nodeId: string; index: number; root: HTMLElement | null; stage: HTMLElement | null;
	component: Component | null; controller: AbortController; snapshot: HTMLElement | null;
	slot: HTMLElement | null; ready: boolean; failed: boolean;
	width: number; height: number; widthHint: number; autoWidth: boolean; resize: ResizeObserver | null;
	session: CodeTabSession | null; failedProvider: CodeTabApi | null; work: Promise<void> | null; focused: HTMLElement | null;
}

export class PluginOwnerSession {
	private readonly entries = new Map<string, Entry>();
	private parking: HTMLElement | null = null;
	private canvas: HTMLElement | null = null;
	private observer: MutationObserver | null = null;
	private queued = false;
	private closed = false;
	private readonly layoutRef: EventRef | null;

	constructor(private readonly prefix: string, private readonly deps: PluginOwnerDeps) {
		this.layoutRef = deps.app.workspace?.on?.('layout-change', () => this.queueSync()) ?? null;
	}

	register(request: PluginBlockRequest, adapter: PluginAdapter): HTMLElement | null {
		const key = `${request.nodeId}:${request.index}`;
		const spec: Specification = { source: normalizeBlockSource(request.source), language: request.language, adapter };
		let entry = this.entries.get(key);
		if (entry && (entry.source !== spec.source || entry.language !== spec.language)) {
			this.applySpecification(entry, spec);
		}
		if (!entry) {
			entry = { ...spec, id: `${this.prefix}:${key}`, nodeId: request.nodeId, index: request.index,
				root: null, stage: null, component: null, controller: new AbortController(), snapshot: null,
				slot: null, ready: false, failed: false, width: 0, height: 0,
				widthHint: request.availableWidth ?? 468, autoWidth: request.autoWidth === true, resize: null, session: null, failedProvider: null, work: null, focused: null };
			this.entries.set(key, entry);
			const current = entry;
			this.deps.onEntry(entry.id, () => {
				if (!current.ready || !current.root) return null;
				return current.root.parentElement === current.slot ? pluginPresentation(current.root)
					: current.snapshot?.cloneNode(true) as HTMLElement ?? null;
			});
		}
		entry.widthHint = request.availableWidth ?? 468;
		entry.autoWidth = request.autoWidth === true;
		this.applyWidth(entry);
		request.holder.setAttribute(PLUGIN_SLOT_ID, entry.id);
		return entry.snapshot ? entry.snapshot.cloneNode(true) as HTMLElement : null;
	}

	sync(root: HTMLElement, sources?: ReadonlyMap<string, string>): void {
		if (this.closed) return;
		if (this.canvas !== root) {
			this.observer?.disconnect(); this.canvas = root;
			const Observer = root.ownerDocument.defaultView?.MutationObserver;
			if (Observer) {
				this.observer = new Observer(records => {
					if (this.entries.size && records.some(record => !(record.target as Element).closest?.(`.${PLUGIN_LIVE_CLASS}`))) this.queueSync();
				});
				this.observer.observe(root, { childList: true, subtree: true });
			}
		}
		const slots = new Map<string, HTMLElement>();
		for (const slot of Array.from(root.querySelectorAll<HTMLElement>(`.${PLUGIN_SLOT_CLASS}`))) {
			if (slot.isConnected && slot.closest('foreignObject')) slots.set(slot.getAttribute(PLUGIN_SLOT_ID) ?? '', slot);
		}
		for (const [key, entry] of this.entries) {
			// 内部 DOM/状态通知仅重挂槽位；只有调用方提供的新树才是权威源码。
			if (sources) {
				const raw = sources.get(entry.nodeId);
				const block = raw === undefined ? null : fencedNodeBlocks(raw)[entry.index];
				if (!block) { this.release(entry); this.entries.delete(key); continue; }
				if (block.language.toLowerCase() !== entry.language) {
					this.release(entry); this.entries.delete(key); continue;
				}
				if (normalizeBlockSource(block.source) !== entry.source) {
					this.applySpecification(entry, { source: normalizeBlockSource(block.source), language: entry.language, adapter: entry.adapter });
				}
			}
			if (entry.session && !entry.session.active) this.restart(entry, entry);
			if (entry.failed && entry.adapter.host && getCodeTabApi(root.ownerDocument) !== entry.failedProvider) this.restart(entry, entry);
			entry.session?.update({ source: entry.source, sourcePath: this.deps.sourcePath() });
			entry.slot = slots.get(entry.id) ?? null;
			if (entry.slot) {
				if (!entry.root && !entry.failed) this.start(entry, root.ownerDocument);
				if (entry.root && entry.ready && entry.root.parentElement !== entry.slot) {
					entry.slot.replaceChildren(entry.root);
					const active = entry.root.ownerDocument.activeElement;
					if (entry.focused && entry.root.contains(entry.focused) &&
						(active === entry.root.ownerDocument.body || entry.root.contains(active))) {
						entry.focused.focus({ preventScroll: true });
					}
					this.updateSize(entry);
				}
			} else if (entry.root && entry.stage && entry.root.parentElement !== entry.stage) {
				entry.stage.appendChild(entry.root);
			}
		}
	}

	private queueSync(): void {
		if (this.queued || this.closed) return;
		this.queued = true;
		queueMicrotask(() => { this.queued = false; if (this.canvas) this.sync(this.canvas); });
	}

	private start(entry: Entry, doc: Document): void {
		if (!this.parking) {
			this.parking = doc.createElement('div');
			Object.assign(this.parking.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none' });
			doc.body.appendChild(this.parking);
		}
		const stage = doc.createElement('div');
		this.parking.appendChild(stage); entry.stage = stage;
		const root = doc.createElement('div'); root.className = `${PLUGIN_LIVE_CLASS} markdown-rendered`;
		Object.assign(root.style, { display: 'inline-block', whiteSpace: 'normal',
			fontSize: 'var(--font-text-size, 16px)', color: 'var(--text-normal)', backgroundColor: 'var(--background-primary)',
			pointerEvents: entry.adapter.mode === 'static' ? 'none' : 'auto' });
		if (entry.adapter.host) stage.appendChild(root); entry.root = root;
		this.applyWidth(entry);
		const controller = entry.controller;
		const component = new Component(); component.load(); entry.component = component;
		const stopControlEvent = (event: Event): void => {
			const target = event.target as Element | null;
			if (target?.closest?.(`button, a, input, textarea, [contenteditable], [${PLUGIN_INTERACTIVE_ATTR}]`)) event.stopPropagation();
		};
		for (const type of ['mousedown', 'pointerdown', 'click', 'dblclick', 'contextmenu', 'dragstart']) {
			root.addEventListener(type, stopControlEvent);
			component.register(() => root.removeEventListener(type, stopControlEvent));
		}
		const request: PluginRenderRequest = { language: entry.language, source: entry.source,
			sourcePath: this.deps.sourcePath(), id: entry.id, container: root, component,
			readOnly: !this.deps.onChange,
			onChange: this.deps.onChange ? async (expected, next) => {
				if (entry.controller !== controller || controller.signal.aborted) throw new Error('插件组件已关闭');
				const previous = entry.source; const proposed = next === null ? '' : normalizeBlockSource(next); entry.source = proposed;
				try { await this.deps.onChange!(entry.nodeId, entry.index, expected, next); }
				catch (error) {
					if (entry.controller === controller && entry.source === proposed) entry.source = previous;
					throw error;
				}
			} : undefined };
		entry.work = renderNativePlugin(this.deps.app, request, entry.adapter, controller.signal, () => stage.appendChild(root), () => {
			if (entry.controller === controller && !controller.signal.aborted) this.updateSize(entry);
		}).then(session => {
			if (entry.controller !== controller || controller.signal.aborted) { session?.dispose(); return; }
			entry.session = session;
			session?.update({ source: entry.source, sourcePath: this.deps.sourcePath() });
			entry.ready = true;
			const Observer = doc.defaultView?.ResizeObserver;
			if (Observer) { entry.resize = new Observer(() => this.updateSize(entry)); entry.resize.observe(root); }
			if (this.canvas) this.sync(this.canvas);
		}).catch(error => {
			if (entry.controller !== controller) return;
			if (!controller.signal.aborted) console.warn('插件内容渲染失败，保留源码:', entry.language, error);
			entry.failed = true; entry.failedProvider = entry.adapter.host ? getCodeTabApi(doc) : null;
			component.unload(); root.remove(); stage.remove(); entry.root = null;
		});
	}

	private applyWidth(entry: Entry): void {
		const width = `${entry.widthHint}px`;
		if (entry.stage) Object.assign(entry.stage.style, { width: entry.autoWidth ? 'max-content' : width });
		if (!entry.root) return;
		if (entry.autoWidth) entry.root.setAttribute(PLUGIN_AUTO_WIDTH_ATTR, '');
		else entry.root.removeAttribute(PLUGIN_AUTO_WIDTH_ATTR);
		Object.assign(entry.root.style, { width: entry.autoWidth ? 'max-content' : width,
			maxWidth: entry.autoWidth ? 'none' : width, minWidth: entry.autoWidth ? width : '0' });
		entry.root.style.setProperty('--mindmap-plugin-text-width', width);
	}

	private updateSize(entry: Entry): void {
		if (!entry.ready || !entry.root || !entry.slot || entry.root.parentElement !== entry.slot) return;
		const active = entry.root.ownerDocument.activeElement;
		if (entry.root.contains(active)) entry.focused = active as HTMLElement;
		const width = entry.root.offsetWidth; const height = entry.root.offsetHeight;
		if (!width || !height || (width === entry.width && height === entry.height)) return;
		entry.width = width; entry.height = height; entry.snapshot = pluginPresentation(entry.root);
		this.deps.onSettled(entry.slot);
	}

	private releaseComponent(entry: Entry): void {
		entry.controller.abort(); entry.resize?.disconnect(); entry.session?.dispose(); entry.component?.unload(); entry.root?.remove(); entry.stage?.remove();
	}
	private release(entry: Entry): void { this.releaseComponent(entry); this.deps.onEntry(entry.id, null); }
	private applySpecification(entry: Entry, spec: Specification): void {
		if (!entry.failed && entry.adapter.host && entry.language === spec.language) {
			Object.assign(entry, spec);
			entry.session?.update({ source: spec.source, sourcePath: this.deps.sourcePath() });
		} else this.restart(entry, spec);
	}
	private restart(entry: Entry, spec: Specification): void {
		this.releaseComponent(entry); Object.assign(entry, spec);
		entry.controller = new AbortController(); entry.root = null; entry.stage = null; entry.component = null;
		entry.resize = null; entry.ready = false; entry.failed = false; entry.snapshot = null;
		entry.width = 0; entry.height = 0; entry.work = null; entry.session = null; entry.failedProvider = null;
	}
	get hasEntries(): boolean { return this.entries.size > 0; }
	/** 正文编辑状态之外，标题等持焦控件同样必须在尺寸重排中保留原 DOM。 */
	get editingNodeIds(): ReadonlySet<string> {
		return new Set(Array.from(this.entries.values()).filter(entry => entry.session?.editing ||
			!!entry.root?.contains(entry.root.ownerDocument.activeElement)).map(entry => entry.nodeId));
	}
	async prepare(): Promise<ReadonlySet<string>> {
		if (!this.canvas || this.closed) return new Set();
		this.sync(this.canvas);
		for (const entry of this.entries.values()) if (!entry.root && !entry.failed) this.start(entry, this.canvas.ownerDocument);
		await Promise.all(Array.from(this.entries.values(), entry => entry.work ?? Promise.resolve()));
		await Promise.all(Array.from(this.entries.values(), entry => entry.session?.prepare() ?? Promise.resolve()));
		for (const entry of this.entries.values()) if (entry.ready && entry.root) entry.snapshot = pluginPresentation(entry.root);
		return new Set(Array.from(this.entries.values(), entry => entry.nodeId));
	}
	dispose(): void {
		this.closed = true; this.observer?.disconnect();
		if (this.layoutRef) this.deps.app.workspace.offref(this.layoutRef);
		for (const entry of this.entries.values()) this.release(entry);
		this.entries.clear(); this.parking?.remove(); this.parking = null;
	}
}
