/** 引擎纯文本 contenteditable 的薄适配；文本节点 + BR 的 UTF-16 口径与引擎 getEditText 一致。 */
import type { EditorInputContext, EditorInputSurface, EditorTextRange } from '../../core/editor-input';
import { insertNativeEditorText, notifyEditorInput } from './native-input';

function textOf(node: Node): string {
	if (node.nodeType === 3) return node.textContent ?? '';
	if (node.nodeType === 1 && (node as Element).tagName === 'BR') return '\n';
	return Array.from(node.childNodes, textOf).join('');
}

export class ContenteditableInput implements EditorInputSurface {
	constructor(readonly element: HTMLElement, private readonly sourcePath: () => string) {}
	get text(): string { return textOf(this.element); }
	context(): EditorInputContext {
		const selection = this.element.ownerDocument.getSelection();
		const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
		const offset = (node: Node, position: number): number => {
			const prefix = this.element.ownerDocument.createRange();
			prefix.selectNodeContents(this.element); prefix.setEnd(node, position);
			return textOf(prefix.cloneContents()).length;
		};
		const inside = range && this.element.contains(range.startContainer) && this.element.contains(range.endContainer);
		return { text: this.text, sourcePath: this.sourcePath(), selection: inside
			? { from: offset(range.startContainer, range.startOffset), to: offset(range.endContainer, range.endOffset) }
			: { from: -1, to: -1 } };
	}
	/** BR 占一位文本偏移，但 DOM 选区落在其父节点边界。 */
	private pointAt(offset: number): { node: Node; offset: number } {
		const walker = this.element.ownerDocument.createTreeWalker(this.element, 5 /* SHOW_ELEMENT | SHOW_TEXT */);
		let node: Node | null;
		while ((node = walker.nextNode())) {
			if (node.nodeType === 3) {
				const length = node.textContent?.length ?? 0;
				if (offset <= length) return { node, offset };
				offset -= length;
			} else if ((node as Element).tagName === 'BR') {
				const parent = node.parentNode;
				if (offset === 0 && parent) return { node: parent, offset: Array.from(parent.childNodes).indexOf(node as ChildNode) };
				offset--;
			}
		}
		return { node: this.element, offset: this.element.childNodes.length };
	}
	replace(range: EditorTextRange, text: string): void {
		const doc = this.element.ownerDocument; const selection = doc.getSelection();
		if (!selection) return;
		const start = this.pointAt(range.from); const end = this.pointAt(range.to);
		const domRange = doc.createRange();
		domRange.setStart(start.node, start.offset); domRange.setEnd(end.node, end.offset);
		this.element.focus(); selection.removeAllRanges(); selection.addRange(domRange);
		if (!insertNativeEditorText(this.element, text)) {
			domRange.deleteContents();
			const inserted = doc.createTextNode(text); domRange.insertNode(inserted);
			domRange.setStartAfter(inserted); domRange.collapse(true);
			selection.removeAllRanges(); selection.addRange(domRange); notifyEditorInput(this.element);
		}
	}
	focusAtEnd(): void {
		this.element.focus();
		const range = this.element.ownerDocument.createRange(); range.selectNodeContents(this.element); range.collapse(false);
		const selection = this.element.ownerDocument.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
	}
}
