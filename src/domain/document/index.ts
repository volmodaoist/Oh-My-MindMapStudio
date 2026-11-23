/** 文档模型与源码绑定公共入口；无初始化与引擎依赖。 */
export type { MarkdownDocument, MarkdownNode, MarkdownNodeData, MarkdownSource } from './model';
export type { MdNodeMeta, MdTokenSegment } from './node-meta';
export { isNodeTextEdited, nodeContinuationIndents, nodeInlineSource } from './source';
export {
	MINDMAP_FILE_SUFFIX,
	isDedicatedMindMapPath,
	mindMapFileName,
	mindMapFileTitle,
} from './mindmap-file';
export {
	buildMindMapFrontmatter,
	isMindMapEnabled,
	layoutIdOfPropertyValue,
	normalizeLayoutId,
	readMindMapLayout,
	setMindMapLayout,
} from './mindmap-property';
export type {
	MindMapLayoutId,
} from './mindmap-property';
export {
	cloneTree,
	walkTree,
} from './tree';
