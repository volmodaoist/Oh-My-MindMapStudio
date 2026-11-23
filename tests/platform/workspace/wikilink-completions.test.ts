import { describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import { wikilinkCompletions } from '@/src/platform/workspace/wikilink-completions';

vi.mock('obsidian', async importOriginal => ({ ...await importOriginal<typeof import('obsidian')>(),
	parseFrontMatterAliases: (frontmatter: { aliases?: string[] } | null) => frontmatter?.aliases ?? [],
	prepareFuzzySearch: (query: string) => (text: string) => text.toLowerCase().includes(query.toLowerCase()) ? { score: 0 } : null,
	stripHeadingForLink: (heading: string) => heading.replace(/#/g, ''),
}));
vi.mock('@/src/links/links-resolve', () => ({ resolvePathToFile: vi.fn((_input: string, app: App) => app.vault.getFiles()[0]) }));

function fixture() {
	const file = Object.assign(new TFile(), { path: 'Topics/Target.md', basename: 'Target', name: 'Target.md', extension: 'md' });
	const cache = { frontmatter: { aliases: ['Operating Systems'] }, headings: [{ heading: 'Quick #Start' }], blocks: { 'block-one': {} } };
	const metadataCache = { getFileCache: vi.fn(() => cache), fileToLinktext: vi.fn(() => 'Topics/Target') };
	const app = { vault: { getFiles: () => [file] }, metadataCache } as unknown as App;
	return { app, metadataCache };
}
describe('wiki candidates from native metadata', () => {
	it('uses the native source-aware path and includes file aliases', () => {
		const { app, metadataCache } = fixture();
		expect(wikilinkCompletions(app, 'Operating', 'Notes/Map.md')).toEqual([{ label: 'Operating Systems', detail: 'Topics/Target.md', linkpath: 'Topics/Target', alias: 'Operating Systems', icon: 'file-text' }]);
		expect(metadataCache.fileToLinktext).toHaveBeenCalledWith(app.vault.getFiles()[0], 'Notes/Map.md', true);
	});
	it('matches file paths, bounds empty queries and leaves unknown queries empty', () => {
		const { app } = fixture(); expect(wikilinkCompletions(app, 'Topics', 'Map.md')).toHaveLength(2);
		expect(wikilinkCompletions(app, '', 'Map.md', 1)).toHaveLength(1);
		expect(wikilinkCompletions(app, 'missing', 'Map.md')).toEqual([]);
	});
	it('uses native heading normalization and block cache', () => {
		const { app } = fixture();
		expect(wikilinkCompletions(app, 'Target#Quick', 'Map.md')[0]?.linkpath).toBe('Topics/Target#Quick Start');
		expect(wikilinkCompletions(app, 'Target#^block', 'Map.md')[0]?.linkpath).toBe('Topics/Target#^block-one');
	});
});
