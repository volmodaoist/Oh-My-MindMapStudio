import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commitPluginBlock } from '../../../src/features/content/plugin-content-session';
import type { ViewNodeEditContext } from '../../../src/features/view/view-context';

const engine = vi.hoisted(() => ({ findRenderNodeByUid: vi.fn(), getRenderRoot: vi.fn(),
	renderWithCallback: vi.fn(), refreshNodesCustomContent: vi.fn() }));
const write = vi.hoisted(() => vi.fn());
vi.mock('../../../src/engine', () => engine);
vi.mock('../../../src/features/content/node-content-write', () => ({ applyRawNodeContent: write }));
vi.mock('../../../src/platform/rendering/plugins/bridge', () => ({ preparePluginContents: vi.fn() }));

const original = '````tab\ntab: A\nhello\n````\n';
function context() {
	const map = {}; const node = { getData: () => ({ mdRaw: original }) };
	const state = { mindMap: map, lang: 'zh' };
	const view = state as unknown as ViewNodeEditContext;
	return { map, node, view, state };
}
beforeEach(() => { vi.resetAllMocks(); engine.renderWithCallback.mockResolvedValue(undefined); });

describe('CodeTab source commit during layout', () => {
	it('commits a matching block through the existing node write path', async () => {
		const { view, node } = context(); engine.findRenderNodeByUid.mockReturnValue(node);
		await commitPluginBlock(view, 'uid', 0, 'tab: A\nhello', 'tab: A\nchanged');
		expect(write).toHaveBeenCalledExactlyOnceWith(view, node, '````tab\ntab: A\nchanged\n````\n');
		expect(engine.renderWithCallback).not.toHaveBeenCalled();
	});
	it('waits for a temporarily absent render root before finding and saving the node', async () => {
		const { view, node, map } = context(); engine.getRenderRoot.mockReturnValue(null);
		engine.findRenderNodeByUid.mockReturnValueOnce(null).mockReturnValueOnce(node);
		await commitPluginBlock(view, 'uid', 0, 'tab: A\nhello', 'tab: A\nchanged');
		expect(engine.renderWithCallback).toHaveBeenCalledExactlyOnceWith(map);
		expect(write).toHaveBeenCalledOnce();
	});
	it('does not render or write when the node is actually absent from a ready tree', async () => {
		const { view } = context(); engine.getRenderRoot.mockReturnValue({}); engine.findRenderNodeByUid.mockReturnValue(null);
		await expect(commitPluginBlock(view, 'uid', 0, 'tab: A\nhello', null)).rejects.toThrow('节点已被删除或替换');
		expect(engine.renderWithCallback).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
	});
	it('refuses to write to an engine replaced while the render was pending', async () => {
		const { view, node, state } = context(); engine.findRenderNodeByUid.mockReturnValueOnce(null).mockReturnValue(node);
		engine.getRenderRoot.mockReturnValue(null);
		engine.renderWithCallback.mockImplementation(async () => { state.mindMap = {}; });
		await expect(commitPluginBlock(view, 'uid', 0, 'tab: A\nhello', null)).rejects.toThrow('节点已被删除或替换');
		expect(write).not.toHaveBeenCalled();
	});
	it('still checks source conflicts after waiting for layout completion', async () => {
		const { view, node } = context(); engine.getRenderRoot.mockReturnValue(null);
		engine.findRenderNodeByUid.mockReturnValueOnce(null).mockReturnValueOnce(node);
		await expect(commitPluginBlock(view, 'uid', 0, 'stale source', null)).rejects.toThrow('代码块已发生变化');
		expect(write).not.toHaveBeenCalled();
	});
});
