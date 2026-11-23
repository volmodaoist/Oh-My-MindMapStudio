/** 公共 API：仅具名转出，无初始化副作用；模块内部使用内部文件。 */
export {
	renameReferencesInTree,
} from './links/links-rename';
export {
	planSplitLinks,
	splitAllLinksInTree,
	writeSplitPlanToData,
} from './links/links-split';
export type {
	SplitAllResult,
	SplitLinkPlan,
} from './links/links-split';
export {
	buildDefaultMindMapName,
	createDefaultMarkdownContent,
	ensureUniqueUids,
} from './markdown';
export {
	canAutoOpenMindMap,
	isExplicitMindMapOpen,
	isMindMapFile,
	openAsMarkdown,
	openAsMindMap,
	readDeclaredLayout,
	readMdBackMode,
	setViewSwitchDoneHook,
} from './md-open';
export {
	fenceMarker,
	isFenceCloseLine,
	isSelfClosedFenceLine,
} from './outline/md-outline-lines';
export {
	UTF8_BOM,
	parseMdOutline,
	parseMdOutlineFragment,
	splitFrontmatter,
	tokenDisplay,
	tokenizeInline,
} from './outline/md-outline';
export type {
	InlineToken,
} from './outline/md-outline';
export {
	composeNodeContent,
	isPureLinkNode,
	renderHyperlink,
	serializeMdBody,
	serializeSubtreesToOutline,
} from './serialize/md-serialize';
export {
	FencedBlockConflictError,
	fencedNodeBlocks,
	normalizeBlockSource,
	replaceFencedNodeBlock,
} from './syntax/md-codeblocks';
export {
	FOOTNOTE_ID_SOURCE,
	collectFootnoteDefinitions,
	splitFootnoteDefinitions,
} from './syntax/md-footnote';
export type {
	FootnoteDefinition,
} from './syntax/md-footnote';
export {
	currentDocumentSyntax,
	planDocumentSyntax,
} from './syntax/md-heading-format';
export {
	adaptSubtreesToGroup,
	normalizeSiblingSyntax,
} from './syntax/md-heading-normalize';
export {
	liveNodeTree,
	seedHeadingStart,
} from './syntax/md-heading-syntax';
export type {
	DocumentSyntax,
} from './syntax/md-heading-syntax';
export {
	applyRawToNode,
} from './syntax/md-line-write';
