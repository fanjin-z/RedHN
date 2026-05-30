import { describe, expect, it } from 'vitest';
import type { ParsedStory } from '../src/redhn/hn/types';
import {
    applyOptimisticStoryFavorite,
    createOptimisticStoryFavorite,
    favoriteHrefForNextState,
    getStoryFavoriteHref,
    isStoryFavorited,
} from '../src/redhn/hn/favorites';

function story(patch: Partial<ParsedStory> = {}): ParsedStory {
    return {
        id: 1001,
        title: 'A story',
        url: 'https://example.com/story',
        hnUrl: 'https://news.ycombinator.com/item?id=1001',
        actions: {},
        ...patch,
    };
}

describe('HN optimistic story favorites', () => {
    it('converts a favorite action into active state', () => {
        const currentStory = story({
            actions: {
                favorite: 'https://news.ycombinator.com/fave?id=1001&auth=abc',
            },
        });
        const favorite = createOptimisticStoryFavorite(currentStory);

        expect(favorite).toMatchObject({
            favorited: true,
            href: currentStory.actions.favorite,
        });

        const nextStory = applyOptimisticStoryFavorite(currentStory, favorite!);
        expect(nextStory.actions.favorite).toBeUndefined();
        expect(nextStory.actions.unfavorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc&un=t',
        );
        expect(isStoryFavorited(nextStory)).toBe(true);
    });

    it('converts an un-favorite action into inactive state', () => {
        const currentStory = story({
            actions: {
                unfavorite:
                    'https://news.ycombinator.com/fave?id=1001&auth=abc&un=t',
            },
        });
        const favorite = createOptimisticStoryFavorite(currentStory);

        expect(favorite).toMatchObject({
            favorited: false,
            href: currentStory.actions.unfavorite,
        });

        const nextStory = applyOptimisticStoryFavorite(currentStory, favorite!);
        expect(nextStory.actions.unfavorite).toBeUndefined();
        expect(nextStory.actions.favorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc',
        );
        expect(getStoryFavoriteHref(nextStory)).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc',
        );
    });

    it('preserves fave query params while toggling the HN un flag', () => {
        expect(
            favoriteHrefForNextState(
                'https://news.ycombinator.com/fave?id=1001&auth=abc',
                true,
            ),
        ).toBe('https://news.ycombinator.com/fave?id=1001&auth=abc&un=t');

        expect(
            favoriteHrefForNextState(
                'https://news.ycombinator.com/fave?id=1001&un=t&auth=abc',
                false,
            ),
        ).toBe('https://news.ycombinator.com/fave?id=1001&auth=abc');
    });
});
