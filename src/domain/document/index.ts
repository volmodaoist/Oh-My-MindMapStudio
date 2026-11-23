/** 文档模型与源码绑定公共入口；无初始化与引擎依赖。 */
export type { MarkdownDocument, MarkdownNode, MarkdownNodeData, MarkdownSource } from './model';
export type { MdNodeMeta, MdTokenSegment } from './node-meta';
export { isNodeTextEdited, nodeContinuationIndents, nodeInlineSource } from './source';
