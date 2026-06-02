import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import {
    flattenComments,
    parseHnPage,
    parseItemIdFromUrl,
} from '../src/redhn/hn/parser';

function fixture(name: string): Document {
    const html = readFileSync(
        new URL(`./fixtures/${name}`, import.meta.url),
        'utf8',
    );
    return parseHTML(html).document;
}

function favoritePage(subtext: string): Document {
    return parseHTML(`
        <html>
            <body>
                <table class="fatitem">
                    <tr class="athing" id="2002">
                        <td class="title">
                            <span class="titleline">
                                <a href="item?id=2002">Ask HN: Saved?</a>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td class="subtext">
                            by <a class="hnuser" href="user?id=pg">pg</a>
                            ${subtext}
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `).document;
}

type FavoriteCase = {
    label: string;
    subtext: string;
    expected: {
        favorite?: string;
        unfavorite?: string;
    };
};

describe('HN DOM parser', () => {
    it('parses feed stories and pagination from loaded HN markup', () => {
        const page = parseHnPage(
            fixture('feed.html'),
            'https://news.ycombinator.com/news',
            123,
        );

        expect(page.kind).toBe('feed');
        expect(page.capturedAt).toBe(123);
        expect(page.pagination.more).toBe(
            'https://news.ycombinator.com/news?p=2',
        );
        expect(page.stories).toHaveLength(2);
        expect(page.stories[0]).toMatchObject({
            id: 1001,
            rank: 1,
            title: 'Show HN: A new framework for building web components',
            url: 'https://example.com/framework',
            hnUrl: 'https://news.ycombinator.com/item?id=1001',
            domain: 'example.com',
            author: 'dev_jane',
            age: '3 hours ago',
            score: 428,
            commentCount: 156,
        });
        expect(page.stories[0].actions.upvote).toContain('/vote?id=1001');
        expect(page.stories[1]).toMatchObject({
            id: 1002,
            rank: 2,
            domain: undefined,
            commentCount: 432,
        });
    });

    it('parses an item page into a post and nested comment tree', () => {
        const page = parseHnPage(
            fixture('item.html'),
            'https://news.ycombinator.com/item?id=2001',
            456,
        );

        expect(page.kind).toBe('item');
        expect(page.post).toMatchObject({
            id: 2001,
            title: 'Show HN: I built RedHN',
            domain: 'github.com',
            score: 452,
            author: 'pg',
            commentCount: 128,
            text: 'I built a minimal, high-density Hacker News client.',
        });
        expect(page.post?.actions.favorite).toContain('/fave?id=2001');
        expect(page.post?.actions.reply).toBe(
            'https://news.ycombinator.com/reply?id=2001&goto=item%3Fid%3D2001',
        );
        expect(page.comments).toHaveLength(1);
        expect(page.comments[0]).toMatchObject({
            id: 3001,
            depth: 0,
            author: 'dave_t',
            age: '3 hours ago',
            text: 'This looks really clean.',
        });
        expect(page.comments[0].children[0]).toMatchObject({
            id: 3002,
            depth: 1,
            author: 'pg',
            text: 'Thanks Dave!',
        });
        expect(
            flattenComments(page.comments).map((comment) => comment.id),
        ).toEqual([3001, 3002]);
    });

    it.each<FavoriteCase>([
        {
            label: 'favorite link',
            subtext: '<a href="fave?id=2002&amp;auth=abc">favorite</a>',
            expected: {
                favorite: 'https://news.ycombinator.com/fave?id=2002&auth=abc',
            },
        },
        {
            label: 'un flag',
            subtext:
                '<a href="fave?id=2002&amp;un=t&amp;auth=abc">favorite</a>',
            expected: {
                unfavorite:
                    'https://news.ycombinator.com/fave?id=2002&un=t&auth=abc',
            },
        },
        {
            label: 'normalized unfavorite label',
            subtext: '<a href="fave?id=2002&amp;auth=abc">un\u2011favorite</a>',
            expected: {
                unfavorite:
                    'https://news.ycombinator.com/fave?id=2002&auth=abc',
            },
        },
        {
            label: 'non-fave favorite text',
            subtext: '<a href="item?id=2002">favorite comments</a>',
            expected: {},
        },
    ])('parses item favorite state from $label', ({ subtext, expected }) => {
        const page = parseHnPage(
            favoritePage(subtext),
            'https://news.ycombinator.com/item?id=2002',
        );

        expect(page.post?.actions.favorite).toBe(expected.favorite);
        expect(page.post?.actions.unfavorite).toBe(expected.unfavorite);
    });

    it('parses HN user profile fields', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table>
                        <tr class="athing">
                            <td valign="top">user:</td>
                            <td timestamp="1780065601">
                                <a href="user?id=PinkG" class="hnuser">PinkG</a>
                            </td>
                        </tr>
                        <tr>
                            <td valign="top">created:</td>
                            <td><span class="age">48 minutes ago</span></td>
                        </tr>
                        <tr><td valign="top">karma:</td><td>55</td></tr>
                        <tr><td valign="top">about:</td><td>Building things.</td></tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/user?id=PinkG',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({
            id: 'PinkG',
            tab: 'overview',
            createdAt: 1780065601,
            created: '48 minutes ago',
            karma: 55,
            about: 'Building things.',
            aboutHtml: 'Building things.',
        });
        expect(page.profile?.links.comments).toBe(
            'https://news.ycombinator.com/threads?id=PinkG',
        );
    });

    it('parses login pages for RedHN auth rendering', () => {
        const document = parseHTML(`
            <html>
                <head><title>Login | Hacker News</title></head>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                    </span>
                    <form method="post" action="login">
                        <input type="hidden" name="goto" value="xxx" />
                        <input name="acct" />
                        <input name="pw" type="password" />
                        <input type="submit" value="login" />
                    </form>
                    <a href="forgot">Forgot your password?</a>
                    <form method="post" action="login">
                        <input type="hidden" name="goto" value="xxx" />
                        <input type="hidden" name="creating" value="t" />
                        <input name="acct" />
                        <input name="pw" type="password" />
                        <input type="submit" value="create account" />
                    </form>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/login?goto=xxx#signup',
        );

        expect(page.kind).toBe('auth');
        expect(page.auth).toMatchObject({
            initialMode: 'signup',
            forgotUrl: 'https://news.ycombinator.com/forgot',
            gotoUrl: 'https://news.ycombinator.com/xxx',
            login: {
                action: 'https://news.ycombinator.com/login',
                method: 'post',
                usernameName: 'acct',
                passwordName: 'pw',
                submitLabel: 'login',
                hiddenFields: { goto: 'xxx' },
            },
            signup: {
                action: 'https://news.ycombinator.com/login',
                method: 'post',
                usernameName: 'acct',
                passwordName: 'pw',
                submitLabel: 'create account',
                hiddenFields: { goto: 'xxx', creating: 't' },
            },
        });
    });

    it('treats unsupported HN pages as unknown', () => {
        const document = parseHTML(`
            <html>
                <head><title>Hacker News FAQ</title></head>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                    </span>
                    <table>
                        <tr><td class="title">Frequently Asked Questions</td></tr>
                        <tr><td>Answers about Hacker News.</td></tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/newsfaq.html',
        );

        expect(page.kind).toBe('unknown');
    });

    it('extracts HN URL ids and the logged-in current user', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                        <a id="me" href="user?id=daanyal">daanyal</a>
                        <a id="logout" href="logout?auth=abc&amp;goto=news">logout</a>
                    </span>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/news',
            789,
        );

        expect(parseItemIdFromUrl('item?id=123')).toBe(123);
        expect(
            parseItemIdFromUrl('https://news.ycombinator.com/item?id=456'),
        ).toBe(456);
        expect(parseItemIdFromUrl('news')).toBeUndefined();
        expect(page.currentUser).toEqual({
            id: 'daanyal',
            profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
            logoutUrl: 'https://news.ycombinator.com/logout?auth=abc&goto=news',
        });
    });
});
