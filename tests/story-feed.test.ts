import { act, createElement, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DOMParser, parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoryFeed } from '../src/redhn/components/StoryFeed';
import { useStoryFeed } from '../src/redhn/components/useStoryFeed';
import { parseHnPage } from '../src/redhn/hn/parser';
import { defaultReadState } from '../src/redhn/state/readState';
import { restoreFeedSession } from '../src/redhn/state/feedSession';

const sourceUrl = 'https://news.ycombinator.com/news';
const secondUrl = `${sourceUrl}?p=2`;

function feedHtml(ids: number[], more?: string): string {
    return `<html><body><table class="itemlist">${ids
        .map(
            (id) => `
        <tr class="athing" id="${id}">
            <td class="votelinks"><a href="vote?id=${id}&amp;how=up">vote</a></td>
            <td><span class="titleline"><a href="https://example.com/${id}">Story ${id}</a></span></td>
        </tr><tr><td class="subtext"><span class="score">10 points</span></td></tr>
    `,
        )
        .join(
            '',
        )}${more ? `<tr><td><a class="morelink" href="${more.replaceAll('&', '&amp;')}">More</a></td></tr>` : ''}</table></body></html>`;
}

function response(html: string, url = secondUrl, status = 200): Response {
    const result = new Response(html, { status });
    Object.defineProperty(result, 'url', { value: url });
    return result;
}

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        get length() {
            return values.size;
        },
        key: (index: number) => [...values.keys()][index] ?? null,
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
        removeItem: (key: string) => {
            values.delete(key);
        },
    };
}

const roots: Root[] = [];
afterEach(async () => {
    for (const root of roots.splice(0)) await act(async () => root.unmount());
    vi.unstubAllGlobals();
});

async function setup(options: { source?: string; more?: string } = {}) {
    const { document, window } = parseHTML('<html><body></body></html>');
    const storage = memoryStorage();
    const navigation = { type: 'navigate' };
    const history = {
        state: {} as Record<string, unknown>,
        replaceState: vi.fn((state: Record<string, unknown>) => {
            history.state = state;
        }),
    };
    const observers: Array<{ notify: () => void; active: boolean }> = [];
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', window);
    vi.stubGlobal('DOMParser', DOMParser);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('history', history);
    vi.stubGlobal('performance', { getEntriesByType: () => [navigation] });
    vi.stubGlobal('scrollY', 0);
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.set(++frameId, callback);
        return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            observer;
            constructor(callback: IntersectionObserverCallback) {
                this.observer = {
                    active: true,
                    notify: () =>
                        callback(
                            [
                                {
                                    isIntersecting: true,
                                } as IntersectionObserverEntry,
                            ],
                            this as unknown as IntersectionObserver,
                        ),
                };
                observers.push(this.observer);
            }
            observe() {}
            disconnect() {
                this.observer.active = false;
            }
        },
    );

    const page = parseHnPage(
        parseHTML(feedHtml([1, 2], options.more ?? secondUrl)).document,
        options.source ?? sourceUrl,
    );
    let last!: ReturnType<typeof useStoryFeed>;
    let ready = true;
    let maximumVisibleId = Infinity;
    const onVote = vi.fn();
    function Feed() {
        const feed = useStoryFeed(page, ready);
        last = feed;
        useEffect(
            () => feed.rememberStories(feed.data.stories),
            [feed.data.stories, feed.rememberStories],
        );
        const stories = feed.data.stories.filter(
            (story) => story.id <= maximumVisibleId,
        );
        return createElement(StoryFeed, {
            page,
            stories,
            hiddenStoryCount: feed.data.stories.length - stories.length,
            readState: defaultReadState,
            pendingVoteStoryIds: new Set<number>(),
            onShare: () => undefined,
            onStoryView: () => undefined,
            onHnAction: () => undefined,
            onVote,
            feedRef: feed.feedRef,
            loading: feed.loading,
            loadError: feed.error,
            more: feed.data.more,
            ready: ready && !feed.restoring,
            onLoadMore: feed.loadMore,
        });
    }
    let root: Root;
    let container: HTMLElement;
    const render = async () => {
        await act(async () =>
            root.render(createElement(StrictMode, null, createElement(Feed))),
        );
    };
    const mount = async () => {
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        roots.push(root);
        await render();
    };
    const unmount = async () => {
        roots.splice(roots.indexOf(root), 1);
        await act(async () => root.unmount());
        container.remove();
    };
    await mount();
    return {
        page,
        fetcher,
        history,
        navigation,
        storage,
        observers,
        frames,
        onVote,
        get feed() {
            return last;
        },
        get container() {
            return container;
        },
        ids: () => last.data.stories.map((story) => story.id),
        autoLoad: async () => {
            const observer = observers.findLast((item) => item.active);
            expect(observer).toBeDefined();
            await act(async () => observer!.notify());
        },
        setReady: async (value: boolean) => {
            ready = value;
            await render();
        },
        filter: async (id: number) => {
            maximumVisibleId = id;
            await render();
        },
        mount,
        unmount,
    };
}

