import { describe, expect, it } from 'vitest';
import { performHnAction } from '../src/redhn/hn/actions';

const response = (url: string, ok = true): Response =>
    ({
        ok,
        url,
    }) as Response;

describe('HN action fallback', () => {
    it('fetches safe same-origin HN actions with credentials', async () => {
        const calls: RequestInit[] = [];
        const result = await performHnAction('vote?id=1&how=up', {
            baseUrl: 'https://news.ycombinator.com/item?id=1',
            fetcher: async (_url, init) => {
                calls.push(init ?? {});
                return response('https://news.ycombinator.com/item?id=1');
            },
        });

        expect(result.kind).toBe('performed');
        expect(calls[0]).toMatchObject({ credentials: 'include' });
    });

    it('navigates for reply forms and external URLs', async () => {
        await expect(
            performHnAction('reply?id=1', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
            }),
        ).resolves.toMatchObject({
            kind: 'navigate',
            url: 'https://news.ycombinator.com/reply?id=1',
        });

        await expect(
            performHnAction('https://example.com', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
            }),
        ).resolves.toMatchObject({
            kind: 'navigate',
            url: 'https://example.com/',
        });
    });

    it('falls back to navigation on login redirects', async () => {
        await expect(
            performHnAction('fave?id=1&auth=x', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                fetcher: async () =>
                    response('https://news.ycombinator.com/login'),
            }),
        ).resolves.toMatchObject({ kind: 'navigate' });
    });
});
