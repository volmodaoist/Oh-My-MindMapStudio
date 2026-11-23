/** 统一发布说明的版本边界、缺失拒绝与真实 CLI 契约。 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractReleaseNotes } from '@/scripts/release-notes.mjs';

const ROOT = new URL('../..', import.meta.url);
const CHANGELOG = readFileSync(new URL('CHANGELOG', ROOT), 'utf8');

describe('CHANGELOG 版本提取', () => {
	it('仅提取目标版本，保留快照标题和小标题，排除未发布与邻接版本', () => {
		const source = '## 未发布\n- 草稿\n\n## 0.3.3 · base → feat\n- 修复\n### 说明\n正文\n\n## 0.3.2\n- 旧版\n';
		expect(extractReleaseNotes(source, '0.3.3')).toBe('## 0.3.3 · base → feat\n- 修复\n### 说明\n正文\n');
	});

	it('代码示例中的版本标题不是发布边界，支持嵌套围栏与 CRLF', () => {
		const source = ['## 0.3.3', '- 内容', '````markdown', '## 0.3.3', '```js', '## 0.3.2', '```', '````', '## 0.3.2', '- 旧版'].join('\r\n');
		expect(extractReleaseNotes(source, '0.3.3')).toBe(source.split('\r\n').slice(0, 8).join('\n') + '\n');
	});

	it.each(['v0.3.3', '0.3', '', '0.3.3\n'])('拒绝非法版本 %j', version => {
		expect(() => extractReleaseNotes(CHANGELOG, version)).toThrow('版本必须');
	});

	it('缺失、重复和空版本说明均拒绝，不误认版本前缀', () => {
		expect(() => extractReleaseNotes('## 0.3.30\n- 内容', '0.3.3')).toThrow('缺少');
		expect(() => extractReleaseNotes('## 0.3.3\n- 甲\n## 0.3.3\n- 乙', '0.3.3')).toThrow('重复');
		expect(() => extractReleaseNotes('## 0.3.3\n\n## 未发布\n- 草稿', '0.3.3')).toThrow('没有发布内容');
	});

	it('覆盖 versions.json 中全部版本，快照链接使用完整提交并连续衔接', () => {
		const versions = JSON.parse(readFileSync(new URL('versions.json', ROOT), 'utf8')) as Record<string, string>;
		let previous: string | undefined;
		for (const version of Object.keys(versions)) {
			const notes = extractReleaseNotes(CHANGELOG, version);
			const snapshots = [...(notes.split('\n')[0] ?? '').matchAll(/https:\/\/github\.com\/volmodaoist\/Obsidian-Mindmap-Studio\/tree\/([a-f0-9]{40})/g)].map(match => match[1]);
			expect(snapshots.length).toBe(previous ? 2 : 1);
			if (previous) expect(snapshots[0]).toBe(previous);
			previous = snapshots[snapshots.length - 1];
		}
	});

	it('真实 CLI 从其它目录运行，输出版本文件可直接交给发布流程', () => {
		const dir = mkdtempSync(join(tmpdir(), 'mindmap-release-notes-'));
		try {
			const output = join(dir, 'release.md');
			const result = spawnSync(process.execPath, [fileURLToPath(new URL('scripts/release-notes.mjs', ROOT)), '0.3.3', output], { cwd: dir, encoding: 'utf8' });
			expect(result.status, result.stderr).toBe(0);
			expect(readFileSync(output, 'utf8')).toBe(extractReleaseNotes(CHANGELOG, '0.3.3'));
			const missing = spawnSync(process.execPath, [fileURLToPath(new URL('scripts/release-notes.mjs', ROOT)), '9.9.9'], { cwd: dir, encoding: 'utf8' });
			expect(missing.status).toBe(1);
			expect(missing.stdout).toBe('');
		} finally { rmSync(dir, { recursive: true, force: true }); }
	});

	it('发布 workflow 从 CHANGELOG 提取正文并使用同一临时文件', () => {
		const workflow = readFileSync(new URL('.github/workflows/release.yml', ROOT), 'utf8');
		expect(workflow).toContain('node scripts/release-notes.mjs "$tag" "$RUNNER_TEMP/mindmap-release-notes.md"');
		expect(workflow).toContain('notes_file="$RUNNER_TEMP/mindmap-release-notes.md"');
		expect(workflow).not.toContain('docs/release-notes-');
	});
});
