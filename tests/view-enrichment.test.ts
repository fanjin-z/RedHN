import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HnApiItem } from '../src/redhn/api/hnApi';
import type { ParsedStory } from '../src/redhn/hn/types';
import { enrichStoryWithApiItem } from '../src/redhn/view/enrichment';

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

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('story API enrichment', () => {
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
