/** textarea 的输入适配：保留原生文本、选区和撤销；替换完成只派发 input，不保存。 */
import type { EditorInputContext, EditorInputSurface, EditorTextRange } from '@/src/core/editor-input';
import { insertNativeEditorText, notifyEditorInput } from './native-input';

export class TextareaInput implements EditorInputSurface {
	constructor(readonly element: HTMLTextAreaElement, private readonly sourcePath: () => string = () => '') {}
	get text(): string { return this.element.value; }
	context(): EditorInputContext {
		return { text: this.text, selection: { from: this.element.selectionStart, to: this.element.selectionEnd }, sourcePath: this.sourcePath() };
	}
	focusAtEnd(): void {
		this.element.focus(); this.element.setSelectionRange(this.text.length, this.text.length); this.element.scrollTop = 0;
	}
	replace(range: EditorTextRange, text: string): void {
		const input = this.element;
		input.focus(); input.setSelectionRange(range.from, range.to);
		// Chromium 原生插入保留撤销记录；浏览器/宿主不支持时使用标准 textarea 范围 API。
		if (!insertNativeEditorText(input, text)) {
			input.setRangeText(text, range.from, range.to, 'end');
			notifyEditorInput(input);
		}
	}
}
