import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
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
        expect(page.profile?.accountForm).toBeUndefined();
    });

    it('parses editable HN account settings from an own profile page', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a id="me" href="user?id=fanjinz">fanjinz</a>
                    </span>
                    <form class="profileform" action="/xuser" method="post">
                        <input type="hidden" name="id" value="fanjinz">
                        <input type="hidden" name="hmac" value="abc123">
                        <table>
                            <tbody>
                                <tr class="athing">
                                    <td valign="top">user:</td>
                                    <td timestamp="1779000583">
                                        <a href="user?id=fanjinz" class="hnuser">fanjinz</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">created:</td>
                                    <td><span class="age">16 days ago</span></td>
                                </tr>
                                <tr><td valign="top">karma:</td><td>1</td></tr>
                                <tr>
                                    <td valign="top">about:</td>
                                    <td>
                                        <textarea name="about" rows="5" cols="60">Building RedHN.</textarea>
                                        <a href="formatdoc">help</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">email:</td>
                                    <td><input type="text" name="email" value="fj.zeng@yahoo.com"></td>
                                </tr>
                                <tr>
                                    <td valign="top">showdead:</td>
                                    <td>
                                        <select name="showd">
                                            <option>yes</option>
                                            <option selected="t">no</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">noprocrast:</td>
                                    <td>
                                        <select name="nopro">
                                            <option>yes</option>
                                            <option selected="t">no</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr><td valign="top">maxvisit:</td><td><input type="text" name="maxv" value="20"></td></tr>
                                <tr><td valign="top">minaway:</td><td><input type="text" name="mina" value="180"></td></tr>
                                <tr><td valign="top">delay:</td><td><input type="text" name="delay" value="0"></td></tr>
                                <tr><td></td><td><a href="changepw">change password</a></td></tr>
                                <tr><td></td><td><a href="submitted?id=fanjinz">submissions</a></td></tr>
                                <tr><td></td><td><a href="threads?id=fanjinz">comments</a></td></tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <a href="upvoted?id=fanjinz">upvoted submissions</a>
                                        /
                                        <a href="upvoted?id=fanjinz&amp;comments=t">comments</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <a href="favorites?id=fanjinz">favorite submissions</a>
                                        /
                                        <a href="favorites?id=fanjinz&amp;comments=t">comments</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <input type="submit" value="update">
                    </form>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/user?id=fanjinz',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({
            id: 'fanjinz',
            tab: 'overview',
            createdAt: 1779000583,
            about: 'Building RedHN.',
            aboutHtml: undefined,
            accountForm: {
                action: 'https://news.ycombinator.com/xuser',
                method: 'post',
                hiddenFields: {
                    id: 'fanjinz',
                    hmac: 'abc123',
                },
                submitLabel: 'update',
                about: { name: 'about', value: 'Building RedHN.' },
                email: { name: 'email', value: 'fj.zeng@yahoo.com' },
                showDead: { name: 'showd', value: 'no' },
                noProcrast: { name: 'nopro', value: 'no' },
                maxVisit: { name: 'maxv', value: '20' },
                minAway: { name: 'mina', value: '180' },
                delay: { name: 'delay', value: '0' },
            },
        });
        expect(page.profile?.accountForm?.showDead?.options).toEqual([
            { value: 'yes', label: 'yes' },
            { value: 'no', label: 'no' },
        ]);
        expect(page.profile?.accountForm?.links).toMatchObject({
            changePassword: 'https://news.ycombinator.com/changepw',
            submitted: 'https://news.ycombinator.com/submitted?id=fanjinz',
            comments: 'https://news.ycombinator.com/threads?id=fanjinz',
            upvotedSubmissions:
                'https://news.ycombinator.com/upvoted?id=fanjinz',
            upvotedComments:
                'https://news.ycombinator.com/upvoted?id=fanjinz&comments=t',
            favoriteSubmissions:
                'https://news.ycombinator.com/favorites?id=fanjinz',
            favoriteComments:
                'https://news.ycombinator.com/favorites?id=fanjinz&comments=t',
            formatDoc: 'https://news.ycombinator.com/formatdoc',
        });
    });

    it.each([
        {
            url: 'https://news.ycombinator.com/upvoted?id=fanjinz',
            tab: 'upvotedPosts',
        },
        {
            url: 'https://news.ycombinator.com/upvoted?id=fanjinz&comments=t',
            tab: 'upvotedComments',
        },
        {
            url: 'https://news.ycombinator.com/favorites?id=fanjinz&comments=t',
            tab: 'favoriteComments',
        },
    ] as const)(
        'keeps extra profile routes in the profile shell: $tab',
        ({ url, tab }) => {
            const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a id="me" href="user?id=fanjinz">fanjinz</a>
                    </span>
                </body>
            </html>
        `).document;

            const page = parseHnPage(document, url);

            expect(page.kind).toBe('profile');
            expect(page.profile).toMatchObject({
                id: 'fanjinz',
                tab,
                links: {
                    profile: 'https://news.ycombinator.com/user?id=fanjinz',
                    submitted:
                        'https://news.ycombinator.com/submitted?id=fanjinz',
                    comments: 'https://news.ycombinator.com/threads?id=fanjinz',
                    favorites:
                        'https://news.ycombinator.com/favorites?id=fanjinz',
                    upvotedSubmissions:
                        'https://news.ycombinator.com/upvoted?id=fanjinz',
                    upvotedComments:
                        'https://news.ycombinator.com/upvoted?id=fanjinz&comments=t',
                    favoriteComments:
                        'https://news.ycombinator.com/favorites?id=fanjinz&comments=t',
                },
            });
            expect(page.currentUser?.id).toBe('fanjinz');
            expect(isRedhnSupportedPage(page)).toBe(true);
        },
    );

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

    it('parses the HN submit form contract', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <center>
                        <table id="hnmain">
                            <tbody>
                                <tr id="bigbox">
                                    <td>
                                        <form action="/r" method="post">
                                            <input type="hidden" name="fnid" value="Pek2ac3yCOcK58mIBGbzjC">
                                            <input type="hidden" name="fnop" value="submit-page">
                                            <table>
                                                <tbody>
                                                    <tr>
                                                        <td>title</td>
                                                        <td><input type="text" name="title" value="" size="50"></td>
                                                    </tr>
                                                    <tr>
                                                        <td>url</td>
                                                        <td><input type="url" name="url" value="" size="50"></td>
                                                    </tr>
                                                    <tr>
                                                        <td>text</td>
                                                        <td><textarea name="text" rows="4" cols="49"></textarea></td>
                                                    </tr>
                                                    <tr>
                                                        <td></td>
                                                        <td><input type="submit" value="submit"></td>
                                                    </tr>
                                                    <tr>
                                                        <td></td>
                                                        <td>
                                                            Leave url blank to submit a question for discussion.
                                                            If there is no url, text will appear at the top of the thread.
                                                            If there is a url, text is optional.<br><br>
                                                            You can also submit via
                                                            <a href="bookmarklet.html" rel="nofollow"><u>bookmarklet</u></a>.
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </form>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </center>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/submit',
        );

        expect(page.kind).toBe('submit');
        expect(isRedhnSupportedPage(page)).toBe(true);
        expect(page.submit).toMatchObject({
            form: {
                action: 'https://news.ycombinator.com/r',
                method: 'post',
                titleName: 'title',
                urlName: 'url',
                textName: 'text',
                submitLabel: 'submit',
                hiddenFields: {
                    fnid: 'Pek2ac3yCOcK58mIBGbzjC',
                    fnop: 'submit-page',
                },
            },
            bookmarkletUrl: 'https://news.ycombinator.com/bookmarklet.html',
        });
        expect(page.submit?.helperText).toContain(
            'Leave url blank to submit a question for discussion.',
        );
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
