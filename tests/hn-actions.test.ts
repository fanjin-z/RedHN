import { readFileSync } from 'node:fs';
import { DOMParser, parseHTML } from 'linkedom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const authHtml = readFileSync(
    new URL('./fixtures/auth.html', import.meta.url),
    'utf8',
);

beforeEach(() => {
    vi.stubGlobal('DOMParser', DOMParser);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('HN action fallback', () => {
    it('fetches safe same-origin HN actions with credentials', async () => {
        const calls: Array<{ url: string; init?: RequestInit }> = [];

        for (const href of [
            'vote?id=1&how=up&auth=fake-auth-token',
            'fave?id=1&auth=fake-auth-token',
        ]) {
            await expect(
                performHnAction(href, {
                    baseUrl: 'https://news.ycombinator.com/item?id=1',
                    fetcher: async (url, init) => {
                        calls.push({ url: String(url), init });
                        return response(
                            'https://news.ycombinator.com/item?id=1',
                        );
                    },
                }),
            ).resolves.toMatchObject({ kind: 'performed' });
        }

        expect(calls).toMatchObject([
            {
                init: { credentials: 'include' },
                url: 'https://news.ycombinator.com/vote?id=1&how=up&auth=fake-auth-token',
            },
            {
                init: { credentials: 'include' },
                url: 'https://news.ycombinator.com/fave?id=1&auth=fake-auth-token',
            },
        ]);
    });

    it.each(['', '&auth='])(
        'navigates logged-out votes through HN without fetching or losing the return URL (%s)',
        async (auth) => {
            const href = `vote?id=1&how=up${auth}&goto=item%3Fid%3D1`;
            const fetcher = vi.fn<typeof fetch>();

            await expect(
                performHnAction(href, {
                    baseUrl: 'https://news.ycombinator.com/item?id=1',
                    fetcher,
                }),
            ).resolves.toEqual({
                kind: 'navigate',
                url: `https://news.ycombinator.com/${href}`,
            });
            expect(fetcher).not.toHaveBeenCalled();
        },
    );

    it.each([
        'vote?id=1&how=up&auth=cached-token&goto=item%3Fid%3D1',
        'fave?id=1',
        'fave?id=1&un=t',
        'hide?id=1&goto=item%3Fid%3D1',
    ])('navigates guest actions without fetching: %s', async (href) => {
        const fetcher = vi.fn<typeof fetch>();
        await expect(
            performHnAction(href, {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                isLoggedIn: false,
                fetcher,
            }),
        ).resolves.toEqual({
            kind: 'navigate',
            url: `https://news.ycombinator.com/${href}`,
        });
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('navigates for non-fetchable actions and login-required responses', async () => {
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

        await expect(
            performHnAction('fave?id=1&auth=fake-auth-token', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                fetcher: async () =>
                    htmlResponse(
                        'https://news.ycombinator.com/login',
                        authHtml,
                    ),
            }),
        ).resolves.toMatchObject({ kind: 'navigate' });

        await expect(
            performHnAction('fave?id=1&auth=fake-auth-token', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                fetcher: async () =>
                    htmlResponse(
                        'https://news.ycombinator.com/fave?id=1&auth=fake-auth-token',
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
            url: 'https://news.ycombinator.com/fave?id=1&auth=fake-auth-token',
        });

        await expect(
            performHnAction('vote?id=1&how=up&auth=expired-token', {
                baseUrl: 'https://news.ycombinator.com/item?id=1',
                fetcher: async (url) =>
                    htmlResponse(
                        String(url),
                        `
                            You have to be logged in to vote.
                            <form action='vote' method='post'>
                                <input name='acct'>
                                <input type='password' name='pw'>
                            </form>
                        `,
                    ),
            }),
        ).resolves.toMatchObject({ kind: 'navigate' });
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
        expect(calls[1]!.url).toBe('https://news.ycombinator.com/comment');
        expect(calls[1]!.init).toMatchObject({
            credentials: 'include',
            method: 'post',
        });
        expect(String(calls[1]!.init?.body)).toBe(
            'parent=3001&goto=item%3Fid%3D2001%233001&text=Looks+good%21',
        );
    });

    it.each(['load', 'post'])(
        'reports login required during reply %s',
        async (stage) => {
            let calls = 0;
            await expect(
                submitHnReply('reply?id=3001', 'Draft text', {
                    baseUrl: 'https://news.ycombinator.com/item?id=2001',
                    parseHtml,
                    fetcher: async (url) => {
                        if (stage === 'post' && calls++ === 0) {
                            return htmlResponse(
                                String(url),
                                '<form action="comment" method="post"><input name="parent" type="hidden" value="3001"><textarea name="text"></textarea></form>',
                            );
                        }
                        return htmlResponse(
                            'https://news.ycombinator.com/item?id=2001',
                            authHtml,
                        );
                    },
                }),
            ).resolves.toMatchObject({
                kind: 'loginRequired',
                url: 'https://news.ycombinator.com/reply?id=3001',
            });
        },
    );

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
