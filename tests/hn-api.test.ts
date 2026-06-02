import { describe, expect, it } from 'vitest';
import {
    fetchHnItem,
    fetchHnItems,
    fetchHnUser,
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
    it('fetches item and user resources from the official API paths', async () => {
        await expect(
            fetchHnItem(123, async (url) => {
                expect(url).toBe(
                    'https://hacker-news.firebaseio.com/v0/item/123.json',
                );
                return response({ id: 123, title: 'Hello', descendants: 3 });
            }),
        ).resolves.toMatchObject({ id: 123, descendants: 3 });

        await expect(
            fetchHnUser('PinkG', async (url) => {
                expect(url).toBe(
                    'https://hacker-news.firebaseio.com/v0/user/PinkG.json',
                );
                return response({
                    id: 'PinkG',
                    karma: 55,
                    submitted: [48323683],
                });
            }),
        ).resolves.toMatchObject({
            id: 'PinkG',
            karma: 55,
            submitted: [48323683],
        });
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

    it('rejects failed API responses', async () => {
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
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:getUser', id: 'PinkG' }),
        ).toBe(true);
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:getItem', id: '1' }),
        ).toBe(false);
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:getUser', id: '' }),
        ).toBe(false);
        expect(
            isRedhnBackgroundRequest({ type: 'redhn:writeVote', id: 1 }),
        ).toBe(false);
    });
});
