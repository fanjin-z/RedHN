import { describe, expect, it } from 'vitest';
import type { ParsedStory } from '../src/redhn/hn/types';
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

describe('HN optimistic story voting', () => {
    it('converts an upvote action into active state and increments score', () => {
        const currentStory = story({
            actions: {
                upvote: 'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
            },
        });
        const vote = createOptimisticStoryVote(currentStory);

        expect(vote).toMatchObject({
            href: currentStory.actions.upvote,
            score: 11,
            upvoted: true,
        });

        const nextStory = applyOptimisticStoryVote(currentStory, vote!);
        expect(nextStory.actions.upvote).toBeUndefined();
        expect(nextStory.actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=un&auth=abc&goto=news',
        );
    });

    it('converts an unvote action into inactive state and decrements score', () => {
        const currentStory = story({
            actions: {
                unvote: 'https://news.ycombinator.com/vote?id=1001&how=un&auth=abc&goto=news',
            },
        });
        const vote = createOptimisticStoryVote(currentStory);

        expect(vote).toMatchObject({
            href: currentStory.actions.unvote,
            score: 9,
            upvoted: false,
        });

        const nextStory = applyOptimisticStoryVote(currentStory, vote!);
        expect(nextStory.actions.unvote).toBeUndefined();
        expect(nextStory.actions.upvote).toBe(
            'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
        );
    });

    it('preserves vote URL query params while toggling how', () => {
        const nextHref = voteHrefForNextState(
            'https://news.ycombinator.com/vote?id=1001&how=up&auth=abc&goto=news',
            true,
        );
        const url = new URL(nextHref!);

        expect(url.searchParams.get('id')).toBe('1001');
        expect(url.searchParams.get('auth')).toBe('abc');
        expect(url.searchParams.get('goto')).toBe('news');
        expect(url.searchParams.get('how')).toBe('un');
    });

    it('keeps undefined scores undefined', () => {
        const currentStory = story({
            score: undefined,
            actions: {
                upvote: 'https://news.ycombinator.com/vote?id=1001&how=up',
            },
        });

        const vote = createOptimisticStoryVote(currentStory);

        expect(vote?.score).toBeUndefined();
    });
});
