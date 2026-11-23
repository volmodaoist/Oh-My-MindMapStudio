/** 公共 API：仅具名转出，无初始化副作用；模块内部使用内部文件。 */
export {
	exportMindMapImage,
} from './mindmap-export';
export {
	collectSelectedSubtrees,
	collectWholeTreeSubtrees,
	cutSelectedSubtrees,
	insertSubtreesAsChildren,
} from './nodes/mindmap-clipboard';
export {
	hideNodeForEditing,
	observeNodeTextEditor,
	readNodeEditorAppearance,
} from './nodes/mindmap-editor';
export {
	readHistoryAvailability,
	recordHistory,
	seedInitialHistory,
	syncHistoryLimit,
} from './nodes/mindmap-history';
export {
	applyImageSizeCorrectionsToEngine,
	branchLayerOf,
	collectRenderNodeData,
	countMindMapNodes,
	countTreeNodes,
	findNodeByDom,
	findNodesByContentProducts,
	findRenderNodeByUid,
	forceRemoveNodeData,
	getActiveNode,
	getActiveNodes,
	getNodeDataString,
	getNodeGroupEl,
	getRenderRoot,
	getRootText,
	isCustomNodeContent,
	isEditingText,
	isNodeCollapsed,
	isNodeImageElement,
	markNodeNeedLayout,
	moveNodeInSiblings,
	previewNodeImageSize,
	refreshNodeCustomContent,
	refreshNodesCustomContent,
	renderWithCallback,
	replaceMindMapData,
	resolveNodesByDoms,
	revealNodeByUid,
	setActiveNodes,
	setNodeImageSize,
	setNodeText,
	siblingMoveBlocker,
	startNodeTextEdit,
	topMostNodes,
} from './nodes/mindmap-nodes';
export type {
	SiblingMoveOutcome,
} from './nodes/mindmap-nodes';
export {
	activeRelationLine,
	applyRelationsToTree,
	clearActiveRelationLine,
	collectRelationIds,
	collectRelationTargets,
	engineRelationsOf,
	relationCanvasLayer,
	relationClientToContent,
	relationLineAt,
	relationNodeBox,
	syncLiveRelations,
} from './nodes/mindmap-relations';
export type {
	RelationLineHit,
} from './nodes/mindmap-relations';
export {
	endMindMapSearch,
	getSearchCurrentIndex,
	getSearchMatchCount,
	jumpToSearchIndex,
	searchMindMap,
	searchNextInMindMap,
} from './nodes/mindmap-search';
export {
	applySessionSnapshot,
} from './nodes/mindmap-snapshot';
export {
	applySummariesToTree,
	isSummaryNode,
	summaryAnchorOf,
	syncLiveSummaries,
} from './nodes/mindmap-summaries';
export {
	arrangeMindMap,
} from './runtime/mindmap-arrange';
export {
	ENGINE_COMMANDS,
	shortcutGateAllows,
} from './runtime/mindmap-commands';
export {
	cancelEngineTimers,
} from './runtime/mindmap-timers';
export {
	applyThemeConfig,
	clearMeasureResidue,
	createMindMap,
	destroyMindMap,
	resizeMindMap,
	syncNodeColorDirectives,
} from './runtime/mindmap';
export type {
	CreateMindMapOptions,
	NodeContentStyle,
} from './runtime/mindmap';
export {
	applyColorDirectivesToTree,
} from './theme/mindmap-colors';
export {
	paletteNodeColor,
} from './theme/mindmap-palette';
export {
	getThemeConfig,
	isDarkTheme,
	supportsLineStyleSwitch,
} from './theme/mindmap-theme';
export {
	captureMiniMap,
	measureMiniMapContent,
} from './viewport/mindmap-minimap';
export type {
	MiniMapFrame,
} from './viewport/mindmap-minimap';
export {
	getCanvasSize,
} from './viewport/mindmap-viewport-canvas';
export {
	applyCanvasDragMode,
	applyViewportState,
	centerContentAtFullScale,
	centerContentAtScale,
	contentExceedsCanvasAtFullScale,
	fitMindMap,
	getDrawTransform,
	getViewportSignature,
	isContentVisibleInCanvas,
	measureContentFitToWidth,
	measureNodesCanvasBox,
	panMindMap,
	readViewportState,
	resetZoom,
	viewStateSignature,
	zoomInMindMap,
	zoomMindMapAt,
	zoomOutMindMap,
} from './viewport/mindmap-viewport';
export { HISTORY_BUDGET_BYTES, HISTORY_SNAPSHOT_BYTES_PER_NODE, resolveHistoryLimit } from '../core/history-budget';
/** @public 浏览器回归探针通过生成的模块字符串调用。 */
export { applyPerformanceMode } from './runtime/mindmap';