describe('infinite story feed', () => {
    it.each(['populated', 'empty'])(
        'loads one request at a time, follows HN cursors, deduplicates overlapping pages and stops at a %s final page',
        async (terminal) => {
            const ui = await setup({
                source: 'https://news.ycombinator.com/newest',
                more: 'https://news.ycombinator.com/newest?next=20&n=31',
            });
            let finish!: (value: Response) => void;
            ui.fetcher.mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        finish = resolve;
                    }),
            );
            await ui.autoLoad();
            await act(async () => {
                void ui.feed.loadMore();
                void ui.feed.loadMore();
            });
            expect(ui.fetcher).toHaveBeenCalledTimes(1);
            expect(ui.fetcher.mock.calls[0]).toMatchObject([
                'https://news.ycombinator.com/newest?next=20&n=31',
                { credentials: 'include' },
            ]);
            const next = 'https://news.ycombinator.com/newest?next=10&n=61';
            await act(async () =>
                finish(
                    response(
                        feedHtml([2, 3, 3], next),
                        String(ui.fetcher.mock.calls[0]![0]),
                    ),
                ),
            );
            expect(ui.ids()).toEqual([1, 2, 3]);
            await act(async () =>
                ui.container
                    .querySelector<HTMLButtonElement>(
                        '[data-story-id="3"] button[aria-label="Log in to upvote"]',
                    )!
                    .click(),
            );
            expect(ui.onVote).toHaveBeenCalledWith(
                expect.objectContaining({ id: 3 }),
            );
            ui.fetcher.mockResolvedValueOnce(
                response(feedHtml(terminal === 'empty' ? [] : [4]), next),
            );
            await ui.autoLoad();
            expect(ui.fetcher.mock.calls[1]![0]).toBe(next);
            expect(ui.ids()).toEqual(
                terminal === 'empty' ? [1, 2, 3] : [1, 2, 3, 4],
            );
            expect(ui.container.textContent).toContain('No more stories.');
            expect(ui.observers.some((observer) => observer.active)).toBe(
                false,
            );
            expect(
                ui.history.replaceState.mock.calls
                    .map((call) => Array.from(call))
                    .every((call) => call.length === 2),
            ).toBe(true);
        },
    );

    it.each(['network', 'http', 'login', 'repeated', 'foreign redirect'])(
        'keeps the feed and retries the same URL after a %s failure',
        async (failure) => {
            const ui = await setup();
            if (failure === 'network')
                ui.fetcher.mockRejectedValueOnce(new Error('Offline'));
            else
                ui.fetcher.mockResolvedValueOnce(
                    failure === 'http'
                        ? response('Unavailable', secondUrl, 503)
                        : failure === 'login'
                          ? response(
                                '<form action="login"><input name="acct"></form>',
                            )
                          : failure === 'foreign redirect'
                            ? response(
                                  feedHtml([3]),
                                  'https://example.com/news',
                              )
                            : response(feedHtml([3], secondUrl)),
                );
            await ui.autoLoad();
            expect(ui.ids()).toEqual([1, 2]);
            expect(ui.feed.error).toBeDefined();
            expect(ui.observers.some((observer) => observer.active)).toBe(
                false,
            );
            expect(
                ui.container.querySelector<HTMLAnchorElement>(
                    '.redhn-feed__more a',
                )!.href,
            ).toBe(secondUrl);
            ui.fetcher.mockResolvedValueOnce(response(feedHtml([3])));
            await act(async () =>
                ui.container
                    .querySelector<HTMLButtonElement>(
                        '.redhn-feed__more button',
                    )!
                    .click(),
            );
            expect(ui.fetcher.mock.calls.map(([url]) => url)).toEqual([
                secondUrl,
                secondUrl,
            ]);
            expect(ui.ids()).toEqual([1, 2, 3]);
            expect(ui.feed.error).toBeUndefined();
        },
    );

    it('pauses automatic loading after three fully filtered batches and allows manual continuation', async () => {
        const ui = await setup();
        await ui.filter(2);
        for (let page = 2; page <= 4; page++) {
            ui.fetcher.mockResolvedValueOnce(
                response(
                    feedHtml([page + 1], `${sourceUrl}?p=${page + 1}`),
                    `${sourceUrl}?p=${page}`,
                ),
            );
            await ui.autoLoad();
        }
        expect(ui.fetcher).toHaveBeenCalledTimes(3);
        expect(ui.observers.some((observer) => observer.active)).toBe(false);
        ui.fetcher.mockResolvedValueOnce(
            response(feedHtml([6]), `${sourceUrl}?p=5`),
        );
        await act(async () =>
            ui.container
                .querySelector<HTMLButtonElement>('.redhn-feed__more button')!
                .click(),
        );
        expect(ui.fetcher).toHaveBeenCalledTimes(4);
    });

    it('restores loaded stories and the reading anchor on Back after preferences are ready', async () => {
        const ui = await setup();
        ui.fetcher.mockResolvedValueOnce(
            response(feedHtml([3, 4], `${sourceUrl}?p=3`)),
        );
        await ui.autoLoad();
        vi.stubGlobal('scrollY', 800);
        const story = ui.container.querySelector<HTMLElement>(
            '[data-story-id="3"]',
        )!;
        story.getBoundingClientRect = () =>
            ({ top: 80, bottom: 280 }) as DOMRect;
        window.dispatchEvent(new window.Event('pagehide'));
        const entryId = ui.history.state.redhnFeedId;
        await ui.setReady(false);
        await ui.unmount();
        ui.navigation.type = 'back_forward';
        vi.stubGlobal('scrollY', 0);
        await ui.mount();
        expect(ui.ids()).toEqual([1, 2, 3, 4]);
        expect(ui.feed.restoring).toBe(true);
        expect(ui.history.state.redhnFeedId).toBe(entryId);
        expect(ui.observers.some((observer) => observer.active)).toBe(false);
        ui.container.querySelector<HTMLElement>(
            '[data-story-id="3"]',
        )!.getBoundingClientRect = () =>
            ({ top: 880, bottom: 1080 }) as DOMRect;
        await ui.setReady(true);
        await act(async () => {
            for (let index = 0; index < 2; index++) {
                const pending = [...ui.frames.values()];
                ui.frames.clear();
                pending.forEach((callback) => callback(0));
            }
        });
        expect(window.scrollTo).toHaveBeenLastCalledWith({
            top: 800,
            behavior: 'instant',
        });
        expect(ui.feed.restoring).toBe(false);
        ui.fetcher.mockResolvedValueOnce(
            response(feedHtml([5]), `${sourceUrl}?p=3`),
        );
        await ui.autoLoad();
        expect(ui.fetcher.mock.calls[1]![0]).toBe(`${sourceUrl}?p=3`);
    });

    it('ignores snapshots on reload, other history entries, account changes, and expired sessions', async () => {
        const ui = await setup();
        window.dispatchEvent(new window.Event('pagehide'));
        ui.navigation.type = 'reload';
        expect(restoreFeedSession(ui.page)).toBeUndefined();
        ui.navigation.type = 'back_forward';
        expect(restoreFeedSession(ui.page)).toBeDefined();
        expect(
            restoreFeedSession({
                ...ui.page,
                currentUser: { id: 'other', profileUrl: '' },
            }),
        ).toBeUndefined();
        const id = ui.history.state.redhnFeedId;
        ui.history.state = { redhnFeedId: 'another-entry' };
        expect(restoreFeedSession(ui.page)).toBeUndefined();
        ui.history.state = { redhnFeedId: id };
        const key = ui.storage.key(0)!;
        const saved = JSON.parse(ui.storage.getItem(key)!);
        ui.storage.setItem(
            key,
            JSON.stringify({ ...saved, savedAt: Date.now() - 31 * 60 * 1000 }),
        );
        expect(restoreFeedSession(ui.page)).toBeUndefined();
    });

    it('aborts an in-flight page request when the feed is removed', async () => {
        const ui = await setup();
        ui.fetcher.mockImplementationOnce(() => new Promise(() => {}));
        await ui.autoLoad();
        const signal = ui.fetcher.mock.calls[0]![1]!.signal;
        await ui.unmount();
        expect(signal!.aborted).toBe(true);
    });
});
