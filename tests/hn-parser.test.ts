import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import {
    flattenComments,
    isRedhnSupportedPage,
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

    it('parses already-upvoted stories with an unvote action', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table class="itemlist">
                        <tr class="athing" id="1003">
                            <td class="title"><span class="rank">1.</span></td>
                            <td class="votelinks"></td>
                            <td class="title">
                                <span class="titleline">
                                    <a href="https://example.com/voted">Already voted</a>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="subtext">
                                <span class="score" id="score_1003">12 points</span>
                                by <a class="hnuser" href="user?id=dev_jane">dev_jane</a>
                                <span class="age"><a href="item?id=1003">1 hour ago</a></span>
                                <a href="vote?id=1003&amp;how=un&amp;goto=news">unvote</a>
                                <a href="item?id=1003">4 comments</a>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(document, 'https://news.ycombinator.com/news');

        expect(page.stories[0].actions.upvote).toBeUndefined();
        expect(page.stories[0].actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=1003&how=un&goto=news',
        );
    });

    it('parses HN morelink pagination instead of story links containing more', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table class="itemlist">
                        <tr class="athing" id="1004">
                            <td class="title"><span class="rank">1.</span></td>
                            <td class="votelinks"></td>
                            <td class="title">
                                <span class="titleline">
                                    <a href="https://example.com/more-news">Tell HN: More news from a project</a>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="subtext">
                                by <a class="hnuser" href="user?id=dev_jane">dev_jane</a>
                                <span class="age"><a href="item?id=1004">1 hour ago</a></span>
                                <a href="item?id=1004">4 comments</a>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="title">
                                <a href="?p=2" class="morelink" rel="next">More</a>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(document, 'https://news.ycombinator.com/news');

        expect(page.pagination.more).toBe(
            'https://news.ycombinator.com/news?p=2',
        );
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

    it('supports parsed feed and item pages for RedHN rendering', () => {
        const feedPage = parseHnPage(
            fixture('feed.html'),
            'https://news.ycombinator.com/news',
        );
        const itemPage = parseHnPage(
            fixture('item.html'),
            'https://news.ycombinator.com/item?id=2001',
        );

        expect(isRedhnSupportedPage(feedPage)).toBe(true);
        expect(isRedhnSupportedPage(itemPage)).toBe(true);
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
                        <tr><td></td><td><a href="submitted?id=PinkG">submissions</a></td></tr>
                        <tr><td></td><td><a href="threads?id=PinkG">comments</a></td></tr>
                        <tr><td></td><td><a href="favorites?id=PinkG">favorites</a></td></tr>
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
        expect(isRedhnSupportedPage(page)).toBe(true);
    });

    it('parses submitted profile pages as profile posts', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table>
                        <tr class="athing submission" id="48323683">
                            <td align="right" class="title"><span class="rank">1.</span></td>
                            <td class="votelinks"><a href="vote?id=48323683&amp;how=up">up</a></td>
                            <td class="title">
                                <span class="titleline">
                                    <a href="https://openpath.quest/post">I Am Retiring from Tech</a>
                                    <span class="sitebit comhead"> (<span class="sitestr">openpath.quest</span>)</span>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2"></td>
                            <td class="subtext">
                                <span class="score">150 points</span>
                                by <a href="user?id=PinkG" class="hnuser">PinkG</a>
                                <span class="age"><a href="item?id=48323683">47 minutes ago</a></span>
                                | <a href="item?id=48323683">72 comments</a>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/submitted?id=PinkG',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({ id: 'PinkG', tab: 'posts' });
        expect(page.stories).toHaveLength(1);
        expect(page.stories[0]).toMatchObject({
            id: 48323683,
            title: 'I Am Retiring from Tech',
            author: 'PinkG',
            score: 150,
            commentCount: 72,
        });
        expect(isRedhnSupportedPage(page)).toBe(true);
    });

    it('parses threads profile pages as profile comments, not item pages', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <tr class="athing comtr" id="39667625">
                        <td>
                            <table>
                                <tr>
                                    <td class="ind" indent="0"><img src="s.gif" width="0" /></td>
                                    <td class="votelinks"><a href="vote?id=39667625&amp;how=up">up</a></td>
                                    <td class="default">
                                        <span class="comhead">
                                            <a href="user?id=PinkG" class="hnuser">PinkG</a>
                                            <span class="age"><a href="item?id=39667625">on May 29, 2026</a></span>
                                            | <a href="item?id=39662907">parent</a>
                                        </span>
                                        <div class="comment">
                                            <div class="commtext">A profile comment.</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/threads?id=PinkG',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({ id: 'PinkG', tab: 'comments' });
        expect(page.post).toBeUndefined();
        expect(page.comments).toHaveLength(1);
        expect(page.comments[0]).toMatchObject({
            id: 39667625,
            author: 'PinkG',
            text: 'A profile comment.',
        });
        expect(isRedhnSupportedPage(page)).toBe(true);
    });

    it('supports empty favorites profile pages', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table id="hnmain">
                        <tr id="bigbox"><td></td></tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/favorites?id=PinkG',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({ id: 'PinkG', tab: 'favorites' });
        expect(page.stories).toHaveLength(0);
        expect(isRedhnSupportedPage(page)).toBe(true);
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
        expect(isRedhnSupportedPage(page)).toBe(true);
    });

    it('does not support FAQ or guidelines-like pages for RedHN rendering', () => {
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
        expect(isRedhnSupportedPage(page)).toBe(false);
    });

    it('does not support empty non-story pages for RedHN rendering', () => {
        const document = parseHTML(`
            <html>
                <head><title>Hacker News</title></head>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                    </span>
                    <table class="itemlist"></table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(document, 'https://news.ycombinator.com/news');

        expect(page.kind).toBe('unknown');
        expect(isRedhnSupportedPage(page)).toBe(false);
    });

    it('extracts item ids from HN URLs', () => {
        expect(parseItemIdFromUrl('item?id=123')).toBe(123);
        expect(
            parseItemIdFromUrl('https://news.ycombinator.com/item?id=456'),
        ).toBe(456);
        expect(parseItemIdFromUrl('news')).toBeUndefined();
    });

    it('parses the logged-in HN user from the page top bar', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                        <a id="me" href="user?id=daanyal">daanyal</a>
                        <a id="logout" href="logout?auth=abc&amp;goto=news">logout</a>
                    </span>
                    <table class="itemlist"></table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/news',
            789,
        );

        expect(page.currentUser).toEqual({
            id: 'daanyal',
            profileUrl: 'https://news.ycombinator.com/user?id=daanyal',
            logoutUrl: 'https://news.ycombinator.com/logout?auth=abc&goto=news',
        });
    });

    it('leaves currentUser empty for logged-out HN pages', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a href="news">Hacker News</a>
                        <a href="login?goto=news">login</a>
                    </span>
                    <table class="itemlist"></table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/news',
            789,
        );

        expect(page.currentUser).toBeUndefined();
    });
});
