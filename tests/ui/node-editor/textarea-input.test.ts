/** 输入边界直测：动态来源、UTF-16 范围、原生撤销通道与标准 API 回退；不触碰文件。 */
import { describe, expect, it, vi } from 'vitest';
import { TextareaInput } from '../../../src/ui/node-editor/textarea-input';

function setup(execCommand?: () => boolean) {
	const el = {
		value: '前😀[[旧]]后', selectionStart: 3, selectionEnd: 8, scrollTop: 40,
		focus: vi.fn(), dispatchEvent: vi.fn(),
		ownerDocument: { execCommand, defaultView: { Event } },
		setSelectionRange: vi.fn((from: number, to: number) => {
			el.selectionStart = from; el.selectionEnd = to;
		}),
		setRangeText: vi.fn((text: string, from: number, to: number) => {
			el.value = el.value.slice(0, from) + text + el.value.slice(to);
			el.selectionStart = el.selectionEnd = from + text.length;
		}),
	};
	let path = '目录/原名.mindmap.md';
	const input = new TextareaInput(el as unknown as HTMLTextAreaElement, () => path);
	return { el, input, rename: () => { path = '目录/新名.mindmap.md'; } };
}

describe('TextareaInput', () => {
	it('读取实时文本、UTF-16 选区和重命名后的来源，不缓存旧文件路径', () => {
		const h = setup();
		expect(h.input.context()).toEqual({ text: '前😀[[旧]]后', selection: { from: 3, to: 8 }, sourcePath: '目录/原名.mindmap.md' });
		h.rename(); h.el.value = '新内容'; h.el.selectionStart = h.el.selectionEnd = 3;
		expect(h.input.context()).toEqual({ text: '新内容', selection: { from: 3, to: 3 }, sourcePath: '目录/新名.mindmap.md' });
	});

	it('先选中替换范围再使用 Chromium 插入，不重复派发 input 或另做替换', () => {
		const execCommand = vi.fn(() => true);
		const h = setup(execCommand);
		h.input.replace({ from: 3, to: 8 }, '[[新]]');
		expect(h.el.setSelectionRange).toHaveBeenCalledWith(3, 8);
		expect(execCommand).toHaveBeenCalledWith('insertText', false, '[[新]]');
		expect(h.el.setRangeText).not.toHaveBeenCalled();
		expect(h.el.dispatchEvent).not.toHaveBeenCalled();
	});

	it.each([undefined, () => false, () => { throw new Error('不支持'); }])('原生插入不可用时只替换指定范围，光标落到末尾并通知一次输入', (execCommand) => {
		const h = setup(execCommand);
		h.input.replace({ from: 3, to: 8 }, '[[新目标]]');
		expect(h.el.value).toBe('前😀[[新目标]]后');
		expect(h.el.selectionStart).toBe(10);
		expect(h.el.selectionEnd).toBe(10);
		expect(h.el.dispatchEvent).toHaveBeenCalledTimes(1);
		expect(h.el.dispatchEvent.mock.calls[0]?.[0]).toMatchObject({ type: 'input', bubbles: true });
	});
});
