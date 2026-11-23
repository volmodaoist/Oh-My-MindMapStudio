/** 领域能力公共入口；仅具名转出，无初始化副作用。 */
export {
	absolutePathFromFileUrl,
	encodedNameForm,
	fileUrlFromAbsolutePath,
	isAppResourceUrl,
	isExternalImageRef,
	isHttpUrl,
	isHyperlinkProtocolUrl,
	isRemoteOrDataUrl,
	isSafeAnchorHref,
	isSchemeUrl,
	isUrlLikeText,
	resourceUrlPathCandidates,
	tryDecodeUri,
	urlComparisonForms,
} from './url';
export {
	docWikiLinkDisplay,
	editedWikilinkAlias,
	effectiveDocWikiLink,
} from './wiki-display';
export type {
	WikiAliasSource,
} from './wiki-display';
export {
	formatEmbedWikilink,
	formatLinkPath,
	formatWikilink,
	isDocumentExtension,
	linkDisplayText,
	parseWikilink,
	wikilinkLinkpath,
	wikilinkTargetIsAttachment,
	wikilinkTriggerAt,
} from './wikilink';
export type {
	LinkPathFormat,
	WikilinkParts,
	WikilinkSuggestion,
} from './wikilink';
