/** 当前文档契约：源文件分段保真、结构语义与投影字段不越过写回边界。 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MarkdownDocument, MarkdownNode, MarkdownNodeData } from '../../src/domain/document';
import { parseMdOutline, serializeMdBody, splitFrontmatter } from '../../src/markdown';

describe('原始文件分段', () => {
	it.each([
		'',
		'\uFEFF# 标题\r\n',
		'# 标题  \n\n- 正文\n',
		'---\nMindmap: Mindmap\n---\n\n \n# 标题\n',
		'\uFEFF---\r\n说明: |\r\n  ---\r\nMindmap: Mindmap\r\n---\r\n\r\n \t\r\n# 标题  \r\n',
	])('解析不丢掉文件头、空白分隔或正文：%j', (raw) => {
		const document = parseMdOutline(raw, '文档');
		expect((document.frontmatter ?? '') + document.gap + document.body).toBe(raw);
		expect(splitFrontmatter(raw)).toEqual({
			frontmatter: document.frontmatter, gap: document.gap, body: document.body,
		});
	});
});

describe('文档树与持久化边界', () => {
	it('多个 H1 仍是虚拟根的子节点，序列化不写中心主题', () => {
		const document = parseMdOutline('# 甲\n## 子项\n# 乙\n', '文件名');
		expect(document.tree.data.text).toBe('文件名');
		expect(document.tree.children.map(node => node.data.text)).toEqual(['甲', '乙']);
		expect(document.tree.children[0]?.children[0]?.data.text).toBe('子项');
		expect(serializeMdBody(document.tree)).toBe('# 甲\n\n## 子项\n\n# 乙');
	});

	it('派生投影字段不落盘，四反引号的插件原文和未编辑行保持', () => {
		const raw = '# 标题  \n\n````tab\n# 标签内标题\n```shell\necho hi\n```\n````\n';
		const document = parseMdOutline(raw, '文件名');
		document.tree.data.renderOnly = { measuredWidth: 400 };
		for (const node of document.tree.children) node.data.renderOnly = { activeTab: 1 };
		const written = serializeMdBody(document.tree);
		expect(written).not.toContain('renderOnly');
		expect(written).toContain('# 标题  \n');
		expect(written).toContain('````tab\n# 标签内标题\n```shell\necho hi\n```\n````');
		expect(parseMdOutline(written, '文件名').tree.children).toHaveLength(document.tree.children.length);
	});

	it('树契约允许独立适配字段，不要求继承引擎类型', () => {
		interface Projection extends MarkdownNodeData { measuredWidth: number }
		const root: MarkdownNode<Projection> = { data: { text: '中心', measuredWidth: 40 }, children: [] };
		const document: MarkdownDocument<Projection> = { tree: root, frontmatter: null, gap: '', body: '' };
		expectTypeOf(document.tree.data.measuredWidth).toEqualTypeOf<number>();
		expect(serializeMdBody(document.tree)).toBe('');
	});
});
