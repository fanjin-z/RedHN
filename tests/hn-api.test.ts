import { describe, expect, it } from 'vitest';
import {
    fetchHnItem,
    fetchHnItems,
    fetchHnUpdates,
} from '../src/redhn/api/hnApi';
import { isRedhnBackgroundRequest } from '../src/redhn/api/messages';

const response = (data: unknown, ok = true, status = 200): Response =>
    ({
        ok,
        status,
        json: async () => data,
    }) as Response;

describe('HN API client', () => {
    it('fetches one item from the official API shape', async () => {
        const item = await fetchHnItem(123, async (url) => {
            expect(url).toBe(
                'https://hacker-news.firebaseio.com/v0/item/123.json',
            );
            return response({ id: 123, title: 'Hello', descendants: 3 });
        });

        expect(item).toMatchObject({ id: 123, descendants: 3 });
    });

    it('deduplicates item batch requests', async () => {
        const urls: string[] = [];
        const items = await fetchHnItems([1, 1, 2], async (url) => {
            urls.push(String(url));
            return response({
                id: Number(String(url).match(/item\/(\d+)/)?.[1]),
            });
        });

        expect(urls).toHaveLength(2);
        expect(items[1]?.id).toBe(1);
        expect(items[2]?.id).toBe(2);
    });

    it('fetches updates and rejects failed responses', async () => {
        await expect(
            fetchHnUpdates(async () => response({ items: [1], profiles: [] })),
        ).resolves.toEqual({ items: [1], profiles: [] });
        await expect(
            fetchHnUpdates(async () => response({}, false, 500)),
        ).rejects.toThrow('500');
    });
});

describe('background message guards', () => {
    it('accepts only supported RedHN API messages', () => {
        expect(isRedhnBackgroundRequest({ type: 'redhn:getItem', id: 1 })).toBe(
            true,
        );
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:getItems', ids: [1, 2] }),
        ).toBe(true);
        expect(isRedhnBackgroundRequest({ type: 'redhn:getUpdates' })).toBe(
            true,
        );
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:getItem', id: '1' }),
        ).toBe(false);
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:writeVote', id: 1 }),
        ).toBe(false);
    });
});
