/** 公共 API：仅具名转出，无初始化副作用；模块内部使用内部文件。 */
export {
	renameReferencesInTree,
} from '@/src/markdown/links/links-rename';
export {
	planSplitLinks,
	splitAllLinksInTree,
	writeSplitPlanToData,
} from '@/src/markdown/links/links-split';
export type {
	SplitAllResult,
	SplitLinkPlan,
} from '@/src/markdown/links/links-split';
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
} from '@/src/markdown/outline/md-outline-lines';
export {
	UTF8_BOM,
	parseMdOutline,
	parseMdOutlineFragment,
	splitFrontmatter,
	tokenDisplay,
	tokenizeInline,
} from '@/src/markdown/outline/md-outline';
export type {
	InlineToken,
} from '@/src/markdown/outline/md-outline';
export {
	composeNodeContent,
	isPureLinkNode,
	renderHyperlink,
	serializeMdBody,
	serializeSubtreesToOutline,
} from '@/src/markdown/serialize/md-serialize';
export {
	FencedBlockConflictError,
	fencedNodeBlocks,
	normalizeBlockSource,
	replaceFencedNodeBlock,
} from '@/src/markdown/syntax/md-codeblocks';
export {
	FOOTNOTE_ID_SOURCE,
	collectFootnoteDefinitions,
	splitFootnoteDefinitions,
} from '@/src/markdown/syntax/md-footnote';
export type {
	FootnoteDefinition,
} from '@/src/markdown/syntax/md-footnote';
export {
	currentDocumentSyntax,
	planDocumentSyntax,
} from '@/src/markdown/syntax/md-heading-format';
export {
	adaptSubtreesToGroup,
	normalizeSiblingSyntax,
} from '@/src/markdown/syntax/md-heading-normalize';
export {
	liveNodeTree,
	seedHeadingStart,
} from '@/src/markdown/syntax/md-heading-syntax';
export type {
	DocumentSyntax,
} from '@/src/markdown/syntax/md-heading-syntax';
export {
	applyRawToNode,
} from '@/src/markdown/syntax/md-line-write';
