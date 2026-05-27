import {
    fetchHnItem,
    fetchHnItems,
    fetchHnUpdates,
} from '../src/redhn/api/hnApi';
import {
    isRedhnBackgroundRequest,
    type RedhnBackgroundRequest,
    type RedhnBackgroundResponse,
} from '../src/redhn/api/messages';
import { apiCacheItem } from '../src/redhn/state/storage';

function registerRuntimeHooks(): void {
    browser.runtime.onInstalled.addListener(() => {
        console.info('RedHN installed successfully.');
    });

    browser.runtime.onMessage.addListener((message) => {
        if (!isRedhnBackgroundRequest(message)) {
            return undefined;
        }

        return handleRedhnRequest(message);
    });
}

export default defineBackground(() => {
    registerRuntimeHooks();
});

async function handleRedhnRequest(
    request: RedhnBackgroundRequest,
): Promise<RedhnBackgroundResponse<unknown>> {
    try {
        if (request.type === 'redhn:getItem') {
            const data = await getCachedItem(request.id);
            return { ok: true, data };
        }

        if (request.type === 'redhn:getItems') {
            const data = await getCachedItems(request.ids);
            return { ok: true, data };
        }

        const data = await fetchHnUpdates();
        return { ok: true, data };
    } catch (error) {
        return {
            ok: false,
            error:
                error instanceof Error ? error.message : 'Unknown RedHN error',
        };
    }
}

async function getCachedItem(id: number) {
    const cached = await apiCacheItem.getValue();
    const cachedEntry = cached[id];
    if (cachedEntry && Date.now() - cachedEntry.cachedAt < 5 * 60 * 1000) {
        return cachedEntry.item;
    }

    const item = await fetchHnItem(id);
    await apiCacheItem.setValue({
        ...cached,
        [id]: {
            item,
            cachedAt: Date.now(),
        },
    });
    return item;
}

async function getCachedItems(ids: number[]) {
    const cached = await apiCacheItem.getValue();
    const now = Date.now();
    const freshEntries = Object.fromEntries(
        ids
            .map((id) => [id, cached[id]] as const)
            .filter(
                ([, entry]) => entry && now - entry.cachedAt < 5 * 60 * 1000,
            )
            .map(([id, entry]) => [id, entry.item]),
    );
    const missingIds = ids.filter((id) => !(id in freshEntries));
    const fetchedEntries =
        missingIds.length > 0 ? await fetchHnItems(missingIds) : {};

    if (missingIds.length > 0) {
        await apiCacheItem.setValue({
            ...cached,
            ...Object.fromEntries(
                Object.entries(fetchedEntries).map(([id, item]) => [
                    id,
                    {
                        item,
                        cachedAt: now,
                    },
                ]),
            ),
        });
    }

    return {
        ...freshEntries,
        ...fetchedEntries,
    };
}
