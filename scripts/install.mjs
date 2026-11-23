#!/usr/bin/env node
/** 本地构建安装：先校验和备份三件套，再复制并核对；笔记、data.json 与插件启用配置不改写。 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const artifacts = ['main.js', 'manifest.json', 'styles.css'];
/** Offline installs target the standard configuration directory; no running Vault API is available. */
export const DEFAULT_CONFIG_DIR = '.obsidian';
/** @param {Buffer} bytes */
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** @param {unknown} value */
export function validateVault(value) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error('Vault path is required. Use: make install vault="/path/to/vault"');
	}
	const vault = resolve(value.startsWith('~/') ? join(homedir(), value.slice(2)) : value);
	if (!existsSync(vault) || !statSync(vault).isDirectory()) throw new Error(`Vault directory does not exist: ${vault}`);
	const config = join(vault, DEFAULT_CONFIG_DIR);
	if (!existsSync(config) || !statSync(config).isDirectory()) throw new Error(`Not an initialized Obsidian vault (missing ${DEFAULT_CONFIG_DIR}): ${vault}`);
	return vault;
}

/** 也可用于安装其它已构建插件；插件目录只由该产物的 manifest.id 决定。
 * @param {string} root 三件套所在目录
 * @param {unknown} vaultPath
 */
export function copyBuiltPlugin(root, vaultPath) {
	const vault = validateVault(vaultPath);
	/** @type {Map<string, Buffer>} */
	const built = new Map();
	for (const name of artifacts) {
		const path = join(root, name);
		if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Missing build artifact: ${name}`);
		built.set(name, readFileSync(path));
	}
	const manifestBytes = built.get('manifest.json');
	if (!manifestBytes) throw new Error('Missing build artifact: manifest.json');
	const manifest = JSON.parse(manifestBytes.toString('utf8'));
	if (typeof manifest.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id)) throw new Error('Invalid plugin ID in manifest.json');
	const destination = join(vault, DEFAULT_CONFIG_DIR, 'plugins', manifest.id);
	const settingsPath = join(destination, 'data.json');
	const settings = existsSync(settingsPath) ? readFileSync(settingsPath) : null;
	/** @type {Map<string, Buffer>} */
	const previous = new Map();
	for (const name of [...artifacts, 'data.json']) {
		const path = join(destination, name);
		if (existsSync(path)) previous.set(name, readFileSync(path));
	}
	const backup = mkdtempSync(join(tmpdir(), 'oh-my-mindmap-studio-install-'));
	for (const [name, bytes] of previous) writeFileSync(join(backup, name), bytes);
	// 备份在任何覆盖之前完成；复制失败保留备份路径供恢复。
	console.log(`Backup: ${backup}`);
	mkdirSync(destination, { recursive: true });
	const files = [];
	for (const [name, bytes] of built) {
		const path = join(destination, name);
		try { writeFileSync(path, bytes); }
		catch (error) { throw Object.assign(new Error(`Install failed; original files are backed up at ${backup}`), { cause: error }); }
		const digest = sha256(readFileSync(path));
		if (digest !== sha256(bytes)) throw new Error(`Installed artifact hash mismatch: ${name}; backup: ${backup}`);
		files.push({ name, sha256: digest });
	}
	const currentSettings = existsSync(settingsPath) ? readFileSync(settingsPath) : null;
	const settingsUnchanged = settings === null ? currentSettings === null : currentSettings !== null && settings.equals(currentSettings);
	const result = { destination, name: manifest.name, version: manifest.version, backup, files, settingsUnchanged };
	writeFileSync(join(backup, 'install.json'), JSON.stringify(result, null, 2) + '\n');
	return result;
}

/** @param {string[]} args */
function npm(args) {
	const windows = process.platform === 'win32';
	const result = spawnSync(windows ? 'npm.cmd' : 'npm', args, { cwd: projectRoot, stdio: 'inherit', shell: windows });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed`);
}

export function main() {
	if (process.argv.includes('--help')) {
		console.log([
			'Oh-My-Mindmap-Studio local development',
			'',
			'make dev                          Watch and rebuild the plugin',
			'make build                        Check types and build production assets',
			'make test                         Run all tests',
			'make test-watch                   Watch and rerun tests',
			'make lint                         Run ESLint',
			'make check                        Run the existing change-driven gates',
			'make install                      Build and install into the configured vault',
			'make install vault="/path/to/vault"  Install into another initialized vault',
			'',
			`Vault: ${process.env.MINDMAP_STUDIO_VAULT ?? '(set vault="/path/to/vault")'}`,
			'Install backs up the existing files, copies main.js, manifest.json and styles.css, and verifies SHA256.',
			'Notes, plugin settings and enabled-plugin configuration are preserved.',
			'Restart Obsidian afterward to load the new main.js.',
		].join('\n'));
		return;
	}
	const vault = validateVault(process.env.MINDMAP_STUDIO_VAULT ?? process.argv[2]);
	if (!existsSync(join(projectRoot, 'node_modules/esbuild/package.json')) || !existsSync(join(projectRoot, 'node_modules/typescript/package.json'))) {
		npm(['install', '--no-audit', '--no-fund']);
	}
	npm(['run', 'build']);
	const result = copyBuiltPlugin(projectRoot, vault);
	console.log(`Installed ${result.name} ${result.version}\n${result.destination}\nSHA256 verified for all three files.\nRestart Obsidian to load the new main.js.`);
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try { main(); }
	catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
