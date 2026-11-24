/**
 * 节点级布局交互：左右方向与折叠。
 *
 * 数据源是正文里的独立指令（`%%side:left%%` / `%%fold:1%%`，见
 * `domain/document/node-layout`），**不是** `data.json`：方向与折叠随文件跨设备
 * 同步，重开与多视图都从 Markdown 重建。
 *
 * 两条写入路径：
 * - 右键菜单（`view-context-menu`）：方向子菜单与折叠/展开；
 * - 引擎自带的折叠按钮：画布 **capture** 阶段接管 `.smm-expand-btn` 的点击，
 *   改成一次原文写回。若放给引擎处理，它走 `SET_NODE_EXPAND` 命令——只改
 *   `data.expand` 并记一条引擎历史，保存时 `mdRaw` 逐字回写，折叠状态就丢了。
 */
import { Notice } from 'obsidian';
import type { MindMapNode } from '@/src/core/engine-types';
import { elementFromTarget } from '@/src/core/event-binder';
import { t } from '@/src/core/i18n';
import type { MdNodeData } from '@/src/core/node-data';
import {
	applyNodeLayoutFields,
	readNodeLayout,
	supportsBranchSide,
	type BranchSide,
	type NodeLayout,
} from '@/src/domain/document';
import {
	applyDirectiveBlock,
	splitDirectiveSegments,
	type DirectiveSegment,
} from '@/src/domain/relations';
import { findNodeByDom } from '@/src/engine';
import { applyRawNodeContents } from '@/src/features/content/node-content-write';
import type { MindMapViewContext } from '@/src/features/view/view-context';
import { composeNodeContent } from '@/src/markdown';

/** 引擎折叠按钮的类名（上游 `node/nodeExpandBtn.js` 的 `addClass`） */
const EXPAND_BTN_CLASS = 'smm-expand-btn';

/** 该节点能否折叠：有子节点且不是中心主题（虚拟根没有正文行） */
export function isFoldableNode(node: MindMapNode): boolean {
	return !node.isRoot && (node.children?.length ?? 0) > 0;
}

/** 该节点能否设置方向：根的直接子节点（后代继承父分支方向） */
export function isBranchRootNode(node: MindMapNode): boolean {
	return !node.isRoot && node.parent?.isRoot === true;
}

/** 当前布局是否提供方向入口 */
export function canSetBranchSide(view: MindMapViewContext): boolean {
	return supportsBranchSide(view.resolveLayout());
}

/**
 * 设置分支方向。仅根的直接子节点有语义；`auto` = 删除方向属性，交给布局交替。
 *
 * @returns 是否真的写了文件（无变化 / 不适用时 false）
 */
export function setBranchSide(
	view: MindMapViewContext,
	node: MindMapNode,
	side: BranchSide,
): boolean {
	if (!isBranchRootNode(node)) {
		return false;
	}
	if (!canSetBranchSide(view)) {
		new Notice(t(view.lang, 'menu.branchSideUnsupported'));
		return false;
	}
	const current = readNodeLayout(node.getData() as MdNodeData);
	return writeNodeLayout(view, node, { ...current, side });
}

/**
 * 切换折叠/展开。折叠写 `%%fold:1%%`，展开删除该属性（默认即展开）。
 *
 * @returns 是否真的写了文件
 */
export function toggleNodeFold(
	view: MindMapViewContext,
	node: MindMapNode,
): boolean {
	if (!isFoldableNode(node)) {
		return false;
	}
	const current = readNodeLayout(node.getData() as MdNodeData);
	return writeNodeLayout(view, node, { ...current, fold: !current.fold });
}

/** 布局段：`side` 与 `fold` 合并成一行，`auto` 不写方向、展开不写 fold */
export function layoutSegmentsOf(layout: NodeLayout): DirectiveSegment[] {
	const segments: DirectiveSegment[] = [];
	if (layout.side !== 'auto') {
		const value = layout.fold ? `${layout.side},fold:1` : layout.side;
		segments.push({ key: 'side', value, raw: `%%side:${value}%%` });
	} else if (layout.fold) {
		segments.push({ key: 'fold', value: '1', raw: '%%fold:1%%' });
	}
	return segments;
}

/**
 * 生成带新布局的节点原文：内容沿用 `composeNodeContent`，只替换 `side` / `fold`
 * 两种段，`id` / `rel` / `sum` 逐字带回（与联系、配色同一纪律）。
 */
function rawWithLayout(
	data: MdNodeData,
	app: MindMapViewContext['app'],
	layout: NodeLayout,
): string {
	const raw = composeNodeContent(data, app);
	const { segments } = splitDirectiveSegments(raw);
	const kept = segments.filter(
		(segment) => segment.key !== 'side' && segment.key !== 'fold',
	);
	return applyDirectiveBlock(raw, [...kept, ...layoutSegmentsOf(layout)]);
}

/** 写入并提交：一次渲染 / 一次保存 / 一条撤销 */
function writeNodeLayout(
	view: MindMapViewContext,
	node: MindMapNode,
	next: NodeLayout,
): boolean {
	const data = node.getData() as MdNodeData;
	const current = readNodeLayout(data);
	if (current.side === next.side && current.fold === next.fold) {
		return false;
	}
	const raw = rawWithLayout(data, view.app, next);
	// 布局变化不是正文文本编辑：不触发中心主题改名 / 自动拆链等提交后编排
	applyRawNodeContents(view, [{ node, raw }], { afterCommit: false });
	// applyRawToNode 已按新指令重算 mdSide/mdFold/dir/expand；这里只补一次
	// 防御式投影，保证没有正文行可写时（理论上不会走到）也不会残留旧状态。
	applyNodeLayoutFields(data, next);
	return true;
}

/**
 * 接管引擎折叠按钮：capture 阶段拦下点击，改走原文写回。
 *
 * 必须在 `canvasEl` 的 **capture** 阶段：引擎把 click 绑在 `.smm-expand-btn`
 * 元素自身，冒泡阶段再拦已经晚于它的 `SET_NODE_EXPAND`。
 */
export function setupNodeLayoutInteractions(view: MindMapViewContext): void {
	const canvasEl = view.canvasEl;
	if (!canvasEl || !view.mindMap) {
		return;
	}
	view.engineEvents.onDom(
		canvasEl,
		'click',
		(event) => {
			const target = elementFromTarget(event.target);
			const button = target?.closest(`.${EXPAND_BTN_CLASS}`);
			if (!button) {
				return;
			}
			const node = findNodeByDom(view.mindMap, button);
			if (!node) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			toggleNodeFold(view, node);
		},
		true,
	);
}
