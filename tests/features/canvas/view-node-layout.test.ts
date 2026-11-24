/** 方向/折叠写回：段落组合、可用性判定与不适用时不写盘。 */
import { describe, expect, it, vi } from 'vitest';
import type { MindMapNode } from '@/src/core/engine-types';
import type { MindMapViewContext } from '@/src/features/view/view-context';

const mocks = vi.hoisted(() => ({
	applyRawNodeContents: vi.fn(),
}));

vi.mock('@/src/engine', () => import('@/src/engine/nodes/mindmap-nodes'));
vi.mock('@/src/features/content/node-content-write', () => ({
	applyRawNodeContents: mocks.applyRawNodeContents,
}));

const {
	isBranchRootNode,
	isFoldableNode,
	layoutSegmentsOf,
	setBranchSide,
	toggleNodeFold,
} = await import('@/src/features/canvas/view-node-layout');

function makeView(layout = 'mindMap'): MindMapViewContext {
	return {
		app: null,
		lang: 'zh',
		resolveLayout: () => layout,
	} as unknown as MindMapViewContext;
}

function makeNode(
	data: Record<string, unknown>,
	options: { root?: boolean; parentRoot?: boolean; children?: number; renderedChildren?: number } = {},
): MindMapNode {
	return {
		isRoot: options.root ?? false,
		parent: { isRoot: options.parentRoot ?? true },
		children: Array.from({ length: options.renderedChildren ?? options.children ?? 0 }, () => ({})),
		nodeData: { data, children: Array.from({ length: options.children ?? 0 }, () => ({})) },
		getData: () => data,
	} as unknown as MindMapNode;
}

function headingData(extra: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		text: '前端',
		mdType: 'heading',
		mdLevel: 1,
		mdRaw: '前端',
		mdDerivedText: '前端',
		...extra,
	};
}

describe('layoutSegmentsOf', () => {
	it('合并 side/fold，auto 与展开不写冗余段', () => {
		expect(layoutSegmentsOf({ side: 'left', fold: false })).toEqual([
			{ key: 'side', value: 'left', raw: '%%side:left%%' },
		]);
		expect(layoutSegmentsOf({ side: 'right', fold: true })).toEqual([
			{ key: 'side', value: 'right,fold:1', raw: '%%side:right,fold:1%%' },
		]);
		expect(layoutSegmentsOf({ side: 'auto', fold: true })).toEqual([
			{ key: 'fold', value: '1', raw: '%%fold:1%%' },
		]);
		expect(layoutSegmentsOf({ side: 'auto', fold: false })).toEqual([]);
	});
});

describe('可用性判定', () => {
	it('方向只对首层分支开放；折叠要求有子节点且不是根', () => {
		expect(isBranchRootNode(makeNode(headingData()))).toBe(true);
		expect(isBranchRootNode(makeNode(headingData(), { parentRoot: false }))).toBe(false);
		expect(isBranchRootNode(makeNode(headingData(), { root: true }))).toBe(false);

		expect(isFoldableNode(makeNode(headingData(), { children: 1 }))).toBe(true);
		expect(isFoldableNode(makeNode(headingData()))).toBe(false);
		expect(isFoldableNode(makeNode(headingData(), { root: true, children: 2 }))).toBe(false);
	});
});

describe('写回', () => {
	it('折叠节点即使没有渲染子节点也能展开，保留方向与正文', () => {
		mocks.applyRawNodeContents.mockClear();
		const node = makeNode(headingData({
			mdRaw: '前端\n%%side:left,fold:1%%',
			mdDirectiveTail: '%%side:left,fold:1%%',
			mdSide: 'left',
			mdFold: true,
			expand: false,
		}), { children: 1, renderedChildren: 0 });
		expect(toggleNodeFold(makeView(), node)).toBe(true);
		expect(mocks.applyRawNodeContents).toHaveBeenCalledExactlyOnceWith(
			expect.anything(), [{ node, raw: '前端\n%%side:left%%' }], { afterCommit: false },
		);
	});

	it('设置方向只替换 side/fold 段，概要等其它指令逐字保留', () => {
		mocks.applyRawNodeContents.mockClear();
		const node = makeNode(
			headingData({
				// 解析期 mdRaw 含指令行（与 md-outline.attachDirectiveLine 同口径）
				mdRaw: '前端\n%%sum:2 | 核心结论%%',
				mdDirectiveTail: '%%sum:2 | 核心结论%%',
			}),
		);
		expect(setBranchSide(makeView(), node, 'left')).toBe(true);
		const entries = mocks.applyRawNodeContents.mock.calls[0]![1] as {
			raw: string;
		}[];
		expect(entries[0]!.raw).toContain('%%side:left%%');
		expect(entries[0]!.raw).toContain('%%sum:2 | 核心结论%%');
	});

	it('折叠写 fold:1；不支持的布局与非首层分支不写盘', () => {
		mocks.applyRawNodeContents.mockClear();
		const node = makeNode(headingData(), { children: 1 });
		expect(toggleNodeFold(makeView(), node)).toBe(true);
		const entries = mocks.applyRawNodeContents.mock.calls[0]![1] as {
			raw: string;
		}[];
		expect(entries[0]!.raw).toContain('%%fold:1%%');

		mocks.applyRawNodeContents.mockClear();
		expect(setBranchSide(makeView('logicalStructure'), node, 'left')).toBe(false);
		expect(setBranchSide(makeView(), makeNode(headingData(), { parentRoot: false }), 'left')).toBe(false);
		expect(mocks.applyRawNodeContents).not.toHaveBeenCalled();
	});
});
