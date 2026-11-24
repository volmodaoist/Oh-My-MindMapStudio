/**
 * 节点级布局：左右方向（`side`）与折叠（`fold`）。
 *
 * 语法复用独立指令行（`domain/relations/directive`）：
 *
 * ```markdown
 * ## 前端
 * %%side:left%%
 * ## 后端
 * %%side:right,fold:1%%
 * ```
 *
 * - `side`：`left` / `right` / `auto`。`auto` = **不固定方向**，由布局自行决定
 *   （思维导图布局默认让首层分支左右交替）；写侧不写 `auto`，选中「自动」即删除
 *   该属性。只有首层分支（根的直接子节点）有语义，后代继承父分支方向。
 * - `fold`：`0` / `1`。`1` = 折叠；写侧只写折叠态，展开即删除该属性。
 * - 合并写法 `%%side:left,fold:1%%` 允许出现在 `side` 的 value 里；两种指令也可
 *   各占一行。
 *
 * 本模块只做**纯语义**：值解析、指令段读取、节点 data 字段投影。指令行语法、
 * 引擎渲染与文件写回分别由各自收口点负责。
 */

/** 分支生长方向；`auto` 表示交给布局自行决定 */
export type BranchSide = 'left' | 'right' | 'auto';

/** 一个节点的布局状态（缺省即自动 + 展开） */
export interface NodeLayout {
	side: BranchSide;
	fold: boolean;
}

/** 结构化的指令段（避免 domain/document 依赖 relations 的语法模块） */
export interface LayoutDirectiveSegment {
	readonly key: string;
	readonly value: string;
}

const SIDE_VALUES: ReadonlySet<string> = new Set(['left', 'right', 'auto']);

/** `fold` 属性（出现在 `side` 的 value 里或独立 `fold` 指令） */
const FOLD_ATTRIBUTE = /^fold\s*:\s*([01])$/i;

/**
 * 解析 `side` 的 value：`left` / `right` / `auto`，可追加 `,fold:0|1`。
 *
 * @returns 合法时返回方向（以及可选的折叠值）；非法返回 null（调用方丢弃该段，
 *   但整行仍是合法指令行——与关系/概要保持同一 fail-closed 口径）。
 */
export function parseSideValue(
	value: string,
): { side: BranchSide; fold?: boolean } | null {
	const parts = value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	const [first, ...rest] = parts;
	if (first === undefined) {
		return null;
	}
	const side = first.toLowerCase();
	if (!SIDE_VALUES.has(side)) {
		return null;
	}
	let fold: boolean | undefined;
	for (const part of rest) {
		const match = FOLD_ATTRIBUTE.exec(part);
		if (!match) {
			return null;
		}
		fold = match[1] === '1';
	}
	return { side: side as BranchSide, fold };
}

/** 解析独立 `fold` 指令：只接受 `0` / `1` */
export function parseFoldValue(value: string): boolean | null {
	const normalized = value.trim();
	if (normalized === '1') {
		return true;
	}
	if (normalized === '0') {
		return false;
	}
	return null;
}

/** 读取节点 data 上已投影的布局（解析 / 原文写回后由 `applyNodeLayoutFields` 写入） */
export function readNodeLayout(data: Record<string, unknown>): NodeLayout {
	const side = data.mdSide;
	return {
		side: side === 'left' || side === 'right' ? side : 'auto',
		fold: data.mdFold === true,
	};
}

/**
 * 把布局写进节点 data。
 *
 * - `mdSide` / `mdFold`：解析结果（供菜单勾选态与再次写回）；
 * - `dir` / `expand`：引擎投影。`auto` 删除 `dir`（让布局自行交替），展开删除
 *   `mdFold` 并恢复 `expand: true`。
 */
export function applyNodeLayoutFields(
	data: Record<string, unknown>,
	layout: NodeLayout,
): void {
	if (layout.side === 'auto') {
		delete data.mdSide;
		delete data.dir;
	} else {
		data.mdSide = layout.side;
		data.dir = layout.side;
	}
	if (layout.fold) {
		data.mdFold = true;
		data.expand = false;
	} else {
		delete data.mdFold;
		data.expand = true;
	}
}

/**
 * 从指令段读取布局；没有任何 `side` / `fold` 段时返回 null（= 使用缺省布局）。
 *
 * 非法值按段丢弃；同一 key 出现多次时**后者生效**（与「最后一次写入」直觉一致）。
 */
export function readLayoutDirectives(
	segments: readonly LayoutDirectiveSegment[],
): NodeLayout | null {
	let side: BranchSide = 'auto';
	let fold = false;
	let found = false;
	for (const segment of segments) {
		if (segment.key === 'side') {
			const parsed = parseSideValue(segment.value);
			if (!parsed) {
				continue;
			}
			side = parsed.side;
			if (parsed.fold !== undefined) {
				fold = parsed.fold;
			}
			found = true;
		} else if (segment.key === 'fold') {
			const parsed = parseFoldValue(segment.value);
			if (parsed === null) {
				continue;
			}
			fold = parsed;
			found = true;
		}
	}
	return found ? { side, fold } : null;
}

/**
 * 支持节点级方向的布局（引擎读取 `data.dir` 的三种）。
 *
 * 逻辑结构图 / 组织结构图 / 目录组织图不读 `dir`：在这些布局下不提供方向入口，
 * 已写进文件的 `%%side%%` 原样保留，切回支持方向的布局时重新生效。
 */
const SIDE_LAYOUTS: ReadonlySet<string> = new Set([
	'mindMap',
	'timeline',
	'fishbone',
]);

/** 当前布局是否支持节点级方向 */
export function supportsBranchSide(layoutId: string): boolean {
	return SIDE_LAYOUTS.has(layoutId);
}
