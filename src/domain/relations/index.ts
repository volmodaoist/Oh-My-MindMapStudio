/** 领域能力公共入口；仅具名转出，无初始化副作用。 */
export {
	applyDirectiveBlock,
	isDirectiveLine,
	splitDirectiveSegments,
	splitDirectiveTail,
	stripTrailingSegments,
} from './directive';
export {
	commitAnchorSession,
	createAnchorSession,
	moveAnchorSession,
	previewOf,
} from './relation-anchor';
export {
	isRelationAnchorDir,
	isWritableRelationLabel,
	relationSegmentsOf,
	relationStateOf,
	resolveRelationGraph,
	sameRelationGeometry,
} from './relation';
export type {
	RelationAnchorDir,
	RelationGeometry,
	RelationPoint2D,
	RelationRect,
	RelationRef,
	RelationState,
} from './relation';
export {
	applySummaries,
	isWritableSummaryText,
	planSummaryRanges,
	summariesOf,
	summaryEntryIndexOfRange,
} from './summary';
export type {
	SummaryEntry,
	SummaryRange,
} from './summary';
