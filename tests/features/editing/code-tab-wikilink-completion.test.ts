import { describe, expect, it, vi } from 'vitest';
import { FileView } from 'obsidian';
import type { App } from 'obsidian';
import { CodeTabWikilinkCompletion } from '@/src/features/editing/code-tab-wikilink-completion';
import type { CompletionRule } from '@/src/platform/rendering/plugins/code-tab-api';
import { wikilinkCompletions } from '@/src/platform/workspace/wikilink-completions';

const discover = vi.hoisted(() => vi.fn());
vi.mock('@/src/platform/rendering/plugins/code-tab', () => ({ getCodeTabApi: discover }));
vi.mock('@/src/platform/workspace/wikilink-completions', () => ({ wikilinkCompletions: vi.fn(() => [{ label: 'Target', detail: 'Target.md', linkpath: 'Target', icon: 'file-text' }]) }));

function fixture() {
	const active = { closest: vi.fn(() => ({})) };
	const focused = vi.fn(() => true);
	const doc = { activeElement: active, hasFocus: focused } as unknown as Document;
	const view = Object.assign(Object.create(FileView.prototype) as FileView, { getViewType: (): string => 'mindmap-view', file: { path: 'Map.md' }, containerEl: { contains: (el: unknown) => el === active } });
	const app = { workspace: { getLeavesOfType: () => view.getViewType() === 'mindmap-view' ? [{ view }] : [] } } as unknown as App;
	const remove = vi.fn(); const registerRule = vi.fn((_rule: CompletionRule) => remove);
	const api = { completion: { list: () => [], registerRule } };
	discover.mockReturnValue(api);
	return { app, doc, active, focused, view, api, remove, registerRule };
}
describe('CodeTab wiki rule lifecycle', () => {
	it('registers once and maps the entire unfinished wiki token to a completion item', () => {
		const data = fixture(); const bridge = new CodeTabWikilinkCompletion(data.app);
		bridge.register(data.doc); bridge.register(data.doc);
		expect(data.registerRule).toHaveBeenCalledOnce();
		const rule = data.registerRule.mock.calls[0]![0];
		expect(rule.complete?.({ text: 'text [[Tar]]', offset: 10 } as never)).toEqual([{ label: 'Target', detail: 'Target.md', insertText: '[[Target]]', from: 5, to: 12 }]);
		bridge.dispose(); expect(data.remove).toHaveBeenCalledOnce();
	});
	it('does not offer map-specific rules to ordinary Markdown editors', () => {
		const data = fixture(); data.view.getViewType = () => 'markdown';
		const bridge = new CodeTabWikilinkCompletion(data.app); bridge.register(data.doc);
		expect(data.registerRule.mock.calls[0]![0].complete?.({ text: '[[', offset: 2 } as never)).toEqual([]);
		bridge.dispose();
	});
	it('releases the old provider registration when CodeTab is re-enabled', () => {
		const data = fixture(); const bridge = new CodeTabWikilinkCompletion(data.app); bridge.register(data.doc);
		const second = vi.fn(() => vi.fn()); discover.mockReturnValue({ completion: { list: () => [], registerRule: second } });
		bridge.register(data.doc); expect(data.remove).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce(); bridge.dispose();
	});
	it('uses the focused editor file after rename and excludes controls outside map plugin content', async () => {
		const data = fixture(); const bridge = new CodeTabWikilinkCompletion(data.app); bridge.register(data.doc);
		data.view.file.path = 'Moved/Map.md';
		const rule = data.registerRule.mock.calls[0]![0];
		await rule.complete?.({ text: '[[', offset: 2 } as never);
		expect(wikilinkCompletions).toHaveBeenLastCalledWith(data.app, '', 'Moved/Map.md');
		data.active.closest.mockReturnValue(null as never);
		expect(rule.complete?.({ text: '[[', offset: 2 } as never)).toEqual([]);
		bridge.dispose();
	});
	it('ignores an inactive window and releases a closed document without releasing shared rules', () => {
		const data = fixture(); const bridge = new CodeTabWikilinkCompletion(data.app); bridge.register(data.doc);
		const rule = data.registerRule.mock.calls[0]![0];
		data.focused.mockReturnValue(false);
		expect(rule.complete?.({ text: '[[', offset: 2 } as never)).toEqual([]);
		data.focused.mockReturnValue(true); bridge.unregister(data.doc);
		expect(rule.complete?.({ text: '[[', offset: 2 } as never)).toEqual([]);
		expect(data.remove).not.toHaveBeenCalled(); bridge.dispose();
	});
});
