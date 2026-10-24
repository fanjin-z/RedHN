import { useCallback, useEffect, useRef, useState } from 'react';
import { feedUrl, fetchFeedPage } from '../hn/feed';
import type { ParsedPage, ParsedStory } from '../hn/types';
import {
    restoreFeedSession,
    saveFeedSession,
    type FeedData,
} from '../state/feedSession';

export function useStoryFeed(page: ParsedPage, ready: boolean) {
    const enabled = page.kind === 'feed';
    const [initial] = useState(() =>
        enabled ? restoreFeedSession(page) : undefined,
    );
    const [data, setData] = useState<FeedData>(
        () =>
            initial?.data ?? {
                stories: page.stories,
                more: page.pagination.more,
                loadedUrls: [page.sourceUrl],
            },
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [restoring, setRestoring] = useState(Boolean(initial));
    const feedRef = useRef<HTMLElement>(null);
    const dataRef = useRef(data);
    const savedStoriesRef = useRef(data.stories);
    const sessionIdRef = useRef(initial?.id);
    const requestRef = useRef<AbortController | null>(null);
    const activeRef = useRef(true);
    const restoringRef = useRef(restoring);

    const save = useCallback(() => {
        if (
            !enabled ||
            !sessionIdRef.current ||
            restoringRef.current ||
            document.body.style.position === 'fixed'
        ) {
            return;
        }
        const anchor = Array.from(
            feedRef.current?.querySelectorAll<HTMLElement>('[data-story-id]') ??
                [],
        ).find((story) => story.getBoundingClientRect().bottom > 64);
        saveFeedSession(
            sessionIdRef.current,
            page,
            { ...dataRef.current, stories: savedStoriesRef.current },
            {
                scrollY: window.scrollY,
                storyId: anchor ? Number(anchor.dataset.storyId) : undefined,
                offset: anchor?.getBoundingClientRect().top,
            },
        );
    }, [enabled, page]);

    const rememberStories = useCallback((stories: ParsedStory[]) => {
        savedStoriesRef.current = stories;
    }, []);

    const loadMore = useCallback(async () => {
        const current = dataRef.current;
        if (
            !enabled ||
            !ready ||
            restoringRef.current ||
            requestRef.current ||
            !current.more
        ) {
            return;
        }
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError(undefined);
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        try {
            const url = feedUrl(current.more, page.sourceUrl);
            const next = await fetchFeedPage(
                url,
                page.sourceUrl,
                controller.signal,
            );
            if (!activeRef.current || controller.signal.aborted) return;
            const loadedUrls = [...current.loadedUrls, url, next.sourceUrl];
            const more = next.pagination.more;
            if (
                more &&
                loadedUrls.some(
                    (visited) => feedUrl(visited, page.sourceUrl) === more,
                )
            ) {
                throw new Error('Hacker News returned a repeated page.');
            }
            const ids = new Set(current.stories.map((story) => story.id));
            const stories = [...current.stories];
            for (const story of next.stories) {
                if (!ids.has(story.id)) {
                    stories.push(story);
                    ids.add(story.id);
                }
            }
            const updated = {
                stories,
                more,
                loadedUrls: [...new Set(loadedUrls)],
            };
            dataRef.current = updated;
            savedStoriesRef.current = stories;
            setData(updated);
        } catch {
            if (activeRef.current) {
                setError('Couldn’t load more stories. Please try again.');
            }
        } finally {
            window.clearTimeout(timeout);
            if (requestRef.current === controller) {
                requestRef.current = null;
                if (activeRef.current) setLoading(false);
            }
        }
    }, [enabled, page.sourceUrl, ready]);

    useEffect(() => {
        activeRef.current = true;
        if (!enabled) return;
        try {
            sessionIdRef.current ??= crypto.randomUUID();
            window.history.replaceState(
                { ...window.history.state, redhnFeedId: sessionIdRef.current },
                '',
            );
        } catch {
            // History and storage support are optional for loading more stories.
        }
        let timer: number | undefined;
        const onScroll = () => {
            if (timer !== undefined) return;
            timer = window.setTimeout(() => {
                timer = undefined;
                save();
            }, 250);
        };
        const onPageHide = () => save();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pagehide', onPageHide);
        // Capture link navigation before the document is replaced, also inside
        // the shadow root (where document-level click targets are retargeted).
        const element = feedRef.current;
        element?.addEventListener('click', save, true);
        return () => {
            save();
            activeRef.current = false;
            requestRef.current?.abort();
            window.clearTimeout(timer);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pagehide', onPageHide);
            element?.removeEventListener('click', save, true);
        };
    }, [enabled, save]);

    useEffect(() => {
        if (!ready || !initial || !restoring) return;
        let frame = window.requestAnimationFrame(() => {
            frame = window.requestAnimationFrame(() => {
                const anchor = feedRef.current?.querySelector<HTMLElement>(
                    `[data-story-id="${initial.position.storyId}"]`,
                );
                const top =
                    anchor && initial.position.offset !== undefined
                        ? window.scrollY +
                          anchor.getBoundingClientRect().top -
                          initial.position.offset
                        : initial.position.scrollY;
                window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
                restoringRef.current = false;
                setRestoring(false);
            });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [initial, ready, restoring]);

    return {
        data,
        loading,
        error,
        restoring,
        feedRef,
        loadMore,
        rememberStories,
    };
}
