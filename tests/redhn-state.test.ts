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

const story = (overrides: Partial<ParsedStory>): ParsedStory => ({
    id: 1,
    title: 'Show HN: Example',
    url: 'https://example.com',
    hnUrl: 'https://news.ycombinator.com/item?id=1',
    actions: {},
    ...overrides,
});

describe('RedHN state helpers', () => {
    it('normalizes preferences into supported ranges', () => {
        expect(
            normalizePreferences({
                theme: 'dark',
                fontSize: 99,
                lineHeight: 0,
                maxWidth: 200,
                density: 'compact',
            }),
        ).toMatchObject({
            theme: 'dark',
            fontSize: 20,
            lineHeight: 1.2,
            maxWidth: 720,
            density: 'compact',
        });
    });

    it('filters stories by keywords, topics, and domains', () => {
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

        expect(
            applyStoryFilters(stories, {
                mutedKeywords: ['launch'],
                mutedDomains: ['noisy.test'],
                mutedTopics: ['ask hn'],
            }).map((item) => item.id),
        ).toEqual([]);
    });

    it('parses comma-separated filter input', () => {
        expect(termsFromInput('AI, ai,  github.com ,,')).toEqual([
            'ai',
            'github.com',
        ]);
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
});
