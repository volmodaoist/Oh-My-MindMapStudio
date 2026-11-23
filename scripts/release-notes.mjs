/** 通过唯一 CHANGELOG 提取版本说明；发布前可直接运行，没有 npm 依赖。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {string} changelog
 * @param {string} version
 * @returns {string} 带版本标题和源码快照链接的 Markdown。
 */
export function extractReleaseNotes(changelog, version) {
	if (!/^\d+\.\d+\.\d+$/.test(version) || version.trim() !== version) throw new Error('版本必须为 x.y.z');
	const lines = changelog.split(/\r?\n/);
	/** @type {{ index: number, version: string | null }[]} */
	const headings = [];
	/** @type {{ char: string, length: number } | null} */
	let fence = null;
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? '';
		const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (marker) {
			if (!fence) fence = { char: marker[0] ?? '', length: marker.length };
			else if (marker[0] === fence.char && marker.length >= fence.length && /^\s*$/.test(line.trim().slice(marker.length))) fence = null;
			continue;
		}
		if (!fence && /^##\s+\S/.test(line)) {
			headings.push({ index, version: /^##\s+(\d+\.\d+\.\d+)(?:\s|$)/.exec(line)?.[1] ?? null });
		}
	}
	const matches = headings.filter(heading => heading.version === version);
	if (matches.length > 1) throw new Error(`CHANGELOG 中版本 ${version} 重复`);
	const heading = matches[0];
	if (!heading) throw new Error(`CHANGELOG 缺少版本 ${version}`);
	const end = headings.find(item => item.index > heading.index)?.index ?? lines.length;
	if (!lines.slice(heading.index + 1, end).join('\n').trim()) throw new Error(`CHANGELOG 中版本 ${version} 没有发布内容`);
	return lines.slice(heading.index, end).join('\n').trim() + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const root = dirname(dirname(fileURLToPath(import.meta.url)));
		const notes = extractReleaseNotes(readFileSync(join(root, 'CHANGELOG'), 'utf8'), process.argv[2] ?? '');
		if (process.argv[3]) writeFileSync(process.argv[3], notes);
		else process.stdout.write(notes);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
