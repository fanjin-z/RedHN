import { storage } from 'wxt/utils/storage';
import type { HnApiItem, HnApiUser } from '../api/hnApi';
import type { CachedCurrentUser } from './currentUser';
import { defaultFilters, type RedhnFilters } from './filters';
import { defaultPreferences, type RedhnPreferences } from './preferences';
import { defaultReadState, type RedhnReadState } from './readState';

export const extensionEnabledItem = storage.defineItem<boolean>(
    'local:redhn.enabled',
    {
        fallback: true,
    },
);

export const preferencesItem = storage.defineItem<RedhnPreferences>(
    'local:redhn.preferences',
    {
        fallback: defaultPreferences,
    },
);

export const readStateItem = storage.defineItem<RedhnReadState>(
    'local:redhn.readState',
    {
        fallback: defaultReadState,
    },
);

export const filtersItem = storage.defineItem<RedhnFilters>(
    'local:redhn.filters',
    {
        fallback: defaultFilters,
    },
);

export const savedStoryIdsItem = storage.defineItem<number[]>(
    'local:redhn.savedStoryIds',
    {
        fallback: [],
    },
);

export const currentUserItem = storage.defineItem<CachedCurrentUser | null>(
    'local:redhn.currentUser',
    {
        fallback: null,
    },
);

export type RedhnApiCache = Record<
    string,
    {
        item: HnApiItem | null;
        cachedAt: number;
    }
>;

export const apiCacheItem = storage.defineItem<RedhnApiCache>(
    'local:redhn.apiCache',
    {
        fallback: {},
    },
);

export type RedhnUserCache = Record<
    string,
    {
        user: HnApiUser | null;
        cachedAt: number;
    }
>;

export const userCacheItem = storage.defineItem<RedhnUserCache>(
    'local:redhn.userCache',
    {
        fallback: {},
    },
);
