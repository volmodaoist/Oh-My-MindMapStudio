import { describe, expect, it, vi } from 'vitest';
import { CodeTabSession, getCodeTabApi, renderCodeTab } from '@/src/platform/rendering/plugins/code-tab';
import type { CodeTabApi, CodeTabHandle, CodeTabRenderOptions, CodeTabSnapshot, CodeTabUpdate } from '@/src/platform/rendering/plugins/code-tab-api';

function fixture() {
	const snapshot: CodeTabSnapshot = { source: 'original', revision: 0, tabs: [], activeIndex: null,
		readOnly: false, editing: false, saving: false, rendering: false };
	const listeners = new Set<(value: CodeTabSnapshot) => void>();
	const notify = (value = snapshot) => listeners.forEach(listener => listener(value));
	const update = vi.fn(async (_patch: CodeTabUpdate) => undefined);
	const dispose = vi.fn();
	const unsubscribe = vi.fn();
	const getSnapshot = vi.fn(() => snapshot);
	const handle = { update, getSnapshot, dispose, subscribe: (listener: (value: CodeTabSnapshot) => void) => {
		listeners.add(listener); listener(snapshot);
		return () => { unsubscribe(); listeners.delete(listener); };
	} } as unknown as CodeTabHandle;
	const render = vi.fn(async () => handle);
	const api = { errorCodes: { Busy: 'BUSY', Disposed: 'DISPOSED', RenderFailed: 'RENDER_FAILED' },
		render } as unknown as CodeTabApi;
	const changed = vi.fn();
	return { api, handle, snapshot, notify, update, dispose, unsubscribe, getSnapshot, render, changed };
}

const failure = (code: string) => Object.assign(new Error(code), { code });

function documentWith(api: CodeTabApi | null) {
	class Event {
		constructor(readonly type: string, readonly options: { detail: { api?: CodeTabApi } }) {}
		get detail() { return this.options.detail; }
	}
	const dispatchEvent = vi.fn((event: Event) => { if (api) event.detail.api = api; });
	const doc = { defaultView: { CustomEvent: Event }, dispatchEvent } as unknown as Document;
	return { doc, dispatchEvent };
}

describe('CodeTab OpenAPI discovery and mount', () => {
	it('discovers through the container window and has no old protocol request', () => {
		const { api } = fixture(); const { doc, dispatchEvent } = documentWith(api);
		expect(getCodeTabApi(doc)).toBe(api);
		expect(dispatchEvent.mock.calls[0]?.[0].type).toBe('obsidian-code-tab-api');
		expect(Object.keys(dispatchEvent.mock.calls[0]![0].detail)).toEqual(['api']);
	});
	it('returns null for absent providers, closed windows and invalid API shapes', () => {
		expect(getCodeTabApi(documentWith(null).doc)).toBeNull();
		expect(getCodeTabApi({ defaultView: null } as Document)).toBeNull();
		expect(getCodeTabApi(documentWith({} as CodeTabApi).doc)).toBeNull();
	});
	it('passes the host transaction, raw source and loaded component unchanged', async () => {
		const { api, handle, render, changed } = fixture(); const { doc } = documentWith(api);
		const options = { container: { ownerDocument: doc }, component: {}, id: 'n:0',
			source: 'tab: A\r\n```shell\r\necho ok\r\n```', sourcePath: 'Folder/A.md', onChange: vi.fn() } as unknown as CodeTabRenderOptions;
		const session = await renderCodeTab(options, new AbortController().signal, changed);
		expect(render).toHaveBeenCalledWith(options);
		expect(handle.getSnapshot()).toBeDefined();
		session.dispose();
	});
	it('releases a late handle after the owner was cancelled', async () => {
		const data = fixture(); const { doc } = documentWith(data.api);
		let resolve!: (handle: CodeTabHandle) => void;
		data.render.mockReturnValue(new Promise(done => { resolve = done; }));
		const controller = new AbortController();
		const pending = renderCodeTab({ container: { ownerDocument: doc } } as CodeTabRenderOptions, controller.signal, data.changed);
		controller.abort(); resolve(data.handle);
		await expect(pending).rejects.toThrow('渲染已取消');
		expect(data.dispose).toHaveBeenCalledOnce();
	});
	it('does not request a mount when already cancelled or when CodeTab is absent', async () => {
		const { render, changed } = fixture(); const controller = new AbortController(); controller.abort();
		await expect(renderCodeTab({} as CodeTabRenderOptions, controller.signal, changed)).rejects.toThrow('渲染已取消');
		expect(render).not.toHaveBeenCalled();
		await expect(renderCodeTab({ container: { ownerDocument: documentWith(null).doc } } as CodeTabRenderOptions,
			new AbortController().signal, changed)).rejects.toThrow('OpenAPI 不可用');
	});
});

