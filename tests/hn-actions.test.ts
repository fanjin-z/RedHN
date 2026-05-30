import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { performHnAction, submitHnReply } from '../src/redhn/hn/actions';

const response = (url: string, ok = true): Response =>
    ({
        ok,
        url,
    }) as Response;

const htmlResponse = (url: string, html: string, ok = true): Response =>
    ({
        ok,
        clone: () => htmlResponse(url, html, ok),
        text: async () => html,
        url,
    }) as Response;

const parseHtml = (html: string): Document => parseHTML(html).document;

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

    it('fetches favorite actions with credentials', async () => {
        const calls: Array<{ url: string; init?: RequestInit }> = [];
        const result = await performHnAction('fave?id=1&auth=x', {
            baseUrl: 'https://news.ycombinator.com/item?id=1',
            fetcher: async (url, init) => {
                calls.push({ url: String(url), init });
                return response('https://news.ycombinator.com/item?id=1');
            },
        });

        expect(result.kind).toBe('performed');
        expect(calls[0]).toMatchObject({
            init: { credentials: 'include' },
            url: 'https://news.ycombinator.com/fave?id=1&auth=x',
        });
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

    it('falls back to navigation when favorite actions return an inline login page', async () => {
        await expect(
            performHnAction('fave?id=1&auth=x', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                fetcher: async () =>
                    htmlResponse(
                        'https://news.ycombinator.com/fave?id=1&auth=x',
                        `
                            Please log in.
                            <form action="fave" method="post">
                                <input name="acct">
                                <input name="pw" type="password">
                            </form>
                        `,
                    ),
            }),
        ).resolves.toMatchObject({
            kind: 'navigate',
            url: 'https://news.ycombinator.com/fave?id=1&auth=x',
        });
    });

    it('submits inline replies through the HN reply form', async () => {
        const calls: Array<{ url: string; init?: RequestInit }> = [];
        const result = await submitHnReply('reply?id=3001', 'Looks good!', {
            baseUrl: 'https://news.ycombinator.com/item?id=2001',
            parseHtml,
            fetcher: async (url, init) => {
                calls.push({ url: String(url), init });
                if (calls.length === 1) {
                    return htmlResponse(
                        String(url),
                        `
                            <form method="post" action="comment">
                                <input type="hidden" name="parent" value="3001">
                                <input type="hidden" name="goto" value="item?id=2001#3001">
                                <textarea name="text"></textarea>
                                <input type="submit" value="reply">
                            </form>
                        `,
                    );
                }

                return htmlResponse(
                    'https://news.ycombinator.com/item?id=2001#3001',
                    '<html><body>ok</body></html>',
                );
            },
        });

        expect(result).toMatchObject({
            kind: 'submitted',
            url: 'https://news.ycombinator.com/item?id=2001#3001',
        });
        expect(calls[1].url).toBe('https://news.ycombinator.com/comment');
        expect(calls[1].init).toMatchObject({
            credentials: 'include',
            method: 'post',
        });
        expect(String(calls[1].init?.body)).toBe(
            'parent=3001&goto=item%3Fid%3D2001%233001&text=Looks+good%21',
        );
    });

    it('keeps inline reply drafts when HN requires login', async () => {
        await expect(
            submitHnReply('reply?id=3001', 'Draft text', {
                baseUrl: 'https://news.ycombinator.com/item?id=2001',
                parseHtml,
                fetcher: async (url) =>
                    htmlResponse(
                        String(url),
                        `
                            You have to be logged in to reply.
                            <form action="reply" method="post">
                                <input type="hidden" name="id" value="3001">
                                <input name="acct">
                                <input type="password" name="pw">
                                <input type="submit" value="login">
                            </form>
                        `,
                    ),
            }),
        ).resolves.toMatchObject({
            kind: 'loginRequired',
            url: 'https://news.ycombinator.com/reply?id=3001',
        });
    });

    it('reports reply form load failures', async () => {
        await expect(
            submitHnReply('reply?id=3001', 'Draft text', {
                baseUrl: 'https://news.ycombinator.com/item?id=2001',
                parseHtml,
                fetcher: async (url) => htmlResponse(String(url), '', false),
            }),
        ).resolves.toMatchObject({
            kind: 'failed',
            error: 'Could not load the Hacker News reply form.',
        });
    });
});
