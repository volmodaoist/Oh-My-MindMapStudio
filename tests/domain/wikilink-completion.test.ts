import { describe, expect, it } from 'vitest';
import { wikilinkTriggerAt } from '../../src/domain/wikilink';

describe('wikilink completion trigger', () => {
	it.each(['[[', 'text [[Target', '![[Image', '[[Target#Head', '[[Target#^block'])('finds the incomplete token in %s', value => {
		const trigger = wikilinkTriggerAt(value, value.length);
		expect(trigger?.from).toBe(value.lastIndexOf('[[')); expect(trigger?.to).toBe(value.length);
		expect(trigger?.query).toBe(value.slice(value.lastIndexOf('[[') + 2));
	});
	it.each(['plain text', '[[Target]]', '[[Target|alias', '\\[[Target', '[[one\ntwo'])('does not trigger for %s', value => {
		expect(wikilinkTriggerAt(value, value.length)).toBeNull();
	});
	it('replaces the existing closing brackets and preserves surrounding text', () => {
		expect(wikilinkTriggerAt('before [[Tar]] after', 12)).toEqual({ from: 7, to: 14, query: 'Tar' });
	});
	it('does not overwrite a selected range or another link', () => {
		expect(wikilinkTriggerAt('[[Target', 3, 6)).toBeNull();
		expect(wikilinkTriggerAt('[[A [[B]]', 4)?.to).toBe(4);
	});
	it('does not erase a manually entered alias when editing the target before the pipe', () => {
		expect(wikilinkTriggerAt('[[Tar|保留别名]]', 5)).toBeNull();
	});
});
