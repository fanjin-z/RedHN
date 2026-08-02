import { describe, expect, it } from 'vitest';
import type { ParsedComment, ParsedStory } from '../src/redhn/hn/types';
import {
    applyOptimisticStoryFavorite,
    createOptimisticStoryFavorite,
    isStoryFavorited,
} from '../src/redhn/hn/favorites';
import {
    applyOptimisticCommentVote,
    applyOptimisticStoryVote,
    createOptimisticCommentVote,
    createOptimisticStoryVote,
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

function comment(patch: Partial<ParsedComment> = {}): ParsedComment {
    return {
        actions: {},
        children: [],
        depth: 0,
        html: 'A comment',
        id: 2001,
        text: 'A comment',
        ...patch,
    };
}

describe('HN optimistic actions', () => {
    it('round-trips optimistic voting state and score', () => {
        const voted = applyOptimisticStoryVote(
            story({
                actions: {
                    upvote: 'https://news.ycombinator.com/vote?id=1001&how=up&auth=fake-auth-token&goto=news',
                },
            }),
            createOptimisticStoryVote(
                story({
                    actions: {
                        upvote: 'https://news.ycombinator.com/vote?id=1001&how=up&auth=fake-auth-token&goto=news',
                    },
                }),
            )!,
        );

        expect(voted.score).toBe(11);
        expect(voted.actions.upvote).toBeUndefined();
        expect(voted.actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=un&auth=fake-auth-token&goto=news',
        );

        const unvoted = applyOptimisticStoryVote(
            voted,
            createOptimisticStoryVote(voted)!,
        );
        expect(unvoted.score).toBe(10);
        expect(unvoted.actions.upvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=up&auth=fake-auth-token&goto=news',
        );
        expect(unvoted.actions.unvote).toBeUndefined();
    });

    it('round-trips optimistic comment voting state without a score', () => {
        const initial = comment({
            actions: {
                upvote: 'https://news.ycombinator.com/vote?id=2001&how=up&auth=fake-auth-token&goto=item%3Fid%3D1001',
            },
        });
        const voted = applyOptimisticCommentVote(
            initial,
            createOptimisticCommentVote(initial)!,
        );

        expect(voted.actions.upvote).toBeUndefined();
        expect(voted.actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=2001&how=un&auth=fake-auth-token&goto=item%3Fid%3D1001',
        );

        const unvoted = applyOptimisticCommentVote(
            voted,
            createOptimisticCommentVote(voted)!,
        );
        expect(unvoted.actions.upvote).toBe(
            'https://news.ycombinator.com/vote?id=2001&how=up&auth=fake-auth-token&goto=item%3Fid%3D1001',
        );
        expect(unvoted.actions.unvote).toBeUndefined();
    });

    it('round-trips optimistic favorite state', () => {
        const favorited = applyOptimisticStoryFavorite(
            story({
                actions: {
                    favorite:
                        'https://news.ycombinator.com/fave?id=1001&auth=fake-auth-token',
                },
            }),
            createOptimisticStoryFavorite(
                story({
                    actions: {
                        favorite:
                            'https://news.ycombinator.com/fave?id=1001&auth=fake-auth-token',
                    },
                }),
            )!,
        );

        expect(isStoryFavorited(favorited)).toBe(true);
        expect(favorited.actions.favorite).toBeUndefined();
        expect(favorited.actions.unfavorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=fake-auth-token&un=t',
        );

        const unfavorited = applyOptimisticStoryFavorite(
            favorited,
            createOptimisticStoryFavorite(favorited)!,
        );
        expect(isStoryFavorited(unfavorited)).toBe(false);
        expect(unfavorited.actions.favorite).toBe(
            'https://news.ycombinator.com/fave?id=1001&auth=fake-auth-token',
        );
        expect(unfavorited.actions.unfavorite).toBeUndefined();
    });
});
