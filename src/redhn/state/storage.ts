import { storage } from 'wxt/utils/storage';
import { defaultFilters, type RedhnFilters } from './filters';
import { defaultPreferences, type RedhnPreferences } from './preferences';
import { defaultReadState, type RedhnReadState } from './readState';

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
