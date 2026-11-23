/** 源码读取与已编辑判定；展示、写回与指令共享这一份规则。 */
/**
 * 「节点文本自解析后是否被编辑过」——回写侧与渲染侧的**唯一判据**。
 *
 * 解析期 `text === mdDerivedText`（两者同取 derived）；用户编辑只改 `text`，
 * `mdDerivedText` 保留解析期快照（见 md-outline 的字段说明）。
 *
 * **快照缺失**（从未从 Markdown 解析过的新建节点）一律按「未编辑」：没有基准
 * 就无法判定，保守按未编辑——回写走逐字回写（保住原文）、渲染取 mdRaw、自动
 * 拆分不动手。`mdRaw` 与快照**恒同源写入**（md-outline / links-split /
 * links-rename / md-line-write 四处都是成对写），故「有 mdRaw 而无快照」的
 * 状态解析侧产生不出来，两侧口径在真实数据上等价。
 *
 * 为什么收口（2026-10-15）：同一比较此前在 md-serialize（rawOk）、links-rename、
 * view-split-links、wiki-display、node-inline-content 各写一遍，其中三处还各自
 * 处理「快照缺失」的边界——口径迟早分叉。
 *
 * @param text 节点当前文本（data.text）
 * @param mdDerivedText 解析期快照（data.mdDerivedText）
 */
export function isNodeTextEdited(text: unknown, mdDerivedText: unknown): boolean {
	return typeof mdDerivedText === 'string' && text !== mdDerivedText;
}

/**
 * 节点的**行内原文来源**：未编辑 → `mdRaw`（逐字原文，含 `%%注释%%` / 链接语法）；
 * 已编辑 → `data.text` + 关系指令行（`mdRaw` 是解析期快照，编辑后过期）。
 *
 * 唯一实现（2026-10-27 收口）：自绘接管判定（`node-inline-content.resolveSelfDrawSource`）、
 * 节点配色指令（`engine/mindmap-colors`）与关系指令（`domain/relations/relation`）必须读同一份
 * 原文，否则「节点显示里有注释、样式/关系却按旧行解析」这类漂移无从发现。`mdRaw`
 * 缺失时同样回落 `text`（新建节点没有原文快照）。
 *
 * **已编辑时补回 `mdDirectiveTail`**（2026-10-30）：关系指令被剥出 `text` 存在该字段
 * 里，不补回来的话「引擎内联编辑一次文本 → 关系全部消失」。
 */
export function nodeInlineSource(data: Record<string, unknown>): string {
	const text = typeof data.text === 'string' ? data.text : '';
	if (!isNodeTextEdited(data.text, data.mdDerivedText)) {
		const raw = data.mdRaw;
		if (typeof raw === 'string' && raw) {
			return raw;
		}
	}
	const tail =
		typeof data.mdDirectiveTail === 'string' ? data.mdDirectiveTail.trim() : '';
	return tail ? `${text}\n${tail}` : text;
}

/**
 * 节点的**续行相对缩进表**（`mdRaw` 逐行对应）；不可用时返回 `undefined`。
 *
 * 与 `nodeInlineSource` 同一「是否已编辑」判据：`text` 被改过后 `mdRaw` 的快照
 * 与当前行不再对应，缩进表随之作废（返回 undefined ⇒ 读侧按行首空白现算）。
 * 新建 / 粘贴节点没有该字段，同样返回 undefined（fail-open：按原文判断）。
 */
export function nodeContinuationIndents(
	data: Record<string, unknown>,
): readonly number[] | undefined {
	if (isNodeTextEdited(data.text, data.mdDerivedText)) {
		return undefined;
	}
	const value = data.mdContinuationIndents;
	return Array.isArray(value) ? (value as number[]) : undefined;
}
