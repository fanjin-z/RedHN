import type { ParsedCurrentUser, ParsedPage } from '../hn/types';

export const CURRENT_USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CachedCurrentUser = Pick<ParsedCurrentUser, 'id' | 'profileUrl'> & {
    cachedAt: number;
};

export function toCachedCurrentUser(
    user: ParsedCurrentUser,
    cachedAt = Date.now(),
): CachedCurrentUser {
    return {
        id: user.id,
        profileUrl: user.profileUrl,
        cachedAt,
    };
}

export function currentUserFromCache(
    cachedUser: CachedCurrentUser | null | undefined,
    now = Date.now(),
): ParsedCurrentUser | undefined {
    if (
        !cachedUser ||
        !cachedUser.id ||
        !cachedUser.profileUrl ||
        now - cachedUser.cachedAt > CURRENT_USER_CACHE_TTL_MS
    ) {
        return undefined;
    }

    return {
        id: cachedUser.id,
        profileUrl: cachedUser.profileUrl,
    };
}

export function resolveCurrentUserForPage(
    page: ParsedPage,
    cachedUser: CachedCurrentUser | null | undefined,
    now = Date.now(),
): ParsedCurrentUser | undefined {
    if (page.currentUser) {
        return page.currentUser;
    }

    if (page.kind === 'submit') {
        return currentUserFromCache(cachedUser, now);
    }

    return undefined;
}

export function shouldClearCachedCurrentUser(page: ParsedPage): boolean {
    return !page.currentUser && page.kind !== 'submit' && page.kind !== 'auth';
}
