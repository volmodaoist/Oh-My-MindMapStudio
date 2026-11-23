/** 原生空节点接入同一补全行为；生命周期经引擎防腐面，不替换原编辑器或保存通道。 */
import { EventBinder } from '../../core/event-binder';
import type { MindMap } from '../../core/engine-types';
import { observeNodeTextEditor } from '../../engine';
import { ContenteditableInput } from '../../ui/node-editor/contenteditable-input';
import { NodeWikilinkCompletion } from './node-wikilink-completion';
import type { ViewNodeEditContext } from '../view/view-context';

export class NativeNodeWikilinkCompletion {
	private readonly events = new EventBinder();
	private unsubscribe: (() => void) | null = null;
	private behavior: NodeWikilinkCompletion | null = null;
	constructor(private readonly view: ViewNodeEditContext) {}
	attach(mindMap: MindMap): void {
		this.dispose();
		this.unsubscribe = observeNodeTextEditor(mindMap, element => {
			this.releaseInput();
			if (!element) return;
			const input = new ContenteditableInput(element, () => this.view.file?.path ?? '');
			const behavior = new NodeWikilinkCompletion(this.view.app, input);
			this.behavior = behavior;
			this.events.onDom(element, 'keydown', event => {
				if (behavior.onKeyDown(event)) event.stopImmediatePropagation();
			}, true);
			this.events.onDom(element.ownerDocument, 'mousedown', event => {
				if (event.target && behavior.contains(event.target as Node)) {
					event.preventDefault(); event.stopImmediatePropagation();
				}
			}, true);
		});
	}
	private releaseInput(): void {
		this.events.destroy(); this.behavior?.dispose(); this.behavior = null;
	}
	dispose(): void { this.unsubscribe?.(); this.unsubscribe = null; this.releaseInput(); }
}
