import { describe, expect, it } from 'vitest';
import type { ParsedStory } from '../src/redhn/hn/types';
import {
    applyOptimisticStoryFavorite,
    createOptimisticStoryFavorite,
    favoriteHrefForNextState,
    isStoryFavorited,
} from '../src/redhn/hn/favorites';
import {
    applyOptimisticStoryVote,
    createOptimisticStoryVote,
    voteHrefForNextState,
} from '../src/redhn/hn/votes';

function story(patch: Partial<ParsedStory> = {}): ParsedStory {
    return {
        id: 1001,
        title: 'A story',
        url: 'https://example.com/story',
        hnUrl: 'https://news.ycombinator.com/item?id=1001',
        score: 10,
        actions: {},
        ...patch,
    };
}

describe('HN optimistic story actions', () => {
    it('round-trips optimistic voting state and score', () => {
        const voted = applyOptimisticStoryVote(
            story({
                actions: {
                    upvote: 'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
                },
            }),
            createOptimisticStoryVote(
                story({
                    actions: {
                        upvote: 'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
                    },
                }),
            )!,
        );

        expect(voted.score).toBe(11);
        expect(voted.actions.upvote).toBeUndefined();
        expect(voted.actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=un&auth=abc&goto=news',
        );

        const unvoted = applyOptimisticStoryVote(
            voted,
            createOptimisticStoryVote(voted)!,
        );
        expect(unvoted.score).toBe(10);
        expect(unvoted.actions.upvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
        );
        expect(unvoted.actions.unvote).toBeUndefined();
    });

    it('round-trips optimistic favorite state', () => {
        const favorited = applyOptimisticStoryFavorite(
            story({
                actions: {
                    favorite:
                        'https://news.ycombinator.com/fave?id=1001&auth=abc',
                },
            }),
            createOptimisticStoryFavorite(
                story({
                    actions: {
                        favorite:
                            'https://news.ycombinator.com/fave?id=1001&auth=abc',
                    },
                }),
            )!,
        );

        expect(isStoryFavorited(favorited)).toBe(true);
        expect(favorited.actions.favorite).toBeUndefined();
        expect(favorited.actions.unfavorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc&un=t',
        );

        const unfavorited = applyOptimisticStoryFavorite(
            favorited,
            createOptimisticStoryFavorite(favorited)!,
        );
        expect(isStoryFavorited(unfavorited)).toBe(false);
        expect(unfavorited.actions.favorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=abc',
        );
        expect(unfavorited.actions.unfavorite).toBeUndefined();
    });

    it('preserves HN query params while toggling action URLs', () => {
        const voteUrl = new URL(
            voteHrefForNextState(
                'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
                true,
            )!,
        );

        expect(voteUrl.searchParams.get('id')).toBe('1001');
        expect(voteUrl.searchParams.get('auth')).toBe('abc');
        expect(voteUrl.searchParams.get('goto')).toBe('news');
        expect(voteUrl.searchParams.get('how')).toBe('un');
        expect(
            favoriteHrefForNextState(
                'https://news.ycombinator.com/fave?id=1001&un=t&auth=abc',
                false,
            ),
        ).toBe('https://news.ycombinator.com/fave?id=1001&auth=abc');
    });
});
