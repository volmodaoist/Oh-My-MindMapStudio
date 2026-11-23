/** 文件会话与引擎共用的快照预算策略；零宿主、零 DOM 依赖（K66）。 */
export const HISTORY_BUDGET_BYTES = 30 * 1024 * 1024;
export const HISTORY_SNAPSHOT_BYTES_PER_NODE = 384;
export const HISTORY_DEFAULT_MAX_COUNT = 500;
const HISTORY_MIN_COUNT = 30;

/** 大图保底 30 步；非地板区按整树快照预算反推，条数不超过默认 500。 */
export function resolveHistoryLimit(nodeCount: number): number {
	const perSnapshot = Math.max(1, nodeCount) * HISTORY_SNAPSHOT_BYTES_PER_NODE;
	const affordable = Math.floor(HISTORY_BUDGET_BYTES / perSnapshot);
	return Math.min(HISTORY_DEFAULT_MAX_COUNT, Math.max(HISTORY_MIN_COUNT, affordable));
}
