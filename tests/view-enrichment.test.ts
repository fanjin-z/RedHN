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
            upvotedSubmissions: 'https://news.ycombinator.com/upvoted?id=PinkG',
            upvotedComments:
                'https://news.ycombinator.com/upvoted?id=PinkG&comments=t',
            favoriteComments:
                'https://news.ycombinator.com/favorites?id=PinkG&comments=t',
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

describe('API enrichment', () => {
    it('keeps parsed story fields and fills missing values from the API', () => {
        vi.stubGlobal(
            'document',
            parseHTML('<html><body></body></html>').document,
        );

        expect(
            enrichStoryWithApiItem(
                story({
                    author: 'parsed-user',
                    commentCount: 7,
                    score: 42,
                    text: 'Parsed text',
                    textHtml: '<p>Parsed text</p>',
                    type: 'story',
                }),
                item({
                    by: 'api-user',
                    descendants: 6,
                    score: 41,
                    text: 'API text',
                    title: 'API title',
                    type: 'job',
                    url: 'https://example.com/api',
                }),
            ),
        ).toMatchObject({
            author: 'parsed-user',
            commentCount: 7,
            score: 42,
            text: 'Parsed text',
            textHtml: '<p>Parsed text</p>',
            title: 'Parsed title',
            type: 'story',
            url: 'https://example.com/parsed',
        });

        expect(
            enrichStoryWithApiItem(
                story({
                    author: undefined,
                    commentCount: undefined,
                    score: undefined,
                    text: undefined,
                    textHtml: undefined,
                    title: undefined as unknown as string,
                    type: undefined,
                    url: undefined as unknown as string,
                }),
                item({
                    by: 'api-user',
                    descendants: 5,
                    score: 12,
                    text: 'Hello <i>from API</i>',
                    title: 'API title',
                    type: 'poll',
                    url: 'https://example.com/api',
                }),
            ),
        ).toMatchObject({
            author: 'api-user',
            commentCount: 5,
            score: 12,
            text: 'Hello from API',
            textHtml: 'Hello <i>from API</i>',
            title: 'API title',
            type: 'poll',
            url: 'https://example.com/api',
        });
    });

    it('keeps parsed profile fields and fills missing values from the API', () => {
        vi.stubGlobal(
            'document',
            parseHTML('<html><body></body></html>').document,
        );

        expect(
            enrichProfileWithApiUser(
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
            ),
        ).toMatchObject({
            about: 'Parsed about',
            aboutHtml: '<p>Parsed about</p>',
            createdAt: 1780065601,
            karma: 42,
        });

        expect(
            enrichProfileWithApiUser(
                profile(),
                user({
                    about: 'API <i>about</i>',
                    created: 1780065602,
                    karma: 99,
                }),
            ),
        ).toMatchObject({
            about: 'API about',
            aboutHtml: 'API <i>about</i>',
            createdAt: 1780065602,
            karma: 99,
        });
    });

    it('filters deleted and dead API items', () => {
        expect(isVisibleApiItem(item())).toBe(true);
        expect(isVisibleApiItem(item({ deleted: true }))).toBe(false);
        expect(isVisibleApiItem(item({ dead: true }))).toBe(false);
        expect(isVisibleApiItem(null)).toBe(false);
    });
});
