import { describe, expect, it } from 'vitest';
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
});
