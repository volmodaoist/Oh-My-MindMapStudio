/** CodeTab OpenAPI：发现、活动句柄与宿主最新值同步；Busy 等状态通知重试，不覆盖草稿。 */
import { createSerialQueue } from '@/src/core/concurrency';
import { createWarnOnce } from '@/src/core/errors';
import type { CodeTabApi, CodeTabApiRequest, CodeTabHandle, CodeTabRenderOptions, CodeTabUpdate } from './code-tab-api';

export function getCodeTabApi(doc: Document): CodeTabApi | null {
	const win = doc.defaultView;
	if (!win) return null;
	const request: CodeTabApiRequest = {};
	doc.dispatchEvent(new win.CustomEvent('obsidian-code-tab-api', { detail: request }));
	const api = request.api;
	return api && typeof api.render === 'function' ? api : null;
}

function hasCode(error: unknown, code: string): boolean {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/** 更新串行执行；只保留最新宿主值，订阅只排任务，避免保存回调同步等待 update。 */
export class CodeTabSession {
	private readonly serial = createSerialQueue();
	private readonly warn = createWarnOnce();
	private pending: CodeTabUpdate | null = null;
	private queued = false;
	private closed = false;
	private notifications = 0;
	private editingNow = false;
	private readonly unsubscribe: () => void;

	constructor(private readonly api: CodeTabApi, private readonly handle: CodeTabHandle, private readonly changed: () => void) {
		this.unsubscribe = handle.subscribe(snapshot => {
			this.editingNow = snapshot.editing;
			this.notifications++;
			this.schedule();
			changed();
		});
	}
	get editing(): boolean { return !this.closed && this.editingNow; }

	get active(): boolean {
		if (this.closed) return false;
		try { this.handle.getSnapshot(); return true; }
		catch (error) {
			if (hasCode(error, this.api.errorCodes.Disposed)) this.dispose();
			else this.warn('CodeTab 状态读取失败', error);
			return false;
		}
	}

	update(patch: CodeTabUpdate): void {
		if (this.closed) return;
		this.pending = { ...this.pending, ...patch };
		this.schedule();
	}

	private schedule(): void {
		if (this.closed || this.queued || !this.pending) return;
		this.queued = true;
		void this.serial(async () => {
			this.queued = false;
			if (this.closed || !this.pending) return;
			const patch = this.takePending()!;
			const notifications = this.notifications;
			try { await this.handle.update(patch); }
			catch (error) {
				if (this.closed) return;
				if (hasCode(error, this.api.errorCodes.Disposed)) { this.dispose(); this.changed(); return; }
				this.pending = { ...patch, ...this.pending };
				if (hasCode(error, this.api.errorCodes.Busy)) {
					// 空闲通知可能先于拒绝 Promise 到达；此时补一次重试，不能等待已消费的通知。
					if (this.notifications !== notifications) this.schedule();
				} else this.warn('CodeTab 内容同步失败，保留已接受正文', error);
			}
		}).catch(error => this.warn('CodeTab 同步任务失败', error));
	}
	private takePending(): CodeTabUpdate | null {
		const patch = this.pending; this.pending = null; return patch;
	}

	async prepare(): Promise<void> { await this.serial(async () => undefined); }

	/** 真正删除/卸载取消未提交草稿；已有 onChange 事务由宿主保存管线完成。 */
	dispose(): void {
		if (this.closed) return;
		this.closed = true;
		this.pending = null;
		this.unsubscribe();
		this.handle.dispose();
	}
}

export async function renderCodeTab(options: CodeTabRenderOptions, signal: AbortSignal, changed: () => void): Promise<CodeTabSession> {
	if (signal.aborted) throw new Error('渲染已取消');
	const api = getCodeTabApi(options.container.ownerDocument);
	if (!api) throw new Error('CodeTab OpenAPI 不可用');
	const handle = await api.render(options);
	if (signal.aborted) { handle.dispose(); throw new Error('渲染已取消'); }
	try { return new CodeTabSession(api, handle, changed); }
	catch (error) { handle.dispose(); throw error; }
}
