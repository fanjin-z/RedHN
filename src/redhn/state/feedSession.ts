import type { ParsedPage, ParsedStory } from '../hn/types';

const PREFIX = 'redhn.feed.';
const MAX_AGE = 30 * 60 * 1000;
const MAX_SNAPSHOTS = 5;

export type FeedData = {
    stories: ParsedStory[];
    more?: string;
    loadedUrls: string[];
};

export type FeedPosition = {
    scrollY: number;
    storyId?: number;
    offset?: number;
};

type FeedSnapshot = FeedData & {
    version: 1;
    sourceUrl: string;
    userId?: string;
    savedAt: number;
    position: FeedPosition;
};

export function restoreFeedSession(
    page: ParsedPage,
): { id: string; data: FeedData; position: FeedPosition } | undefined {
    try {
        const navigation = performance.getEntriesByType('navigation')[0] as
            PerformanceNavigationTiming | undefined;
        const id = window.history.state?.redhnFeedId;
        // A refresh starts a fresh feed. Each history entry has its own snapshot.
        if (navigation?.type !== 'back_forward' || typeof id !== 'string') {
            return;
        }
        const saved: FeedSnapshot = JSON.parse(
            window.sessionStorage.getItem(PREFIX + id) ?? 'null',
        );
        if (
            !saved ||
            saved.version !== 1 ||
            saved.sourceUrl !== page.sourceUrl ||
            saved.userId !== page.currentUser?.id ||
            !Number.isFinite(saved.savedAt) ||
            Date.now() - saved.savedAt > MAX_AGE ||
            !Array.isArray(saved.stories) ||
            !saved.stories.every(isSavedStory) ||
            !Array.isArray(saved.loadedUrls) ||
            !saved.loadedUrls.every((url) => typeof url === 'string') ||
            (saved.more !== undefined && typeof saved.more !== 'string') ||
            !saved.position ||
            !Number.isFinite(saved.position.scrollY) ||
            (saved.position.storyId !== undefined &&
                !Number.isSafeInteger(saved.position.storyId)) ||
            (saved.position.offset !== undefined &&
                !Number.isFinite(saved.position.offset))
        ) {
            return;
        }
        return { id, data: saved, position: saved.position };
    } catch {
        // Storage may be unavailable, full, or contain an older snapshot format.
        return;
    }
}

export function saveFeedSession(
    id: string,
    page: ParsedPage,
    data: FeedData,
    position: FeedPosition,
): void {
    try {
        const storage = window.sessionStorage;
        const keys = Array.from({ length: storage.length }, (_, index) =>
            storage.key(index),
        ).filter((key): key is string => Boolean(key?.startsWith(PREFIX)));
        const others = keys
            .filter((key) => key !== PREFIX + id)
            .map((key) => {
                try {
                    return {
                        key,
                        savedAt: JSON.parse(storage.getItem(key)!).savedAt ?? 0,
                    };
                } catch {
                    return { key, savedAt: 0 };
                }
            })
            .sort((a, b) => b.savedAt - a.savedAt);
        others.forEach(({ key, savedAt }, index) => {
            if (index >= MAX_SNAPSHOTS - 1 || Date.now() - savedAt > MAX_AGE) {
                storage.removeItem(key);
            }
        });

        const snapshot: FeedSnapshot = {
            ...data,
            version: 1,
            sourceUrl: page.sourceUrl,
            userId: page.currentUser?.id,
            savedAt: Date.now(),
            position,
        };
        storage.setItem(PREFIX + id, JSON.stringify(snapshot));
    } catch {
        // Loading and navigation must still work if session storage is blocked.
    }
}

function isSavedStory(value: unknown): value is ParsedStory {
    if (!value || typeof value !== 'object') return false;
    const story = value as ParsedStory;
    return (
        Number.isSafeInteger(story.id) &&
        ['title', 'url', 'hnUrl'].every(
            (key) => typeof story[key as keyof ParsedStory] === 'string',
        ) &&
        ['domain', 'author', 'age', 'text', 'textHtml', 'type'].every(
            (key) =>
                story[key as keyof ParsedStory] === undefined ||
                typeof story[key as keyof ParsedStory] === 'string',
        ) &&
        ['rank', 'score', 'commentCount'].every(
            (key) =>
                story[key as keyof ParsedStory] === undefined ||
                Number.isFinite(story[key as keyof ParsedStory]),
        ) &&
        Boolean(story.actions && typeof story.actions === 'object') &&
        Object.values(story.actions).every((href) => typeof href === 'string')
    );
}
