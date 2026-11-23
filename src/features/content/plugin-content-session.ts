/** 插件正文更新仍走节点原文提交管线，不另起 Vault 保存或撤销时间线。 */
import { readNodeDataString } from '../../core/node-data';
import { t } from '../../core/i18n';
import { findRenderNodeByUid, getRenderRoot, refreshNodesCustomContent, renderWithCallback } from '../../engine';
import { FencedBlockConflictError, replaceFencedNodeBlock } from '../../markdown';
import { applyRawNodeContent } from './node-content-write';
import { preparePluginContents } from '../../platform/rendering/plugins/bridge';
import type { ViewNodeEditContext } from '../view/view-context';
import type { MindMap } from '../../core/engine-types';

export async function commitPluginBlock(
	view: ViewNodeEditContext, nodeId: string, index: number, expected: string, next: string | null,
): Promise<void> {
	const mindMap = view.mindMap;
	let node = findRenderNodeByUid(mindMap, nodeId);
	// 尺寸重排期间 renderer.root 暂时为空，不等同于节点删除；等同一引擎落地后再核对原文。
	if (!node && mindMap && !getRenderRoot(mindMap)) {
		await renderWithCallback(mindMap);
		if (view.mindMap === mindMap) node = findRenderNodeByUid(mindMap, nodeId);
	}
	if (!node) throw new Error(t(view.lang, 'pluginContent.nodeMissing'));
	const data = node.getData?.();
	const raw = readNodeDataString(data, 'mdRaw') || readNodeDataString(data, 'text');
	try {
		const changed = replaceFencedNodeBlock(raw, index, expected, next);
		if (changed !== raw) applyRawNodeContent(view, node, changed);
	} catch (error) {
		if (error instanceof FencedBlockConflictError) throw new Error(t(view.lang, 'pluginContent.blockChanged'));
		throw error;
	}
}

export async function preparePluginExport(mindMap: MindMap): Promise<void> {
	const ids = await preparePluginContents(mindMap);
	const nodes = Array.from(ids, id => findRenderNodeByUid(mindMap, id)).filter(node => node !== null);
	if (nodes.length) {
		refreshNodesCustomContent(mindMap, nodes);
		await renderWithCallback(mindMap);
	}
}
