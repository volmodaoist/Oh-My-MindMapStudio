import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyBuiltPlugin, validateVault, DEFAULT_CONFIG_DIR } from '../../scripts/install.mjs';

const cleanup: string[] = [];
function fixture() {
	const base = mkdtempSync(join(tmpdir(), 'mindmap-install-test-')); cleanup.push(base);
	const root = join(base, 'plugin'); const vault = join(base, '云笔记 with spaces');
	mkdirSync(root); mkdirSync(join(vault, DEFAULT_CONFIG_DIR), { recursive: true });
	writeFileSync(join(root, 'main.js'), 'new plugin'); writeFileSync(join(root, 'styles.css'), 'new style');
	writeFileSync(join(root, 'manifest.json'), JSON.stringify({ id: 'mindmap-studio', name: 'Oh-My-Mindmap-Studio', version: '0.3.3' }));
	return { root, vault, base, destination: join(vault, DEFAULT_CONFIG_DIR, 'plugins/mindmap-studio') };
}
afterEach(() => { cleanup.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); vi.restoreAllMocks(); });

describe('local plugin installer', () => {
	it('accepts an initialized vault with spaces and Unicode', () => {
		expect(validateVault(fixture().vault)).toContain('云笔记 with spaces');
	});
	it('rejects empty, missing and uninitialized vaults before creating plugin files', () => {
		const { root, vault, base } = fixture();
		for (const value of [undefined, '', ' ', 42, join(base, 'missing'), root, join(root, 'main.js')]) {
			expect(() => validateVault(value)).toThrow();
		}
		expect(existsSync(join(vault, DEFAULT_CONFIG_DIR, 'plugins'))).toBe(false);
	});
	it('checks every artifact and the plugin ID before writing to the vault', () => {
		const { root, vault, destination } = fixture();
		rmSync(join(root, 'styles.css'));
		expect(() => copyBuiltPlugin(root, vault)).toThrow('Missing build artifact: styles.css');
		writeFileSync(join(root, 'styles.css'), 'style');
		writeFileSync(join(root, 'manifest.json'), JSON.stringify({ id: '../elsewhere' }));
		expect(() => copyBuiltPlugin(root, vault)).toThrow('Invalid plugin ID');
		expect(existsSync(destination)).toBe(false);
	});
	it('creates the plugin directory and verifies all three installed artifacts', () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const { root, vault, destination } = fixture(); const result = copyBuiltPlugin(root, vault); cleanup.push(result.backup);
		expect(result.destination).toBe(destination); expect(result.settingsUnchanged).toBe(true);
		for (const name of ['main.js', 'manifest.json', 'styles.css']) {
			expect(readFileSync(join(destination, name))).toEqual(readFileSync(join(root, name)));
		}
		expect(result.files).toHaveLength(3);
		expect(result.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256))).toBe(true);
		expect(existsSync(join(destination, 'data.json'))).toBe(false);
		const record = JSON.parse(readFileSync(join(result.backup, 'install.json'), 'utf8')) as { destination: string };
		expect(record.destination).toBe(destination);
	});
	it('backs up the previous plugin and preserves settings, enabled plugins, extra files and notes', () => {
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		const { root, vault, destination } = fixture(); mkdirSync(destination, { recursive: true });
		writeFileSync(join(destination, 'main.js'), 'old plugin'); writeFileSync(join(destination, 'styles.css'), 'old style');
		writeFileSync(join(destination, 'manifest.json'), '{"version":"old"}');
		const settings = ' { "language": "zh", "palette": "custom" }\r\n';
		writeFileSync(join(destination, 'data.json'), settings); writeFileSync(join(destination, 'extra.txt'), 'preserve');
		const enabledPath = join(vault, DEFAULT_CONFIG_DIR, 'community-plugins.json'); const notePath = join(vault, 'Note.md');
		writeFileSync(enabledPath, '["mindmap-studio","other"]\n'); writeFileSync(notePath, '# untouched\r\n');
		const result = copyBuiltPlugin(root, vault); cleanup.push(result.backup);
		expect(readFileSync(join(result.backup, 'main.js'), 'utf8')).toBe('old plugin');
		expect(readFileSync(join(result.backup, 'styles.css'), 'utf8')).toBe('old style');
		expect(readFileSync(join(result.backup, 'manifest.json'), 'utf8')).toBe('{"version":"old"}');
		expect(readFileSync(join(result.backup, 'data.json'), 'utf8')).toBe(settings);
		expect(readFileSync(join(destination, 'data.json'), 'utf8')).toBe(settings);
		expect(readFileSync(join(destination, 'extra.txt'), 'utf8')).toBe('preserve');
		expect(readFileSync(enabledPath, 'utf8')).toBe('["mindmap-studio","other"]\n');
		expect(readFileSync(notePath, 'utf8')).toBe('# untouched\r\n'); expect(result.settingsUnchanged).toBe(true);
	});
	it('passes the raw make vault value through the environment without evaluating shell syntax', () => {
		const { base } = fixture(); mkdirSync(join(base, 'scripts'));
		writeFileSync(join(base, 'Makefile'), readFileSync(new URL('../../Makefile', import.meta.url)));
		writeFileSync(join(base, 'scripts/install.mjs'), "import{writeFileSync}from'node:fs';writeFileSync('vault.txt',process.env.MINDMAP_STUDIO_VAULT);");
		const value = join(base, '云笔记 $(touch BAD) `touch WORSE`');
		const defaultResult = spawnSync('make', ['install'], { cwd: base, encoding: 'utf8' });
		expect(defaultResult.status, defaultResult.stderr).toBe(0);
		expect(readFileSync(join(base, 'vault.txt'), 'utf8')).toBe('~/Nutstore Files/我的坚果云/云笔记');
		const result = spawnSync('make', ['install', 'vault=' + value], { cwd: base, encoding: 'utf8' });
		expect(result.status, result.stderr).toBe(0); expect(readFileSync(join(base, 'vault.txt'), 'utf8')).toBe(value);
		expect(existsSync(join(base, 'BAD'))).toBe(false); expect(existsSync(join(base, 'WORSE'))).toBe(false);
	});
	it('prints help without running a build or touching a vault', () => {
		const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/install.mjs', import.meta.url)), '--help'], { encoding: 'utf8' });
		expect(result.status).toBe(0); expect(result.stdout).toContain('make install vault=');
		expect(result.stdout).not.toContain('> oh-my-mindmap-studio');
	});
});
