/** 领域能力公共入口；仅具名转出，无初始化副作用。 */
export {
	CALLOUT_CSS_VARS,
	calloutVisualOf,
	isCalloutHeaderLine,
	parseCalloutHeader,
	stripQuotePrefix,
} from './callout';
export type {
	CalloutHeader,
	CalloutVisual,
} from './callout';
export {
	parseTaskPrefix,
	setTaskTokenInRaw,
	stripTaskPrefix,
	toggleTaskToken,
	withTaskPrefix,
} from './md-task';
export type {
	TaskState,
} from './md-task';
export {
	matchPipeTable,
} from './pipe-table';
export type {
	PipeTable,
	PipeTableAlign,
} from './pipe-table';
