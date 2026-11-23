/** Record real Obsidian interactions in an isolated demo vault. Raw PNGs stay outside the repository. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { launchObsidianHost } from '../../../../../scripts/obsidian-host.mjs';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const args = process.argv.slice(2);
const output = resolve(args.includes('--output') ? args[args.indexOf('--output') + 1] : '/tmp/mindmap-readme-recordings');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const codeTab = process.env.CODE_TAB_PLUGIN;
if (!codeTab) throw new Error('Set CODE_TAB_PLUGIN to the Beyond-CodeTab artifact directory');
const declaration = '---\nMindmap: Mindmap\nMindmap Layout: logical\n---\n\n';
const project = '# Plan\n- Scope the work\n- Build the prototype\n\n# Research\n- User interviews\n- UI inspiration\n\n# Ship\n- Gather feedback\n- Publish release\n';
const notes = {
	'Project notes.md': project,
	'Connected notes.mindmap.md': declaration + '# Capture ideas\n- Start a note link\n\n# Browse\n- [[Design system]]\n- [[Roadmap]]\n',
	'Rich content.mindmap.md': declaration + '# Checklist\n- [ ] Finish the draft\n- [x] Outline the idea\n\n# Code examples\n````tab\ntab: JavaScript\n```js\nconst greeting = "Hello";\nconsole.log(greeting);\n```\ntab: Python\n```python\ndef greet(name):\n    return f"Hello, {name}!"\nprint(greet("Obsidian"))\n```\n````\n\n# Flow\n```mermaid\ngraph LR\n  Note --> Map --> Markdown\n```\n',
	'Workspace.mindmap.md': declaration + ['Research', 'Planning', 'Design', 'Development', 'Documentation', 'Release'].map((name, i) => `# ${name}\n` + ['Ideas', 'Examples', 'Checklist', 'References'].map(label => `- ${name === 'Documentation' && label === 'Checklist' ? 'README' : label + ' ' + (i + 1)}`).join('\n')).join('\n\n'),
	'React.md': '---\naliases: [React concepts]\n---\n\n# React\nBuild user interfaces with components.\n\n## Hooks\nKeep state close to the component.\n',
	'Design system.md': '# Design system\nShared colors, typography and spacing.\n',
	'Roadmap.md': '# Roadmap\n- Explore\n- Build\n- Share\n',
};

await mkdir(output, { recursive: true });
const host = await launchObsidianHost('# Demo\n', [
	{ id: 'obsidian-code-tab', path: codeTab }, { id: 'mindmap-studio', path: root },
]);
const { page } = host;
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (['error', 'warning', 'warn'].includes(message.type())) console.log('App:', message.text()); });
let pointer = { x: 40, y: 80 };
const captures = [];

async function move(x, y, steps = 10) {
	const from = pointer;
	for (let step = 1; step <= steps; step++) {
		await page.mouse.move(from.x + (x - from.x) * step / steps, from.y + (y - from.y) * step / steps);
		await page.waitForTimeout(18);
	}
	pointer = { x, y };
}
async function click(locator) {
	await locator.waitFor(); const box = await locator.boundingBox(); assert(box, 'Visible target');
	await move(box.x + box.width / 2, box.y + box.height / 2);
	await locator.click();
}
async function open(path, map = true) {
	await page.evaluate(async ({ path, map }) => {
		const leaf = app.workspace.getMostRecentLeaf(app.workspace.rootSplit) ?? app.workspace.getLeaf(true);
		await leaf.setViewState({ type: map ? 'mindmap-view' : 'markdown', state: { file: path, mode: 'preview' } });
		await app.workspace.revealLeaf(leaf);
		app.workspace.setActiveLeaf(leaf, { focus: true });
		window.docsLeaf = leaf;
	}, { path, map });
	if (map) {
		await page.waitForFunction(() => window.docsLeaf.view.mindMap?.renderer.root);
		await page.evaluate(() => window.docsLeaf.view.mindMap.el.setAttribute('data-docs-canvas', ''));
		await click(page.locator('.mindmap-tool-btn[aria-label="Fit"]'));
	}
	await page.waitForTimeout(450);
}
const canvas = () => page.locator('[data-docs-canvas]');
const topic = text => canvas().getByText(text, { exact: true }).first();

async function capture(name, action) {
	const directory = join(output, name); await mkdir(directory, { recursive: true });
	const frames = []; const captions = []; let writing = Promise.resolve(); let sequence = 0; let complete = false;
	const caption = text => { captions.push({ time: Date.now() / 1000, text }); console.log(name + ': ' + text); };
	const start = Date.now() / 1000;
	await page.screenshot({ path: join(directory, '00000.png'), scale: 'css' });
	frames.push({ file: '00000.png', time: start });
	const cdp = await page.context().newCDPSession(page);
	cdp.on('Page.screencastFrame', frame => {
		const file = String(++sequence).padStart(5, '0') + '.png';
		frames.push({ file, time: frame.metadata.timestamp ?? Date.now() / 1000 });
		writing = writing.then(() => writeFile(join(directory, file), Buffer.from(frame.data, 'base64')));
		void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined);
	});
	await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 1240, maxHeight: 840, everyNthFrame: 2 });
	try {
		await action(caption);
		await page.waitForTimeout(1100);
		complete = true;
	} finally {
		await cdp.send('Page.stopScreencast').catch(() => undefined); await writing; await cdp.detach().catch(() => undefined);
		const end = Date.now() / 1000;
		await writeFile(join(directory, 'frames.json'), JSON.stringify({ name, complete, start, end, frames, captions }, null, 2));
		captures.push({ name, seconds: end - start, frames: frames.length });
	}
}

try {
	await page.evaluate(async notes => {
		const win = require('@electron/remote').getCurrentWindow();
		require('@electron/remote').app.focus({ steal: true });
		win.setBounds({ x: 70, y: 50, width: 1240, height: 840 }); win.show(); win.focus();
		app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse();
		const plugin = app.plugins.plugins['mindmap-studio'];
		plugin.settings.language = 'en'; await plugin.saveSettings(); plugin.refreshLanguageUi();
		for (const [path, text] of Object.entries(notes)) await app.vault.create(path, text);
		const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		cursor.setAttribute('width', '22'); cursor.setAttribute('height', '28');
		Object.assign(cursor.style, { position: 'fixed', left: '0', top: '0', zIndex: '100000', pointerEvents: 'none', transform: 'translate(40px,80px)' });
		const shape = document.createElementNS(cursor.namespaceURI, 'path');
		shape.setAttribute('d', 'M2 2 L2 23 L7 17 L11 25 L15 23 L11 15 L20 15 Z');
		shape.setAttribute('fill', '#20242a'); shape.setAttribute('stroke', '#fff'); shape.setAttribute('stroke-width', '1.4');
		cursor.appendChild(shape); document.body.appendChild(cursor);
		document.addEventListener('mousemove', event => { cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`; }, true);
	}, notes);
	await page.waitForFunction(() => app.metadataCache.getFileCache(app.vault.getFileByPath('React.md'))?.headings?.length);
	console.log('UI environment:', await page.evaluate(() => ({ platform: process.platform, focused: document.hasFocus(), windowFocused: require('@electron/remote').getCurrentWindow().isFocused() })));
	console.log('Ribbon actions:', await page.locator('.side-dock-ribbon-action').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label'))));
	await page.screenshot({ path: join(output, 'setup.png'), scale: 'css' });

	if (!only || only === 'edit-and-organize') {
		await open('Project notes.md', false);
		await click(page.locator('.mindmap-open-action:visible'));
		await page.waitForFunction(() => window.docsLeaf.view.mindMap?.renderer.root);
		await page.evaluate(() => window.docsLeaf.view.mindMap.el.setAttribute('data-docs-canvas', ''));
		await click(page.locator('.mindmap-tool-btn[aria-label="Fit"]'));
		await capture('edit-and-organize', async caption => {
			caption('Your Markdown, as an editable mind map'); await page.waitForTimeout(800);
			await click(page.locator('.mindmap-tool-btn[aria-label="Back"]'));
			await page.waitForFunction(() => window.docsLeaf.view.getViewType() === 'markdown'); await page.waitForTimeout(500);
			caption('Open an existing Markdown note as a mind map'); await page.waitForTimeout(900);
			await click(page.locator('.mindmap-open-action:visible'));
			await page.waitForFunction(() => window.docsLeaf.view.mindMap?.renderer.root);
			await page.evaluate(() => window.docsLeaf.view.mindMap.el.setAttribute('data-docs-canvas', ''));
			await click(page.locator('.mindmap-tool-btn[aria-label="Fit"]')); await page.waitForTimeout(700);
			for (let step = 0; step < 2; step++) await click(page.locator('.mindmap-tool-btn[aria-label="Zoom in"]'));
			caption('Double-click a topic to edit its Markdown text');
			await topic('Build the prototype').dblclick();
			const input = page.locator('textarea.mindmap-node-inline-editor');
			await input.press('Meta+A'); await input.pressSequentially('Build the first prototype', { delay: 38 }); await input.press('Enter');
			await page.waitForTimeout(650);
			caption('Tab adds a child topic'); await click(topic('Research')); await page.keyboard.press('Tab');
			const empty = page.locator('.smm-node-edit-wrap:visible'); await empty.waitFor();
			await empty.pressSequentially('Documentation', { delay: 55 }); await empty.press('Enter'); await page.waitForTimeout(700);
			caption('Drag a branch to change its parent');
			const from = await topic('Documentation').boundingBox(); const to = await topic('Gather feedback').boundingBox(); assert(from && to);
			await move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.waitForTimeout(160);
			await move(to.x + to.width * 0.75, to.y + to.height / 2, 24); await page.waitForTimeout(200); await page.mouse.up();
			await click(page.locator('.mindmap-tool-btn[aria-label="Fit"]'));
			await page.waitForTimeout(850);
			caption('Return to Markdown: your outline is updated'); await click(page.locator('.mindmap-tool-btn[aria-label="Back"]'));
			await page.waitForFunction(() => window.docsLeaf.view.getViewType() === 'markdown');
			const written = await page.evaluate(() => app.vault.read(app.vault.getFileByPath('Project notes.md')));
			assert(written.includes('Build the first prototype') && written.indexOf('Documentation') > written.indexOf('# Ship'));
			assert(!written.startsWith('---'), 'Temporary view did not add frontmatter');
		});
	}
	if (!only || only === 'wikilink-completion') {
		await open('Connected notes.mindmap.md');
		await capture('wikilink-completion', async caption => {
			caption('Type [[ to find a note or alias'); await page.waitForTimeout(600);
			await topic('Start a note link').dblclick(); const input = page.locator('textarea.mindmap-node-inline-editor');
			await input.press('Meta+A'); await input.pressSequentially('Connect [[React', { delay: 80 });
			await page.locator('.mindmap-wikilink-suggestions').waitFor(); await page.waitForTimeout(900);
			caption('Tab inserts the link; Enter saves the topic'); await input.press('Tab'); await page.waitForTimeout(500); await input.press('Enter');
			await page.waitForTimeout(750);
			caption('Click a wikilink to open the connected note');
			await click(canvas().locator('a.internal-link').filter({ hasText: /^React$/ }));
			await page.waitForFunction(() => app.workspace.getMostRecentLeaf()?.view.file?.path === 'React.md');
		});
	}
	if (!only || only === 'rich-content') {
		await open('Rich content.mindmap.md');
		const tabs = canvas().locator('.mindmap-plugin-live.code-tab'); await tabs.waitFor();
		await capture('rich-content', async caption => {
			caption('Tasks and diagrams stay with their topic'); await page.waitForTimeout(800);
			await click(topic('Finish the draft').locator('..').locator('[role="checkbox"]'));
			await page.waitForTimeout(650);
			caption('Switch live code tabs inside the mind map'); await click(tabs.getByRole('tab', { name: 'Python', exact: true }));
			await tabs.getByText('Obsidian', { exact: false }).first().waitFor(); await page.waitForTimeout(1100);
			await click(tabs.getByRole('tab', { name: 'JavaScript', exact: true })); await page.waitForTimeout(850);
		});
	}
	if (!only || only === 'minimap-navigation') {
		await open('Workspace.mindmap.md');
		await page.evaluate(async () => {
			await app.workspace.ensureSideLeaf('outline', 'right', { active: false, reveal: true });
			app.workspace.rightSplit.expand(); app.workspace.setActiveLeaf(window.docsLeaf, { focus: true });
			app.workspace.trigger('layout-change');
		});
		console.log('Sidebar state:', await page.evaluate(() => ({ active: app.workspace.activeLeaf?.view.getViewType(), recent: app.workspace.getMostRecentLeaf(app.workspace.rootSplit)?.view.getViewType(), collapsed: app.workspace.rightSplit.collapsed, outline: app.workspace.getLeavesOfType('outline').length, minimap: app.workspace.getLeavesOfType('mindmap-studio-minimap').length, mainContainer: window.docsLeaf.getContainer() === app.workspace.rootSplit, documentWindow: window.docsLeaf.view.containerEl.win === window, constructor: window.docsLeaf.view.constructor.name, setup: window.docsLeaf.view.mindMap.opt.readonly })));
		await page.locator('.mindmap-sidebar-mount .mindmap-minimap-img').waitFor();
		await capture('minimap-navigation', async caption => {
			caption('Keep the whole map visible in the sidebar minimap');
			await page.waitForTimeout(750);
			caption('Zoom in to read a section of the map');
			for (let step = 0; step < 4; step++) await click(page.locator('.mindmap-tool-btn[aria-label="Zoom in"]'));
			await page.waitForTimeout(600);
			caption('Navigate the canvas from the minimap');
			const mini = page.locator('.mindmap-sidebar-mount .mindmap-minimap-img').first(); await mini.waitFor(); const box = await mini.boundingBox(); assert(box);
			const viewport = page.locator('.mindmap-sidebar-mount .mindmap-minimap-view:not(.is-hidden)');
			const viewportBox = await viewport.boundingBox(); assert(viewportBox);
			const before = await page.evaluate(() => JSON.stringify(window.docsLeaf.view.mindMap.view.getTransformData()));
			await move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
			await page.mouse.down(); await move(pointer.x, Math.min(pointer.y + box.height * 0.15, box.y + box.height - 8), 20); await page.mouse.up();
			await page.waitForFunction(before => JSON.stringify(window.docsLeaf.view.mindMap.view.getTransformData()) !== before, before);
			await page.waitForTimeout(900); caption('Fit returns to the whole map'); await click(page.locator('.mindmap-tool-btn[aria-label="Fit"]'));
		});
	}
	assert.deepEqual(errors, [], 'No runtime errors in demo recordings');
	await writeFile(join(output, 'recordings.json'), JSON.stringify({ gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), captures, errors, vault: host.vault }, null, 2));
	console.log('Recordings:', output);
} catch (error) {
	await writeFile(join(output, 'failure.html'), await page.content().catch(() => '')).catch(() => undefined);
	await page.screenshot({ path: join(output, 'failure.png'), scale: 'css' }).catch(() => undefined);
	await writeFile(join(output, 'failure.json'), JSON.stringify({ error: String(error), captures, errors }, null, 2));
	throw error;
} finally { await host.close(); }
