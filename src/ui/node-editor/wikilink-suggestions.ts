/** 双链候选的轻量视图：沿用宿主建议样式/图标，不读取 Vault 或编辑业务。 */
import { setIcon } from 'obsidian';
import { EventBinder, elementFromTarget } from '../../core/event-binder';
import type { WikilinkSuggestion } from '../../domain/links';

function renderWikilinkSuggestion(item: WikilinkSuggestion, element: HTMLElement): void {
	setIcon(element.createSpan({ cls: 'suggestion-flair' }), item.icon);
	element.createDiv({ cls: 'suggestion-title', text: item.label });
	element.createDiv({ cls: 'suggestion-note', text: item.detail });
}

export class WikilinkSuggestions {
	private readonly root: HTMLDivElement;
	private readonly content: HTMLDivElement;
	private readonly events = new EventBinder();
	private items: readonly WikilinkSuggestion[] = [];
	private selected = 0;

	constructor(private readonly doc: Document, private readonly choose: (item: WikilinkSuggestion) => void) {
		this.root = doc.body.createDiv({ cls: 'suggestion-container mindmap-wikilink-suggestions' });
		Object.assign(this.root.style, { position: 'fixed', zIndex: '3100', display: 'none', minWidth: '220px', maxWidth: '420px' });
		this.content = this.root.createDiv({ cls: 'suggestion-content', attr: { role: 'listbox' } });
		this.events.onDom(this.root, 'mousedown', event => { event.preventDefault(); event.stopPropagation(); });
		this.events.onDom(this.content, 'click', event => {
			const row = elementFromTarget(event.target)?.closest<HTMLElement>('[data-suggestion-index]');
			const item = row ? this.items[Number(row.dataset.suggestionIndex)] : undefined;
			if (item) { event.stopPropagation(); this.choose(item); }
		});
		this.events.onDom(this.content, 'mousemove', event => {
			const row = elementFromTarget(event.target)?.closest<HTMLElement>('[data-suggestion-index]');
			if (row) { this.selected = Number(row.dataset.suggestionIndex); this.highlight(); }
		});
	}

	get open(): boolean { return this.items.length > 0; }
	contains(target: Node): boolean { return this.root.contains(target); }

	show(items: readonly WikilinkSuggestion[], anchor: DOMRectReadOnly): void {
		this.items = items; this.selected = 0; this.content.replaceChildren();
		if (!items.length) { this.close(); return; }
		items.forEach((item, index) => {
			const row = this.content.createDiv({ cls: 'suggestion-item', attr: { role: 'option' } });
			row.dataset.suggestionIndex = String(index);
			renderWikilinkSuggestion(item, row);
		});
		this.root.show();
		const win = this.doc.defaultView;
		const height = Math.min(240, Math.max(80, (win?.innerHeight ?? 600) - anchor.bottom - 12));
		Object.assign(this.content.style, { maxHeight: `${height}px`, overflowY: 'auto' });
		const top = anchor.bottom + this.root.offsetHeight + 6 <= (win?.innerHeight ?? 600) ? anchor.bottom + 4 : Math.max(4, anchor.top - this.root.offsetHeight - 4);
		this.root.style.top = `${top}px`;
		this.root.style.left = `${Math.max(4, Math.min(anchor.left, (win?.innerWidth ?? 1000) - this.root.offsetWidth - 4))}px`;
		this.highlight();
	}

	private highlight(): void {
		for (const [index, row] of Array.from(this.content.children).entries()) {
			row.classList.toggle('is-selected', index === this.selected);
			row.setAttribute('aria-selected', String(index === this.selected));
		}
		(this.content.children[this.selected] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
	}

	handleKey(event: KeyboardEvent): boolean {
		if (!this.open || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return false;
		if (event.shiftKey && event.key === 'Enter') return false;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			this.selected = (this.selected + (event.key === 'ArrowDown' ? 1 : -1) + this.items.length) % this.items.length;
			this.highlight();
		} else if (event.key === 'Enter' || event.key === 'Tab') {
			const item = this.items[this.selected]; if (item) this.choose(item);
		} else if (event.key === 'Escape') this.close();
		else return false;
		event.preventDefault(); event.stopPropagation(); return true;
	}

	close(): void { this.items = []; this.root.hide(); }
	dispose(): void { this.close(); this.events.destroy(); this.root.remove(); }
}
