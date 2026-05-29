import type { HnActionMap, ParsedStory } from './types';

const HN_ORIGIN = 'https://news.ycombinator.com';

export type OptimisticStoryVote = {
    href: string;
    upvoted: boolean;
    score: ParsedStory['score'];
    upvote?: string;
    unvote?: string;
};

export function isStoryUpvoted(story: ParsedStory): boolean {
    return Boolean(story.actions.unvote);
}

export function getStoryVoteHref(story: ParsedStory): string | undefined {
    return story.actions.unvote ?? story.actions.upvote;
}

export function createOptimisticStoryVote(
    story: ParsedStory,
): OptimisticStoryVote | undefined {
    const href = getStoryVoteHref(story);
    if (!href) {
        return undefined;
    }

    const upvoted = !isStoryUpvoted(story);
    const oppositeHref = voteHrefForNextState(href, upvoted);
    if (!oppositeHref) {
        return undefined;
    }

    return {
        href,
        score:
            typeof story.score === 'number'
                ? story.score + (upvoted ? 1 : -1)
                : story.score,
        upvote: upvoted ? undefined : oppositeHref,
        unvote: upvoted ? oppositeHref : undefined,
        upvoted,
    };
}

export function applyOptimisticStoryVote(
    story: ParsedStory,
    vote: OptimisticStoryVote,
): ParsedStory {
    const actions: HnActionMap = {
        ...story.actions,
        upvote: vote.upvote,
        unvote: vote.unvote,
    };

    return {
        ...story,
        actions,
        score: vote.score,
    };
}

export function voteHrefForNextState(
    href: string,
    upvoted: boolean,
): string | undefined {
    const url = toHnVoteUrl(href);
    if (!url) {
        return undefined;
    }

    url.searchParams.set('how', upvoted ? 'un' : 'up');
    return url.href;
}

function toHnVoteUrl(href: string): URL | undefined {
    try {
        const url = new URL(href, HN_ORIGIN);
        if (url.origin !== HN_ORIGIN || url.pathname !== '/vote') {
            return undefined;
        }

        return url.searchParams.has('id') ? url : undefined;
    } catch {
        return undefined;
    }
}
