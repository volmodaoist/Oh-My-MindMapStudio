/** Markdown 文档契约；不依赖引擎、宿主或 DOM。 */
import type { MdNodeMeta } from './node-meta';

/** 源码绑定与节点身份；额外投影字段由所属适配层提供类型。 */
export interface MarkdownNodeData extends MdNodeMeta {
	text?: string;
	uid?: string;
	[key: string]: unknown;
}

/** 权威树的结构面；泛型允许适配层携带类型明确的派生字段。 */
export interface MarkdownNode<TData extends MarkdownNodeData = MarkdownNodeData> {
	data: TData;
	children: MarkdownNode<TData>[];
}

/** 原始文件分段；三段相接必须逐字还原输入，包括 BOM、CRLF 与头后空行。 */
export interface MarkdownSource {
	/** 文件头（含围栏和闭合行换行）；无 YAML 时可仅为 BOM，否则 null。 */
	frontmatter: string | null;
	/** 文件头与正文之间的空白行；没有文件头时为空。 */
	gap: string;
	/** 原始正文，不是序列化后的规范化结果。 */
	body: string;
}

/** 解析结果同时保留原始来源与可编辑树；树的根仍是文件名对应的虚拟根。 */
export interface MarkdownDocument<TData extends MarkdownNodeData = MarkdownNodeData>
	extends MarkdownSource {
	tree: MarkdownNode<TData>;
}
