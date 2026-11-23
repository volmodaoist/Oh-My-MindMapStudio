/** 插件内容只声明测量槽位；平台在真实节点挂载后放入活动组件。 */
import type { InlineContentDocument, InlineContentOptions, InlineSegment } from '@/src/core/node-content-types';
import type { PluginBlockRequest } from '@/src/core/plugin-content-types';
import { PLUGIN_SLOT_CLASS, PLUGIN_AUTO_WIDTH_ATTR } from '@/src/core/plugin-content-types';
import { buildCodeBlockElement } from './content-code';
import { CODE_COPY_CLASS, CODE_COPY_BUTTON_STYLES } from './content-copy.styles';
import { t, type Language } from '@/src/core/i18n';
import type { NodeContentTones } from '@/src/domain/color';

export function buildPluginBlock(
	doc: InlineContentDocument, segment: InlineSegment, options: InlineContentOptions,
	lang: Language, tones: NodeContentTones | null, nodeId: string, index: number,
	owner: object | null, explicitWidth: number | null,
): HTMLElement {
	const card = doc.createElement('div'); card.className = 'mindmap-plugin-card';
	Object.assign(card.style, { position: 'relative', display: 'block', maxWidth: '100%', margin: '4px 0' });
	const slot = doc.createElement('div'); slot.className = PLUGIN_SLOT_CLASS;
	Object.assign(slot.style, { display: 'block', maxWidth: '100%', whiteSpace: 'normal' });
	const fallback = buildCodeBlockElement(doc, segment, lang, options, tones);
	const autoWidth = explicitWidth === null && options.pluginContent?.mode(segment.lang ?? '') === 'live';
	if (autoWidth) slot.setAttribute(PLUGIN_AUTO_WIDTH_ATTR, '');
	slot.appendChild(fallback); card.appendChild(slot);
	const request: PluginBlockRequest = { nodeId, index, owner, holder: slot, source: segment.text,
		language: segment.lang ?? '', availableWidth: Math.max(1, (explicitWidth ?? 500) - 32), autoWidth };
	const snapshot = options.pluginContent?.render(request);
	if (snapshot) slot.replaceChildren(snapshot);
	if (options.pluginContent?.mode(segment.lang ?? '') === 'static') {
		const button = doc.createElement('button'); button.className = CODE_COPY_CLASS;
		button.setAttribute('data-code', segment.text); button.setAttribute('aria-label', t(lang, 'codeBlock.copy'));
		Object.assign(button.style, CODE_COPY_BUTTON_STYLES); card.appendChild(button);
	}
	return card;
}
