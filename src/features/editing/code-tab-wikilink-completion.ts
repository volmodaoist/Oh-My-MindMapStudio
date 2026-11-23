/** 向 CodeTab 的公开补全注册 Markdown 双链规则；只清理自己的注册，不改变片段保存上下文。 */
import { FileView } from 'obsidian';
import type { App } from 'obsidian';
import { VIEW_TYPE } from '@/src/core/constants';
import { formatWikilink, wikilinkTriggerAt } from '@/src/domain/links';
import { getCodeTabApi } from '@/src/platform/rendering/plugins/code-tab';
import type { CodeTabApi, CompletionItem, CompletionRule } from '@/src/platform/rendering/plugins/code-tab-api';
import { wikilinkCompletions } from '@/src/platform/workspace/wikilink-completions';

export class CodeTabWikilinkCompletion {
	private api: CodeTabApi | null = null;
	private remove: (() => void) | null = null;
	private readonly documents = new Set<Document>();
	constructor(private readonly app: App) {}
	register(doc: Document): void {
		this.documents.add(doc);
		const api = getCodeTabApi(doc);
		if (!api || api === this.api || typeof api.completion?.registerRule !== 'function') return;
		this.releaseRule();
		const rule: CompletionRule = {
			id: 'mindmap-studio:wikilinks', languages: ['markdown'],
			complete: (context): CompletionItem[] => {
				const view = this.activeMapEditor();
				if (!view) return [];
				const trigger = wikilinkTriggerAt(context.text, context.offset);
				if (!trigger) return [];
				return wikilinkCompletions(this.app, trigger.query, view.file?.path ?? '').map(item => ({
					label: item.label, detail: item.detail, insertText: formatWikilink(item.linkpath, item.alias), from: trigger.from, to: trigger.to,
				}));
			},
		};
		this.remove = api.completion.list().some(entry => entry.id === rule.id)
			? api.completion.replaceRule(rule) : api.completion.registerRule(rule);
		this.api = api;
	}
	/** 用实际输入控件的归属读取文件；不把最近活动笔记猜作片段来源。 */
	private activeMapEditor(): FileView | null {
		for (const doc of this.documents) {
			if (!doc.hasFocus()) continue;
			const active = doc.activeElement;
			if (!active?.closest('.mindmap-plugin-live.code-tab')) continue;
			for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
				const view = leaf.view;
				if (view instanceof FileView && view.containerEl.contains(active)) return view;
			}
		}
		return null;
	}
	private releaseRule(): void {
		try { this.remove?.(); } catch { /* 已停用的提供者已释放规则 */ }
		this.remove = null; this.api = null;
	}
	unregister(doc: Document): void { this.documents.delete(doc); }
	dispose(): void { this.releaseRule(); this.documents.clear(); }
}
