import { describe, expect, it } from 'vitest';
import { applyStoryFilters, termsFromInput } from '../src/redhn/state/filters';
import { normalizePreferences } from '../src/redhn/state/preferences';
import {
    countNewComments,
    markPageRead,
    markStoryViewed,
    type RedhnReadState,
} from '../src/redhn/state/readState';
import type { ParsedPage, ParsedStory } from '../src/redhn/hn/types';
import { getActiveSortOption } from '../src/redhn/view/sortOptions';
import {
    CURRENT_USER_CACHE_TTL_MS,
    resolveCurrentUserForPage,
    shouldClearCachedCurrentUser,
    toCachedCurrentUser,
    type CachedCurrentUser,
} from '../src/redhn/state/currentUser';

const story = (overrides: Partial<ParsedStory>): ParsedStory => ({
    id: 1,
    title: 'Show HN: Example',
    url: 'https://example.com',
    hnUrl: 'https://news.ycombinator.com/item?id=1',
    actions: {},
    ...overrides,
});

const page = (overrides: Partial<ParsedPage>): ParsedPage => ({
    capturedAt: 1,
    comments: [],
    kind: 'feed',
    pagination: {},
    sourceUrl: 'https://news.ycombinator.com/news',
    stories: [],
    ...overrides,
});

describe('RedHN state helpers', () => {
    it('treats the HN root URL as the Hacker News view', () => {
        expect(
            getActiveSortOption('https://news.ycombinator.com/')?.label,
        ).toBe('Hacker News');
    });

    it('normalizes preferences into supported ranges', () => {
        const preferences = normalizePreferences({
            theme: 'dark',
            fontSize: 99,
            lineHeight: 0,
            maxWidth: 200,
            density: 'compact',
        } as Parameters<typeof normalizePreferences>[0] & {
            density: string;
        });

        expect(preferences).toMatchObject({
            theme: 'dark',
            fontSize: 20,
            lineHeight: 1.2,
            maxWidth: 720,
        });
        expect(preferences).not.toHaveProperty('density');
    });

    it('normalizes filter input and filters stories by keywords, topics, and domains', () => {
        const stories = [
            story({ id: 1, title: 'AI tool launch', domain: 'example.com' }),
            story({
                id: 2,
                title: 'Ask HN: quiet terminals',
                domain: 'news.ycombinator.com',
            }),
            story({
                id: 3,
                title: 'Database internals',
                domain: 'sub.noisy.test',
            }),
        ];

        expect(termsFromInput('AI, ai,  github.com ,,')).toEqual([
            'ai',
            'github.com',
        ]);
        expect(
            applyStoryFilters(stories, {
                mutedKeywords: ['launch'],
                mutedDomains: ['noisy.test'],
                mutedTopics: ['ask hn'],
            }).map((item) => item.id),
        ).toEqual([]);
    });

    it('marks stories and comments as read', () => {
        const state: RedhnReadState = {
            viewedStoryIds: {},
            readCommentIds: {},
            storyCommentCounts: {},
        };
        const page: ParsedPage = {
            kind: 'item',
            sourceUrl: 'https://news.ycombinator.com/item?id=1',
            stories: [],
            post: story({ id: 1 }),
            comments: [
                {
                    id: 10,
                    depth: 0,
                    text: 'hello',
                    html: 'hello',
                    actions: {},
                    children: [
                        {
                            id: 11,
                            depth: 1,
                            text: 'reply',
                            html: 'reply',
                            actions: {},
                            children: [],
                        },
                    ],
                },
            ],
            pagination: {},
            capturedAt: 1,
        };

        expect(markStoryViewed(state, 1, 5).viewedStoryIds['1']).toBe(5);
        expect(countNewComments(state, page)).toBe(2);
        expect(markPageRead(state, page, 6)).toMatchObject({
            viewedStoryIds: { 1: 6 },
            readCommentIds: { 10: 6, 11: 6 },
            storyCommentCounts: { 1: 2 },
        });
    });

    it('caches parsed current users without logout URLs', () => {
        const cached = toCachedCurrentUser(
            {
                id: 'daanyal',
                profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
                logoutUrl: 'https://news.ycombinator.com/logout?auth=secret',
            },
            100,
        );

        expect(cached).toEqual({
            id: 'daanyal',
            profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
            cachedAt: 100,
        });
        expect(cached).not.toHaveProperty('logoutUrl');
    });

    it('uses only fresh cached users for submit pages without parsed identity', () => {
        const cached: CachedCurrentUser = {
            id: 'daanyal',
            profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
            cachedAt: 1000,
        };
        const submitPage = page({
            kind: 'submit',
            sourceUrl: 'https://news.ycombinator.com/submit',
        });

        expect(resolveCurrentUserForPage(submitPage, cached, 2000)).toEqual({
            id: 'daanyal',
            profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
        });
        expect(
            resolveCurrentUserForPage(
                submitPage,
                cached,
                1000 + CURRENT_USER_CACHE_TTL_MS + 1,
            ),
        ).toBeUndefined();
    });

    it('clears cached users on anonymous non-submit auth surfaces', () => {
        expect(shouldClearCachedCurrentUser(page({ kind: 'feed' }))).toBe(true);
        expect(shouldClearCachedCurrentUser(page({ kind: 'submit' }))).toBe(
            false,
        );
        expect(shouldClearCachedCurrentUser(page({ kind: 'auth' }))).toBe(
            false,
        );
        expect(
            shouldClearCachedCurrentUser(
                page({
                    currentUser: {
                        id: 'daanyal',
                        profileUrl:
                            'https://news.ycombinator.com/user?id=daanyal',
                    },
                }),
            ),
        ).toBe(false);
    });
});
