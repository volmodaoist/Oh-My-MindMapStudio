/** 双链输入扩展：候选与显示分离，范围替换经共同输入接口，不保存文件。 */
import type { App } from 'obsidian';
import { EventBinder } from '../../core/event-binder';
import type { EditorInputBehavior, EditorInputSurface } from '../../core/editor-input';
import { formatWikilink, wikilinkTriggerAt } from '../../domain/links';
import type { WikilinkSuggestion } from '../../domain/links';
import { wikilinkCompletions } from '../../platform/workspace/wikilink-completions';
import { WikilinkSuggestions } from '../../ui/node-editor/wikilink-suggestions';

export class NodeWikilinkCompletion implements EditorInputBehavior {
	private readonly events = new EventBinder();
	private readonly popup: WikilinkSuggestions;
	private composing = false;

	constructor(private readonly app: App, private readonly input: EditorInputSurface) {
		const element = input.element;
		this.popup = new WikilinkSuggestions(element.ownerDocument, item => this.choose(item));
		this.events.onDom(element, 'input', () => this.update());
		this.events.onDom(element, 'click', () => this.update());
		this.events.onDom(element, 'keyup', event => {
			if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) this.update();
		});
		this.events.onDom(element, 'compositionstart', () => { this.composing = true; this.popup.close(); });
		this.events.onDom(element, 'compositionend', () => { this.composing = false; this.update(); });
		element.setAttribute('aria-autocomplete', 'list');
	}

	update(): void {
		if (this.composing) return;
		const context = this.input.context();
		const trigger = wikilinkTriggerAt(context.text, context.selection.from, context.selection.to);
		if (!trigger) { this.popup.close(); return; }
		this.popup.show(wikilinkCompletions(this.app, trigger.query, context.sourcePath), this.input.element.getBoundingClientRect());
	}

	private choose(item: WikilinkSuggestion): void {
		const context = this.input.context();
		const trigger = wikilinkTriggerAt(context.text, context.selection.from, context.selection.to);
		if (!trigger) { this.popup.close(); return; }
		this.input.replace(trigger, formatWikilink(item.linkpath, item.alias));
		this.popup.close();
	}

	onKeyDown(event: KeyboardEvent): boolean { return this.popup.handleKey(event); }
	contains(target: Node): boolean { return this.popup.contains(target); }
	dispose(): void { this.events.destroy(); this.popup.dispose(); this.input.element.removeAttribute('aria-autocomplete'); }
}
