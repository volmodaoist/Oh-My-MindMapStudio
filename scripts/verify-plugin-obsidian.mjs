/** 真实已安装 TikZJax + 配套 CodeTab 的交互、正文、撤销和导出回归。 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchObsidianHost } from './obsidian-host.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const codeTab = process.env.CODE_TAB_PLUGIN;
const tikz = process.env.TIKZJAX_PLUGIN;
if (!codeTab || !tikz) throw new Error('Set CODE_TAB_PLUGIN and TIKZJAX_PLUGIN to the plugin artifact directories');
const tex = process.env.TIKZ_SOURCE ? await readFile(process.env.TIKZ_SOURCE, 'utf8')
	: '\\begin{document}\n\\begin{tikzpicture}\n\\draw (0,0) rectangle (3,2);\n\\node at (1.5,1) {Diagram};\n\\end{tikzpicture}\n\\end{document}';
const widthFixture = (await readFile(join(root, 'tests/fixtures/plugin-content-width.txt'), 'utf8')).trimEnd();
const tab = 'tab: Short\n```shell\necho short\n```\n\ntab: Tall\n' + Array.from({ length: 25 }, (_, i) => 'line ' + i).join('\n') + '\n\n' + widthFixture;
const initial = '---\nMindmap: Mindmap\nMindmap Layout: logical\n---\n\n## Diagram\n```tikz\n' + tex + '\n```\n\n## Tabs\n````tab\n' + tab + '\n````\n';
const host = await launchObsidianHost(initial, [
	{ id: 'obsidian-code-tab', path: codeTab }, { id: 'obsidian-tikzjax', path: tikz }, { id: 'mindmap-studio', path: root },
]);
const { page, vault, directory } = host;
const results = []; const errors = []; const diagnostics = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => {
	if (message.type() === 'error') errors.push(message.text());
	else if (['warning', 'warn'].includes(message.type())) diagnostics.push(message.text());
});
const fileContent = () => readFile(join(vault, 'Test.mindmap.md'), 'utf8');
try {
	if (process.env.NATIVE_TIKZ_BASELINE) {
		await page.evaluate(async source => {
			const file = await app.vault.create('Plain.md', '```tikz\n' + source + '\n```');
			const leaf = app.workspace.getLeaf(true); await leaf.openFile(file);
		}, tex);
		await page.waitForFunction(() => [...document.querySelectorAll('.block-language-tikz svg')].some(svg => svg.querySelector('path,use') && !svg.querySelector('animate')));
		console.log('NATIVE BASELINE TIKZ OK');
	}
	await page.evaluate(async () => {
		for (const existing of app.workspace.getLeavesOfType('mindmap-view')) existing.detach();
		window.testCodeTabMounts = [];
		const wrappers = new WeakMap();
		const wrap = api => {
			if (!api || wrappers.has(api)) return wrappers.get(api) ?? api;
			const wrapped = { ...api, render: async options => {
				const handle = await api.render(options);
				const record = { handle: null, container: options.container, path: options.sourcePath };
				const wrappedHandle = { ...handle, update: async patch => {
					await handle.update(patch); record.path = patch.sourcePath ?? record.path;
				} };
				record.handle = wrappedHandle; window.testCodeTabMounts.push(record);
				return wrappedHandle;
			} };
			wrappers.set(api, wrapped); wrappers.set(wrapped, wrapped); return wrapped;
		};
		document.addEventListener('obsidian-code-tab-api', event => {
			let api = wrap(event.detail.api);
			Object.defineProperty(event.detail, 'api', { configurable: true, get: () => api, set: value => { api = wrap(value); } });
		});
		const file = app.vault.getFileByPath('Test.mindmap.md'); const leaf = app.workspace.getLeaf(true);
		await leaf.setViewState({ type: 'mindmap-view', state: { file: file.path } });
		window.testMindMapView = leaf.view;
	});
	await page.waitForFunction(() => !!window.testMindMapView.mindMap);
	await page.evaluate(() => window.testMindMapView.mindMap.el.setAttribute('data-test-main-canvas', ''));
	await page.waitForFunction(() => document.querySelector('.mindmap-plugin-live.code-tab'));
	await page.waitForFunction(() => [...document.querySelectorAll('[data-test-main-canvas] foreignObject .mindmap-plugin-block svg')].some(svg => svg.querySelectorAll('path,use,text').length > 0 && !svg.querySelector('animate')));
	await page.evaluate(() => window.testMindMapView.mindMap.view.fit());
	assert.equal(await fileContent(), initial); results.push('Opening plugins does not rewrite Markdown');
	const group = page.locator('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab').first();
	const pasteCode = async text => {
		const editor = group.locator('.code-tab__native-editor .cm-content');
		await editor.press('Meta+A');
		await editor.evaluate((element, value) => {
			const data = new DataTransfer(); data.setData('text/plain', value);
			element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
		}, text);
	};
	await page.evaluate(() => {
		window.testCodeTabRoot = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		window.testCodeTabHost = window.testCodeTabMounts.find(item => item.container === window.testCodeTabRoot);
		if (!window.testCodeTabHost) throw new Error('Node was not mounted through the public API');
	});
	const shortWidth = await group.evaluate(element => element.offsetWidth);
	await group.getByRole('tab', { name: 'Python 文件流', exact: true }).click();
	await page.waitForFunction(before => {
		const root = window.testCodeTabRoot; const code = root.querySelector('.code-tab__panel:not([hidden]) pre code');
		const fo = root.closest('foreignObject');
		return code?.textContent.includes('Python Program') && root.offsetWidth > before + 100 && fo?.width.baseVal.value >= root.offsetWidth;
	}, shortWidth);
	const wideMetrics = await group.evaluate(element => {
		const code = element.querySelector('.code-tab__panel:not([hidden]) pre code');
		const style = getComputedStyle(code); const lines = code.textContent.replace(/\n$/, '').split('\n').length;
		return { width: element.offsetWidth, codeHeight: code.offsetHeight, expectedHeight: lines * parseFloat(style.lineHeight),
			whiteSpace: style.whiteSpace, foWidth: element.closest('foreignObject').width.baseVal.value };
	});
	assert.equal(wideMetrics.whiteSpace, 'pre'); assert(wideMetrics.codeHeight <= wideMetrics.expectedHeight + 2);
	assert(wideMetrics.foWidth >= wideMetrics.width);
	assert.equal(await fileContent(), initial);
	await page.evaluate(() => window.testMindMapView.mindMap.view.fit());
	await page.waitForFunction(() => [...document.querySelectorAll('[data-test-main-canvas] foreignObject .mindmap-plugin-block svg')].some(svg => svg.querySelectorAll('path,use,text').length > 0 && !svg.querySelector('animate')));
	await page.screenshot({ path: join(directory, 'automatic-width.png'), fullPage: true });
	await group.getByRole('tab', { name: 'Short', exact: true }).click();
	await page.waitForFunction(before => window.testCodeTabRoot.offsetWidth <= before + 2, shortWidth);
	results.push('Actual Linux pipe fixture grows and shrinks the node width without wrapping code or saving');
	await group.getByRole('tab', { name: 'Tall', exact: true }).click();
	await page.waitForFunction(() => {
		const group = document.querySelector('.mindmap-plugin-live.code-tab');
		const slot = group?.closest('.mindmap-plugin-block'); const fo = slot?.closest('foreignObject');
		return group?.textContent.includes('line 24') && fo?.height.baseVal.value >= group.offsetHeight;
	});
	assert.equal(await fileContent(), initial); results.push('Tab switch grows node without editing the file');
	await group.getByRole('tab', { name: 'Short', exact: true }).click();
	await group.locator('pre code').filter({ visible: true }).first().click();
	await group.locator('.code-tab__native-editor .cm-content').waitFor();
	await group.locator('.code-tab__native-editor .cm-content').focus();
	await pasteCode(Array.from({ length: 35 }, (_, i) => 'echo ' + i).join('\n'));
	await page.waitForTimeout(250);
	assert(await page.evaluate(() => !!document.activeElement.closest('.mindmap-plugin-live')), 'Node re-layout retains editor focus');
	results.push('Editor growth preserves the live component and keyboard focus');
	await group.locator('.code-tab__native-editor .cm-content').press('Meta+A');
	await group.locator('.code-tab__native-editor .cm-content').pressSequentially('echo ' + 'x'.repeat(150));
	await page.waitForFunction(before => window.testCodeTabRoot.offsetWidth > before + 100 &&
		window.testCodeTabRoot.closest('foreignObject').width.baseVal.value >= window.testCodeTabRoot.offsetWidth, shortWidth, { timeout: 15000 });
	assert(await page.evaluate(() => !!document.activeElement.closest('.mindmap-plugin-live')));
	results.push('Long code input grows the live editor and node width while preserving focus');
	await pasteCode('echo edited');
	await group.locator('.code-tab__native-editor .cm-content').press('Meta+Enter');
	await page.waitForFunction(async () => (await app.vault.read(app.vault.getFileByPath('Test.mindmap.md'))).includes('echo edited'));
	const edited = await fileContent(); assert(edited.includes(tex)); assert(edited.includes('````tab'));
	results.push('CodeTab edits save through the document session with TikZ source unchanged');
	await page.evaluate(async () => { window.testMindMapView.undo(); await window.testMindMapView.session.flush(); });
	await page.waitForFunction(async original => (await app.vault.read(app.vault.getFileByPath('Test.mindmap.md'))) === original, initial);
	await page.waitForFunction(source => {
		const root = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		const mount = window.testCodeTabMounts.find(item => item.container === root);
		try { return mount?.handle.getSnapshot().source === source; } catch { return false; }
	}, tab);
	await page.evaluate(() => {
		window.testCodeTabRoot = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		window.testCodeTabHost = window.testCodeTabMounts.find(item => item.container === window.testCodeTabRoot);
	});
	results.push('Shared undo restores the original Markdown');
	results.push('The current node public handle reflects shared undo, including restored node identities');
	await page.waitForFunction(() => document.querySelector('.mindmap-canvas-container .mindmap-plugin-live.code-tab'));
	await page.waitForTimeout(300);
	await group.getByTestId('code-tab-add').click();
	await page.waitForFunction(async () => (await app.vault.read(app.vault.getFileByPath('Test.mindmap.md'))).includes('tab: 标签5'));
	await group.getByRole('tab', { name: '标签5', exact: true }).dblclick();
	const rename = group.getByTestId('code-tab-rename');
	await rename.fill('Hosted title'); await rename.press('Enter');
	await page.waitForFunction(async () => (await app.vault.read(app.vault.getFileByPath('Test.mindmap.md'))).includes('tab: Hosted title'));
	await page.evaluate(async () => { window.testMindMapView.undo(); await window.testMindMapView.session.flush(); });
	await group.getByRole('tab', { name: '标签5', exact: true }).waitFor();
	await page.evaluate(async () => { window.testMindMapView.undo(); await window.testMindMapView.session.flush(); });
	await page.waitForFunction(async original => (await app.vault.read(app.vault.getFileByPath('Test.mindmap.md'))) === original, initial);
	results.push('Adding and renaming tabs use the shared document undo timeline');
	await group.getByRole('tab', { name: 'Python 文件流', exact: true }).click();
	await page.evaluate(async () => {
		const original = HTMLAnchorElement.prototype.click;
		HTMLAnchorElement.prototype.click = function () {
			if (this.download) { window.testSVG = fetch(this.href).then(r => r.text()); return; }
			return original.call(this);
		};
		const exporter = window.testMindMapView.mindMap.doExport;
		const originalExport = exporter.export.bind(exporter);
		exporter.export = async (...args) => {
			const result = await originalExport(...args);
			if (typeof result === 'string') window.testSVG = result.startsWith('<') ? Promise.resolve(result) : fetch(result).then(r => r.text());
			else if (result?.text) window.testSVG = result.text();
			return result;
		};
		window.testMindMapView.plugin.settings.exportImageFormat = 'svg';
		await window.testMindMapView.exportImage();
	});
	const svg = await page.evaluate(async () => await window.testSVG);
	assert(svg && svg.includes('code-tab') && svg.includes('mindmap-plugin-block'));
	assert(svg.includes('Python Program') && svg.includes('white-space: pre'));
	assert(await page.evaluate(source => {
		const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
		return !doc.querySelector('parsererror') && !doc.querySelector('.mindmap-plugin-block script') &&
			!!doc.querySelector('.mindmap-plugin-block svg path') &&
			!!doc.querySelector('.mindmap-plugin-block .code-tab [role="tab"]') &&
			!!doc.querySelector('.mindmap-plugin-block .code-tab pre code');
	}, svg), 'Export contains final TikZ geometry and frozen tab content');
	await writeFile(join(directory, 'export.svg'), svg); results.push('SVG export includes frozen CodeTab and TikZ content');
	await page.screenshot({ path: join(directory, 'diagram.png'), fullPage: true });
	await page.evaluate(() => {
		const tree = window.testMindMapView.session.cloneTree();
		const stack = [tree]; let found = false;
		while (stack.length) {
			const node = stack.pop();
			if (String(node.data.mdRaw ?? node.data.text ?? '').includes('tab: Short')) {
				node.data.customTextWidth = 600; found = true; break;
			}
			stack.push(...node.children);
		}
		if (!found) throw new Error('Cannot locate the CodeTab node');
		window.testMindMapView.session.commit(tree);
	});
	await page.waitForFunction(() => {
		const root = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		return root && !root.hasAttribute('data-plugin-auto-width') && Math.abs(root.offsetWidth - 568) < 2;
	});
	await page.evaluate(() => {
		window.testCodeTabRoot = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		window.testCodeTabHost = window.testCodeTabMounts.find(item => item.container === window.testCodeTabRoot);
	});
	await group.getByRole('tab', { name: 'Short', exact: true }).click();
	await page.waitForFunction(() => Math.abs(window.testCodeTabRoot.offsetWidth - 568) < 2);
	await group.getByRole('tab', { name: 'Python 文件流', exact: true }).click();
	await page.waitForFunction(() => Math.abs(window.testCodeTabRoot.offsetWidth - 568) < 2);
	assert(await group.evaluate(element => element.closest('foreignObject').width.baseVal.value === 600));
	results.push('Explicit node width remains fixed across tab switches');
	await page.evaluate(async () => {
		window.testMindMapView.undo(); await window.testMindMapView.session.flush();
	});
	await page.waitForFunction(() => document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab')?.hasAttribute('data-plugin-auto-width'));
	await page.evaluate(() => {
		window.testCodeTabRoot = document.querySelector('[data-test-main-canvas] foreignObject .mindmap-plugin-live.code-tab');
		window.testCodeTabHost = window.testCodeTabMounts.find(item => item.container === window.testCodeTabRoot);
	});
	const beforeReadOnly = await fileContent();
	await page.evaluate(async tabSource => {
		const file = await app.vault.create('ReadOnly.md', '`````mindmap\n## Tabs\n````tab\n' + tabSource + '\n````\n`````\n');
		await app.workspace.getLeaf(true).openFile(file);
	}, tab);
	const readOnly = page.locator('.block-language-mindmap .mindmap-plugin-live.code-tab').first();
	await readOnly.getByRole('tab', { name: 'Tall', exact: true }).click();
	await readOnly.getByTestId('code-tab-panel').filter({ visible: true }).getByText('line 24', { exact: false }).waitFor();
	assert.equal(await readOnly.getByTestId('code-tab-add').count(), 0);
	await readOnly.getByRole('tab', { name: 'Short', exact: true }).dblclick();
	await readOnly.locator('pre code').filter({ visible: true }).first().click();
	assert.equal(await readOnly.getByTestId('code-tab-editor').count(), 0);
	assert.equal(await readOnly.getByTestId('code-tab-rename').count(), 0);
	assert.equal(await fileContent(), beforeReadOnly);
	results.push('Read-only embeds allow tab switching without editing controls or writes');
	await page.evaluate(async () => {
		app.workspace.setActiveLeaf(window.testMindMapView.leaf, { focus: true });
		await app.plugins.disablePlugin('obsidian-code-tab'); app.workspace.trigger('layout-change');
	});
	await page.waitForFunction(() => !document.querySelector('.mindmap-canvas-container .mindmap-plugin-live.code-tab'));
	assert(await page.evaluate(() => {
		try { window.testCodeTabHost.handle.getSnapshot(); return false; } catch (error) { return error.code === 'DISPOSED'; }
	}));
	await page.evaluate(async () => { await app.plugins.enablePlugin('obsidian-code-tab'); app.workspace.trigger('layout-change'); });
	await group.waitFor();
	assert(await page.evaluate(() => document.querySelector('.mindmap-canvas-container .mindmap-plugin-live.code-tab') !== window.testCodeTabRoot));
	results.push('Provider disable disposes old handles; enable and layout refresh remount the nodes');
	await page.evaluate(async () => {
		await app.fileManager.renameFile(app.vault.getFileByPath('Test.mindmap.md'), 'Moved.mindmap.md');
		app.workspace.trigger('layout-change');
	});
	await page.waitForFunction(() => {
		const mounted = window.testCodeTabMounts.filter(item => item.container.closest('.mindmap-canvas-container') && item.container.classList.contains('code-tab'));
		return mounted.length > 0 && mounted.every(item => item.path === 'Moved.mindmap.md');
	});
	assert(await page.evaluate(() => window.testMindMapView.file.path === 'Moved.mindmap.md'));
	results.push('Native rename keeps the diagram open and refreshes the plugin path context');
	assert.deepEqual(errors, [], 'No runtime errors in the actual Obsidian host');
	await writeFile(join(directory, 'report.json'), JSON.stringify({ ok: true, results, errors, diagnostics, width: { short: shortWidth, wide: wideMetrics } }, null, 2));
	console.log('PASS:',results.length,'checks; artifacts:',directory);
} catch (error) {
	const dimensions = await page.evaluate(() => {
		const root = window.testCodeTabRoot;
		if (!root) return [];
		return [root, ...root.querySelectorAll('.code-tab__native-editor, .markdown-embed-content, .markdown-source-view, .code-tab__cm-root, .code-tab__cm-scroller, .code-tab__cm-sizer, .code-tab__cm-content, .cm-line')].map(element => {
			const style = getComputedStyle(element);
			return { className: element.className, text: element.classList.contains('cm-line') ? element.textContent.slice(0, 180) : undefined, width: element.offsetWidth, scrollWidth: element.scrollWidth, cssWidth: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth, contain: style.contain, display: style.display, whiteSpace: style.whiteSpace };
		});
	}).catch(() => []);
	await writeFile(join(directory, 'failure.html'), await page.content()).catch(() => undefined);
	await page.screenshot({ path: join(directory, 'failure.png'), fullPage: true }).catch(() => undefined);
	await writeFile(join(directory, 'report.json'), JSON.stringify({ ok: false, results, errors, diagnostics, dimensions, error: String(error) }, null, 2));
	console.error('FAILED; artifacts:',directory); throw error;
} finally { await host.close(); }