describe('CodeTab latest host value synchronization', () => {
	it('tracks the public editing state for focus-preserving node size updates', () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		expect(session.editing).toBe(false);
		data.notify({ ...data.snapshot, editing: true }); expect(session.editing).toBe(true);
		data.notify({ ...data.snapshot, editing: false }); expect(session.editing).toBe(false);
		session.dispose(); expect(session.editing).toBe(false);
	});
	it('coalesces pending source and path changes without calling the host save callback', async () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		session.update({ source: 'first' }); session.update({ source: 'last' }); session.update({ sourcePath: 'Moved.md' });
		await session.prepare();
		expect(data.update).toHaveBeenCalledExactlyOnceWith({ source: 'last', sourcePath: 'Moved.md' });
		session.dispose();
	});
	it('waits for interaction notifications after Busy, including title editing with unchanged snapshot flags', async () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		data.update.mockRejectedValueOnce({ code: 'BUSY' });
		session.update({ source: 'external' }); await session.prepare();
		expect(data.update).toHaveBeenCalledTimes(1);
		data.notify(); await session.prepare();
		expect(data.update).toHaveBeenCalledTimes(2);
		expect(data.update).toHaveBeenLastCalledWith({ source: 'external' });
		session.dispose();
	});
	it('does not miss an idle notification that arrives before a Busy rejection is observed', async () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		data.update.mockImplementationOnce(async () => { data.notify(); throw failure('BUSY'); });
		session.update({ source: 'external' });
		await vi.waitFor(() => expect(data.update).toHaveBeenCalledTimes(2));
		expect(data.update).toHaveBeenLastCalledWith({ source: 'external' });
		session.dispose();
	});
	it('serializes in-flight updates and retains the newest value when the old attempt is Busy', async () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		let reject!: (error: unknown) => void;
		data.update.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
		session.update({ source: 'first', sourcePath: 'Old.md' });
		await vi.waitFor(() => expect(data.update).toHaveBeenCalledOnce());
		session.update({ source: 'latest', sourcePath: 'New.md' });
		expect(data.update).toHaveBeenCalledTimes(1);
		reject({ code: 'BUSY' }); await session.prepare();
		expect(data.update).toHaveBeenCalledTimes(2);
		expect(data.update).toHaveBeenLastCalledWith({ source: 'latest', sourcePath: 'New.md' });
		session.dispose();
	});
	it('keeps accepted content after a preview failure and retries without a new save transaction', async () => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		data.update.mockRejectedValueOnce({ code: 'RENDER_FAILED' });
		session.update({ source: 'accepted' }); await session.prepare();
		expect(data.update).toHaveBeenCalledTimes(1);
		data.notify(); await session.prepare();
		expect(data.update).toHaveBeenLastCalledWith({ source: 'accepted' });
		expect(warning).toHaveBeenCalledOnce();
		session.dispose(); warning.mockRestore();
	});
	it('disposes exactly once and suppresses queued updates and subscriptions after close', async () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		session.update({ source: 'pending' }); session.dispose(); session.dispose();
		await session.prepare(); data.changed.mockClear(); data.notify();
		session.update({ source: 'late' }); await session.prepare();
		expect(data.dispose).toHaveBeenCalledOnce(); expect(data.unsubscribe).toHaveBeenCalledOnce();
		expect(data.update).not.toHaveBeenCalled(); expect(data.changed).not.toHaveBeenCalled();
		expect(session.active).toBe(false);
	});
	it('recognizes provider unload and releases the old subscription', () => {
		const data = fixture(); const session = new CodeTabSession(data.api, data.handle, data.changed);
		data.getSnapshot.mockImplementation(() => { throw failure('DISPOSED'); });
		expect(session.active).toBe(false); expect(data.unsubscribe).toHaveBeenCalledOnce();
	});
});
