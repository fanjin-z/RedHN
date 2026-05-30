import type { HnActionMap, ParsedStory } from './types';

const HN_ORIGIN = 'https://news.ycombinator.com';

export type OptimisticStoryFavorite = {
    href: string;
    favorited: boolean;
    favorite?: string;
    unfavorite?: string;
};

export function isStoryFavorited(story: ParsedStory): boolean {
    return Boolean(story.actions.unfavorite);
}

export function getStoryFavoriteHref(story: ParsedStory): string | undefined {
    return story.actions.unfavorite ?? story.actions.favorite;
}

export function createOptimisticStoryFavorite(
    story: ParsedStory,
): OptimisticStoryFavorite | undefined {
    const href = getStoryFavoriteHref(story);
    if (!href) {
        return undefined;
    }

    const favorited = !isStoryFavorited(story);
    const oppositeHref = favoriteHrefForNextState(href, favorited);
    if (!oppositeHref) {
        return undefined;
    }

    return {
        href,
        favorite: favorited ? undefined : oppositeHref,
        favorited,
        unfavorite: favorited ? oppositeHref : undefined,
    };
}

export function applyOptimisticStoryFavorite(
    story: ParsedStory,
    favorite: OptimisticStoryFavorite,
): ParsedStory {
    const actions: HnActionMap = {
        ...story.actions,
        favorite: favorite.favorite,
        unfavorite: favorite.unfavorite,
    };

    return {
        ...story,
        actions,
    };
}

export function favoriteHrefForNextState(
    href: string,
    favorited: boolean,
): string | undefined {
    try {
        const url = new URL(href, HN_ORIGIN);
        if (url.origin !== HN_ORIGIN || url.pathname !== '/fave') {
            return undefined;
        }

        if (favorited) {
            url.searchParams.set('un', 't');
        } else {
            url.searchParams.delete('un');
        }

        return url.href;
    } catch {
        return undefined;
    }
}
