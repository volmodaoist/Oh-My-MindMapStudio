/** side/fold 指令的 Markdown 往返与原文写回。 */
import { describe, expect, it } from 'vitest';
import { applyRawToNode, parseMdOutline, serializeMdBody } from '@/src/markdown';

const SOURCE = [
	'# 前端',
	'%%side:left%%',
	'## React',
	'%%side:right,fold:1%%',
	'### Hooks',
	'# 后端',
	'%%fold:1%%',
	'## 服务',
	'',
].join('\n');

describe('side/fold 解析', () => {
	it('投影到 md 字段与引擎的 dir/expand', () => {
		const tree = parseMdOutline(SOURCE, '导图').tree;
		const front = tree.children[0]!;
		const react = front.children[0]!;
		const back = tree.children[1]!;

		expect(front.data).toMatchObject({ mdSide: 'left', dir: 'left' });
		expect(front.data.mdFold).toBeUndefined();
		expect(react.data).toMatchObject({
			mdSide: 'right',
			dir: 'right',
			mdFold: true,
			expand: false,
		});
		expect(react.children[0]!.data.mdFold).toBeUndefined();
		expect(back.data.mdSide).toBeUndefined();
		expect(back.data).toMatchObject({ mdFold: true, expand: false });
	});

	it('未编辑时逐字保留指令，重开布局一致', () => {
		const tree = parseMdOutline(SOURCE, '导图').tree;
		const written = serializeMdBody(tree);
		expect(written).toContain('%%side:left%%');
		expect(written).toContain('%%side:right,fold:1%%');
		expect(written).toContain('%%fold:1%%');
		// 再解析再序列化必须稳定（指令行不被当成正文或丢弃）
		expect(serializeMdBody(parseMdOutline(written, '导图').tree)).toBe(written);
	});
});

describe('原文写回', () => {
	it('改文本时保留布局指令', () => {
		const data = parseMdOutline(SOURCE, '导图').tree.children[0]!.data;
		applyRawToNode(data, '前端改\n%%side:left%%');
		expect(data.text).toBe('前端改');
		expect(data).toMatchObject({ mdSide: 'left', dir: 'left' });
	});

	it('删除指令后清除方向与折叠投影', () => {
		const data = parseMdOutline(SOURCE, '导图').tree.children[0]!.data;
		applyRawToNode(data, '前端改\n%%side:left,fold:1%%');
		expect(data).toMatchObject({ mdSide: 'left', mdFold: true, expand: false });

		applyRawToNode(data, '前端改');
		expect(data).not.toHaveProperty('mdSide');
		expect(data).not.toHaveProperty('dir');
		expect(data).not.toHaveProperty('mdFold');
		expect(data.expand).toBe(true);
	});

	it('非法值保留指令行但不产生布局语义', () => {
		const data = parseMdOutline('# 甲\n%%side:center%%\n', '导图').tree.children[0]!
			.data;
		expect(data.mdSide).toBeUndefined();
		expect(data.dir).toBeUndefined();
		expect(data.mdDirectiveTail).toBe('%%side:center%%');
	});
});
