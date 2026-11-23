/** Chromium 原生插入保留编辑撤销；调用方负责选区和标准 DOM API 回退，不保存文件。 */
export function insertNativeEditorText(element: HTMLElement, text: string): boolean {
	try { return element.ownerDocument.execCommand('insertText', false, text); }
	catch { return false; }
}

export function notifyEditorInput(element: HTMLElement): void {
	const win = element.ownerDocument.defaultView;
	if (win) element.dispatchEvent(new win.Event('input', { bubbles: true }));
}
