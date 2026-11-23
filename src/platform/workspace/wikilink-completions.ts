/** 双链候选：Obsidian 文件/别名/标题/块缓存及原生路径生成；不创建文件或写 Vault。 */
import { parseFrontMatterAliases, prepareFuzzySearch, stripHeadingForLink } from 'obsidian';
import type { App } from 'obsidian';
import { formatWikilink, parseWikilink } from '../../domain/links';
import type { WikilinkSuggestion } from '../../domain/links';
import { resolvePathToFile } from '../../links/links-resolve';

export function wikilinkCompletions(app: App, query: string, sourcePath: string, limit = 30): WikilinkSuggestion[] {
	const parts = parseWikilink(formatWikilink(query));
	const candidates: WikilinkSuggestion[] = [];
	let keyword = query;
	if (query.includes('#') && parts) {
		const file = resolvePathToFile(parts.target || sourcePath, app, sourcePath);
		if (!file) return [];
		const cache = app.metadataCache.getFileCache(file);
		const path = app.metadataCache.fileToLinktext(file, sourcePath, true);
		keyword = parts.block;
		if (keyword.startsWith('^')) {
			keyword = keyword.slice(1);
			for (const id of Object.keys(cache?.blocks ?? {})) candidates.push({ label: id, detail: file.path,
				linkpath: `${path}#^${id}`, icon: 'hash' });
		} else {
			for (const heading of cache?.headings ?? []) candidates.push({ label: heading.heading, detail: file.path,
				linkpath: `${path}#${stripHeadingForLink(heading.heading)}`, icon: 'heading' });
		}
	} else {
		for (const file of app.vault.getFiles()) {
			const path = app.metadataCache.fileToLinktext(file, sourcePath, true);
			const isNote = file.extension.toLowerCase() === 'md';
			candidates.push({ label: isNote ? file.basename : file.name, detail: file.path, linkpath: path, icon: isNote ? 'file-text' : 'file' });
			if (isNote) {
				for (const alias of parseFrontMatterAliases(app.metadataCache.getFileCache(file)?.frontmatter ?? null) ?? []) {
					if (alias !== file.basename) candidates.push({ label: alias, detail: file.path, linkpath: path, alias, icon: 'file-text' });
				}
			}
		}
	}
	const match = keyword ? prepareFuzzySearch(keyword) : null;
	return candidates.map(item => ({ item, score: match ? match(`${item.label} ${item.detail}`)?.score ?? null : 0 }))
		.filter((entry): entry is { item: WikilinkSuggestion; score: number } => entry.score !== null)
		.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
		.slice(0, limit).map(entry => entry.item);
}
