/** 编辑输入的共同边界：文本、UTF-16 选区、动态来源路径与范围替换；不持有文件或保存管线。 */
export interface EditorTextRange {
	from: number;
	to: number;
}

export interface EditorInputContext {
	text: string;
	selection: EditorTextRange;
	sourcePath: string;
}

export interface EditorInputSurface {
	readonly element: HTMLElement;
	readonly text: string;
	context(): EditorInputContext;
	replace(range: EditorTextRange, text: string): void;
	focusAtEnd(): void;
}

/** 补全等输入扩展由编辑组件统一调度和销毁，不抢占提交或另建撤销时间线。 */
export interface EditorInputBehavior {
	/** 返回 true 时已处理按键（含 preventDefault），编辑器不再提交。 */
	onKeyDown?(event: KeyboardEvent): boolean;
	contains?(target: Node): boolean;
	dispose(): void;
}
