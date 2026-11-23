/** 共享输入扩展直测；弹层 DOM 交真实宿主，业务不自行替换文本或保存。 */
import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import type { EditorInputContext, EditorInputSurface } from '@/src/core/editor-input';
import { NodeWikilinkCompletion } from '@/src/features/editing/node-wikilink-completion';

const popup = vi.hoisted(() => ({ show: vi.fn(), close: vi.fn(), dispose: vi.fn(), handleKey: vi.fn(), contains: vi.fn(), choose: (_item: unknown) => {} }));
const candidates = vi.hoisted(() => vi.fn(() => [{ label: 'Target', linkpath: 'Target', detail: 'Target.md', icon: 'file-text' }]));
vi.mock('@/src/platform/workspace/wikilink-completions', () => ({ wikilinkCompletions: candidates }));
vi.mock('@/src/ui/node-editor/wikilink-suggestions', () => ({ WikilinkSuggestions: class {
	constructor(_doc: Document, choose: (item: unknown) => void) { popup.choose = choose; }
	show = popup.show; close = popup.close; dispose = popup.dispose; handleKey = popup.handleKey; contains = popup.contains;
} }));

function setup() {
	vi.clearAllMocks();
	const element = Object.assign(new EventTarget(), { ownerDocument: {}, getBoundingClientRect: () => ({ left: 10 }), setAttribute: vi.fn(), removeAttribute: vi.fn() });
	let context: EditorInputContext = { text: '前😀[[Tar]]后', selection: { from: 8, to: 8 }, sourcePath: 'Folder/Map.md' };
	const replace = vi.fn();
	const input = { element, context: () => context, replace } as unknown as EditorInputSurface;
	const app = {} as App; const behavior = new NodeWikilinkCompletion(app, input);
	return { element, app, behavior, replace, setContext: (next: EditorInputContext) => { context = next; } };
}

describe('NodeWikilinkCompletion', () => {
	it('passes dynamic source context to candidates and replaces the whole token through the surface', () => {
		const h = setup(); h.behavior.update();
		expect(candidates).toHaveBeenCalledWith(h.app, 'Tar', 'Folder/Map.md');
		popup.choose({ linkpath: 'Target', alias: '别名' });
		expect(h.replace).toHaveBeenCalledWith({ from: 3, to: 10, query: 'Tar' }, '[[Target|别名]]');
		h.behavior.dispose();
	});
	it('rereads selection on choice, so a stale candidate cannot overwrite another selection', () => {
		const h = setup(); h.behavior.update();
		h.setContext({ text: 'other', selection: { from: 0, to: 5 }, sourcePath: 'Moved.md' });
		popup.choose({ linkpath: 'Target' });
		expect(h.replace).not.toHaveBeenCalled(); expect(popup.close).toHaveBeenCalled(); h.behavior.dispose();
	});
	it('defers suggestions during composition and refreshes only when composition finishes', () => {
		const h = setup(); h.element.dispatchEvent(new Event('compositionstart'));
		h.element.dispatchEvent(new Event('input')); expect(candidates).not.toHaveBeenCalled();
		h.element.dispatchEvent(new Event('compositionend')); expect(candidates).toHaveBeenCalledOnce(); h.behavior.dispose();
	});
	it('delegates extension keys and controls, then releases input listeners and popup', () => {
		const h = setup(); const event = {} as KeyboardEvent; const target = {} as Node;
		h.behavior.onKeyDown(event); h.behavior.contains(target);
		expect(popup.handleKey).toHaveBeenCalledWith(event); expect(popup.contains).toHaveBeenCalledWith(target);
		h.behavior.dispose(); h.element.dispatchEvent(new Event('input'));
		expect(candidates).not.toHaveBeenCalled(); expect(popup.dispose).toHaveBeenCalledOnce();
		expect(h.element.removeAttribute).toHaveBeenCalledWith('aria-autocomplete');
	});
});
