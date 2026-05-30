import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HnApiItem, HnApiUser } from '../src/redhn/api/hnApi';
import type { ParsedProfile, ParsedStory } from '../src/redhn/hn/types';
import {
    enrichProfileWithApiUser,
    enrichStoryWithApiItem,
    isVisibleApiItem,
} from '../src/redhn/view/enrichment';

function story(patch: Partial<ParsedStory> = {}): ParsedStory {
    return {
        id: 1001,
        title: 'Parsed title',
        url: 'https://example.com/parsed',
        hnUrl: 'https://news.ycombinator.com/item?id=1001',
        actions: {},
        ...patch,
    };
}

function item(patch: Partial<HnApiItem> = {}): HnApiItem {
    return {
        id: 1001,
        type: 'story',
        ...patch,
    };
}

function profile(patch: Partial<ParsedProfile> = {}): ParsedProfile {
    return {
        id: 'PinkG',
        tab: 'overview',
        links: {
            profile: 'https://news.ycombinator.com/user?id=PinkG',
            submitted: 'https://news.ycombinator.com/submitted?id=PinkG',
            comments: 'https://news.ycombinator.com/threads?id=PinkG',
            favorites: 'https://news.ycombinator.com/favorites?id=PinkG',
        },
        ...patch,
    };
}

function user(patch: Partial<HnApiUser> = {}): HnApiUser {
    return {
        id: 'PinkG',
        ...patch,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('story API enrichment', () => {
    it('keeps parsed title, url, and author ahead of API values', () => {
        const enriched = enrichStoryWithApiItem(
            story({ author: 'parsed-user' }),
            item({
                by: 'api-user',
                title: 'API title',
                url: 'https://example.com/api',
            }),
        );

        expect(enriched.title).toBe('Parsed title');
        expect(enriched.url).toBe('https://example.com/parsed');
        expect(enriched.author).toBe('parsed-user');
    });

    it('uses API title, url, and author when parsed values are missing', () => {
        const enriched = enrichStoryWithApiItem(
            story({
                author: undefined,
                title: undefined as unknown as string,
                url: undefined as unknown as string,
            }),
            item({
                by: 'api-user',
                title: 'API title',
                url: 'https://example.com/api',
            }),
        );

        expect(enriched.title).toBe('API title');
        expect(enriched.url).toBe('https://example.com/api');
        expect(enriched.author).toBe('api-user');
    });

    it('keeps parsed story scores ahead of stale API scores', () => {
        const enriched = enrichStoryWithApiItem(
            story({ score: 42 }),
            item({ score: 41 }),
        );

        expect(enriched.score).toBe(42);
    });

    it('keeps parsed comment counts ahead of stale API descendants', () => {
        const enriched = enrichStoryWithApiItem(
            story({ commentCount: 7 }),
            item({ descendants: 6 }),
        );

        expect(enriched.commentCount).toBe(7);
    });

    it('uses API counts when parsed story values are missing', () => {
        const enriched = enrichStoryWithApiItem(
            story({ score: undefined, commentCount: undefined }),
            item({ score: 12, descendants: 5 }),
        );

        expect(enriched.score).toBe(12);
        expect(enriched.commentCount).toBe(5);
    });

    it('uses API item type and text when parsed story values are missing', () => {
        vi.stubGlobal(
            'document',
            parseHTML('<html><body></body></html>').document,
        );

        const enriched = enrichStoryWithApiItem(
            story({ text: undefined, textHtml: undefined, type: undefined }),
            item({
                text: 'Hello <i>from API</i>',
                type: 'poll',
            }),
        );

        expect(enriched.type).toBe('poll');
        expect(enriched.textHtml).toBe('Hello <i>from API</i>');
        expect(enriched.text).toBe('Hello from API');
    });

    it('keeps parsed item type and text ahead of API fallback values', () => {
        const enriched = enrichStoryWithApiItem(
            story({
                text: 'Parsed text',
                textHtml: '<p>Parsed text</p>',
                type: 'story',
            }),
            item({
                text: 'API text',
                type: 'job',
            }),
        );

        expect(enriched.type).toBe('story');
        expect(enriched.textHtml).toBe('<p>Parsed text</p>');
        expect(enriched.text).toBe('Parsed text');
    });

    it('preserves parsed HN favorite actions over API item data', () => {
        const actions = {
            unfavorite: 'https://news.ycombinator.com/fave?id=1001&auth=abc',
        };
        const enriched = enrichStoryWithApiItem(
            story({ actions }),
            item({ title: 'API title' }),
        );

        expect(enriched.actions).toBe(actions);
        expect(enriched.actions.unfavorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc',
        );
        expect(enriched.actions.favorite).toBeUndefined();
    });
});

describe('profile API enrichment', () => {
    it('keeps parsed profile fields ahead of API values', () => {
        const enriched = enrichProfileWithApiUser(
            profile({
                about: 'Parsed about',
                aboutHtml: '<p>Parsed about</p>',
                createdAt: 1780065601,
                karma: 42,
            }),
            user({
                about: 'API <i>about</i>',
                created: 1780065602,
                karma: 99,
            }),
        );

        expect(enriched.createdAt).toBe(1780065601);
        expect(enriched.karma).toBe(42);
        expect(enriched.about).toBe('Parsed about');
        expect(enriched.aboutHtml).toBe('<p>Parsed about</p>');
    });

    it('uses API profile fields when parsed values are missing', () => {
        vi.stubGlobal(
            'document',
            parseHTML('<html><body></body></html>').document,
        );

        const enriched = enrichProfileWithApiUser(
            profile(),
            user({
                about: 'API <i>about</i>',
                created: 1780065602,
                karma: 99,
            }),
        );

        expect(enriched.createdAt).toBe(1780065602);
        expect(enriched.karma).toBe(99);
        expect(enriched.about).toBe('API about');
        expect(enriched.aboutHtml).toBe('API <i>about</i>');
    });
});

describe('API-only item visibility', () => {
    it('filters deleted and dead API items', () => {
        expect(isVisibleApiItem(item())).toBe(true);
        expect(isVisibleApiItem(item({ deleted: true }))).toBe(false);
        expect(isVisibleApiItem(item({ dead: true }))).toBe(false);
        expect(isVisibleApiItem(null)).toBe(false);
    });
});
