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
                            by <a class="hnuser" href="user?id=story_author">story_author</a>
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
            author: 'story_author',
            age: '3 hours ago',
            score: 428,
            commentCount: 156,
        });
        expect(page.stories[0]!.actions.upvote).toContain('/vote?id=1001');
        expect(page.stories[1]).toMatchObject({
            id: 1002,
            rank: 2,
            domain: undefined,
            commentCount: 432,
        });
    });

    it('parses current HN feed story rows without following the sitebit link', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table>
                        <tr class="athing submission" id="41001">
                            <td align="right" valign="top" class="title">
                                <span class="rank">1.</span>
                            </td>
                            <td valign="top" class="votelinks">
                                <center>
                                    <a id="up_41001" class="clicky" href="vote?id=41001&amp;how=up&amp;auth=fake-auth-token&amp;goto=news">
                                        <div class="votearrow" title="upvote"></div>
                                    </a>
                                </center>
                            </td>
                            <td class="title">
                                <span class="titleline">
                                    <a href="https://content.example/security-report">A synthetic security report</a>
                                    <span class="sitebit comhead">
                                        (<a href="from?site=content.example"><span class="sitestr">content.example</span></a>)
                                    </span>
                                </span>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `).document;

        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/news',
            789,
        );

        expect(page.kind).toBe('feed');
        expect(page.stories).toHaveLength(1);
        expect(page.stories[0]).toMatchObject({
            id: 41001,
            rank: 1,
            title: 'A synthetic security report',
            url: 'https://content.example/security-report',
            hnUrl: 'https://news.ycombinator.com/item?id=41001',
            domain: 'content.example',
            commentCount: 0,
        });
        expect(page.stories[0]!.actions.upvote).toBe(
            'https://news.ycombinator.com/vote?id=41001&how=up&auth=fake-auth-token&goto=news',
        );
        expect(page.stories[0]!.actions.comments).toBe(
            'https://news.ycombinator.com/item?id=41001',
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
            title: 'Show HN: Sample project',
            domain: 'project.example',
            score: 452,
            author: 'story_author',
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
            author: 'comment_author',
            age: '3 hours ago',
            text: 'This looks really clean.',
        });
        expect(page.comments[0]!.actions.upvote).toContain('/vote?id=3001');
        expect(page.comments[0]!.actions.unvote).toBeUndefined();
        expect(page.comments[0]!.children[0]).toMatchObject({
            id: 3002,
            depth: 1,
            author: 'story_author',
            text: 'Thanks!',
        });
        expect(
            flattenComments(page.comments).map((comment) => comment.id),
        ).toEqual([3001, 3002]);
    });

    it('parses a focused comment item and only its descendant tree', () => {
        const page = parseHnPage(
            fixture('comment-item.html'),
            'https://news.ycombinator.com/item?id=9100',
            654,
        );

        expect(page.kind).toBe('item');
        expect(isRedhnSupportedPage(page)).toBe(true);
        expect(page.stories).toEqual([]);
        expect(page.post).toMatchObject({
            id: 9100,
            type: 'comment',
            title: 'Synthetic parent story',
            url: 'https://news.ycombinator.com/item?id=9001',
            hnUrl: 'https://news.ycombinator.com/item?id=9100',
            author: 'test_author',
            age: '1 hour ago',
            text: 'Focused synthetic comment. Second synthetic paragraph.',
            commentCount: 4,
        });
        expect(page.post?.textHtml).toContain('Focused synthetic comment.');
        expect(page.post?.textHtml).toContain('Second synthetic paragraph.');
        expect(page.post?.actions.upvote).toBeUndefined();
        expect(page.post?.actions.unvote).toBe(
            'https://news.ycombinator.com/vote?id=9100&how=un&auth=fake-vote-token&goto=item%3Fid%3D9100',
        );
        expect(page.post?.actions.favorite).toBe(
            'https://news.ycombinator.com/fave?id=9100&auth=fake-favorite-token',
        );
        expect(page.post?.actions.parent).toBe(
            'https://news.ycombinator.com/item?id=9001',
        );
        expect(page.post?.actions.reply).toBe(
            'https://news.ycombinator.com/reply?id=9100&goto=item%3Fid%3D9100',
        );
        expect(page.post?.actions.comments).toBe(
            'https://news.ycombinator.com/item?id=9100',
        );
        expect(page.comments.map((comment) => comment.id)).toEqual([
            9101, 9102,
        ]);
        expect(page.comments[1]!.children[0]!.id).toBe(9103);
        expect(page.comments[1]!.children[0]!.children[0]!.id).toBe(9104);
        expect(
            flattenComments(page.comments).map((comment) => comment.id),
        ).toEqual([9101, 9102, 9103, 9104]);
        expect(
            flattenComments(page.comments).some(
                (comment) => comment.id === page.post?.id,
            ),
        ).toBe(false);
    });

    it.each([
        { name: 'story', file: 'item.html', id: 2001 },
        { name: 'focused comment', file: 'comment-item.html', id: 9100 },
    ])(
        'omits the $name reply action when HN has no comment form',
        ({ file, id }) => {
            const document = fixture(file);
            document.querySelector('form')?.remove();

            const page = parseHnPage(
                document,
                `https://news.ycombinator.com/item?id=${id}`,
            );

            expect(page.post?.id).toBe(id);
            expect(page.post?.actions.reply).toBeUndefined();
        },
    );

    it('falls back to generic focused-comment context when onstory is absent', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <table class="fatitem">
                        <tr class="athing" id="7001">
                            <td class="default">
                                <a class="hnuser" href="user?id=fallback_author">fallback_author</a>
                                <div class="commtext">Standalone comment.</div>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `).document;
        const page = parseHnPage(
            document,
            'https://news.ycombinator.com/item?id=7001',
        );

        expect(page.kind).toBe('item');
        expect(page.post).toMatchObject({
            id: 7001,
            type: 'comment',
            title: 'Comment',
            url: 'https://news.ycombinator.com/item?id=7001',
            hnUrl: 'https://news.ycombinator.com/item?id=7001',
            commentCount: 0,
        });
    });

    it.each<FavoriteCase>([
        {
            label: 'favorite link',
            subtext:
                '<a href="fave?id=2002&amp;auth=fake-auth-token">favorite</a>',
            expected: {
                favorite:
                    'https://news.ycombinator.com/fave?id=2002&auth=fake-auth-token',
            },
        },
        {
            label: 'un flag',
            subtext:
                '<a href="fave?id=2002&amp;un=t&amp;auth=fake-auth-token">favorite</a>',
            expected: {
                unfavorite:
                    'https://news.ycombinator.com/fave?id=2002&un=t&auth=fake-auth-token',
            },
        },
        {
            label: 'normalized unfavorite label',
            subtext:
                '<a href="fave?id=2002&amp;auth=fake-auth-token">un\u2011favorite</a>',
            expected: {
                unfavorite:
                    'https://news.ycombinator.com/fave?id=2002&auth=fake-auth-token',
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
                            <td timestamp="1700000000">
                                <a href="user?id=profile_user" class="hnuser">profile_user</a>
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
            'https://news.ycombinator.com/user?id=profile_user',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({
            id: 'profile_user',
            tab: 'overview',
            createdAt: 1700000000,
            created: '48 minutes ago',
            karma: 55,
            about: 'Building things.',
            aboutHtml: 'Building things.',
        });
        expect(page.profile?.links.comments).toBe(
            'https://news.ycombinator.com/threads?id=profile_user',
        );
        expect(page.profile?.accountForm).toBeUndefined();
    });

    it('parses editable HN account settings from an own profile page', () => {
        const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a id="me" href="user?id=test_owner">test_owner</a>
                    </span>
                    <form class="profileform" action="/xuser" method="post">
                        <input type="hidden" name="id" value="test_owner">
                        <input type="hidden" name="hmac" value="fake-hmac">
                        <table>
                            <tbody>
                                <tr class="athing">
                                    <td valign="top">user:</td>
                                    <td timestamp="1700000100">
                                        <a href="user?id=test_owner" class="hnuser">test_owner</a>
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
                                        <textarea name="about" rows="5" cols="60">Synthetic profile text.</textarea>
                                        <a href="formatdoc">help</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">email:</td>
                                    <td><input type="text" name="email" value="owner@example.com"></td>
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
                                <tr><td></td><td><a href="submitted?id=test_owner">submissions</a></td></tr>
                                <tr><td></td><td><a href="threads?id=test_owner">comments</a></td></tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <a href="upvoted?id=test_owner">upvoted submissions</a>
                                        /
                                        <a href="upvoted?id=test_owner&amp;comments=t">comments</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <a href="favorites?id=test_owner">favorite submissions</a>
                                        /
                                        <a href="favorites?id=test_owner&amp;comments=t">comments</a>
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
            'https://news.ycombinator.com/user?id=test_owner',
        );

        expect(page.kind).toBe('profile');
        expect(page.profile).toMatchObject({
            id: 'test_owner',
            tab: 'overview',
            createdAt: 1700000100,
            about: 'Synthetic profile text.',
            aboutHtml: undefined,
            accountForm: {
                action: 'https://news.ycombinator.com/xuser',
                method: 'post',
                hiddenFields: {
                    id: 'test_owner',
                    hmac: 'fake-hmac',
                },
                submitLabel: 'update',
                about: { name: 'about', value: 'Synthetic profile text.' },
                email: { name: 'email', value: 'owner@example.com' },
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
            submitted: 'https://news.ycombinator.com/submitted?id=test_owner',
            comments: 'https://news.ycombinator.com/threads?id=test_owner',
            upvotedSubmissions:
                'https://news.ycombinator.com/upvoted?id=test_owner',
            upvotedComments:
                'https://news.ycombinator.com/upvoted?id=test_owner&comments=t',
            favoriteSubmissions:
                'https://news.ycombinator.com/favorites?id=test_owner',
            favoriteComments:
                'https://news.ycombinator.com/favorites?id=test_owner&comments=t',
            formatDoc: 'https://news.ycombinator.com/formatdoc',
        });
    });

    it.each([
        {
            url: 'https://news.ycombinator.com/upvoted?id=test_owner',
            tab: 'upvotedPosts',
        },
        {
            url: 'https://news.ycombinator.com/upvoted?id=test_owner&comments=t',
            tab: 'upvotedComments',
        },
        {
            url: 'https://news.ycombinator.com/favorites?id=test_owner&comments=t',
            tab: 'favoriteComments',
        },
    ] as const)(
        'keeps extra profile routes in the profile shell: $tab',
        ({ url, tab }) => {
            const document = parseHTML(`
            <html>
                <body>
                    <span class="pagetop">
                        <a id="me" href="user?id=test_owner">test_owner</a>
                    </span>
                </body>
            </html>
        `).document;

            const page = parseHnPage(document, url);

            expect(page.kind).toBe('profile');
            expect(page.profile).toMatchObject({
                id: 'test_owner',
                tab,
                links: {
                    profile: 'https://news.ycombinator.com/user?id=test_owner',
                    submitted:
                        'https://news.ycombinator.com/submitted?id=test_owner',
                    comments:
                        'https://news.ycombinator.com/threads?id=test_owner',
                    favorites:
                        'https://news.ycombinator.com/favorites?id=test_owner',
                    upvotedSubmissions:
                        'https://news.ycombinator.com/upvoted?id=test_owner',
                    upvotedComments:
                        'https://news.ycombinator.com/upvoted?id=test_owner&comments=t',
                    favoriteComments:
                        'https://news.ycombinator.com/favorites?id=test_owner&comments=t',
                },
            });
            expect(page.currentUser?.id).toBe('test_owner');
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

    it.each([
        { path: 'login?goto=item%3Fid%3D2001', close: 'item?id=2001' },
        {
            path: 'vote?id=2001&how=up&goto=item%3Fid%3D2001',
            close: 'item?id=2001',
        },
        { path: 'fave?id=2001', close: 'item?id=2001' },
        { path: 'fave?id=2001&un=t', close: 'item?id=2001' },
        { path: 'hide?id=2001&goto=item%3Fid%3D2001', close: 'item?id=2001' },
        { path: 'reply?id=2001&goto=item%3Fid%3D2001', close: 'item?id=2001' },
        { path: 'submit', close: 'news' },
        { path: 'upvoted?id=test_owner', close: 'news' },
        { path: 'upvoted?id=test_owner&comments=t', close: 'news' },
        { path: 'changepw', close: 'news' },
    ])(
        'recognizes native self-submitting login forms at $path',
        ({ path, close }) => {
            const sourceUrl = `https://news.ycombinator.com/${path}`;
            const page = parseHnPage(fixture('auth.html'), sourceUrl);

            expect(page.kind).toBe('auth');
            expect(isRedhnSupportedPage(page)).toBe(true);
            expect(page.profile).toBeUndefined();
            expect(page.submit).toBeUndefined();
            expect(page.auth).toMatchObject({
                initialMode: 'login',
                gotoUrl: `https://news.ycombinator.com/${close}`,
                login: {
                    action: sourceUrl,
                    method: 'post',
                    usernameName: 'acct',
                    passwordName: 'pw',
                    hiddenFields: {},
                },
                signup: {
                    action: sourceUrl,
                    method: 'post',
                    hiddenFields: { creating: 't' },
                },
            });
        },
    );

    it.each([
        { path: 'forgot', fields: '<input name="s">' },
        {
            path: 'changepw',
            fields: '<input name="acct"><input type="password" name="oldpw"><input type="password" name="newpw">',
        },
    ])('leaves unrelated password forms at $path to HN', ({ path, fields }) => {
        const page = parseHnPage(
            parseHTML(
                `<html><body><form method="post">${fields}</form></body></html>`,
            ).document,
            `https://news.ycombinator.com/${path}`,
        );

        expect(page.kind).toBe('unknown');
        expect(page.auth).toBeUndefined();
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
                                            <input type="hidden" name="fnid" value="fake-form-id">
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
                    fnid: 'fake-form-id',
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
                        <a id="me" href="user?id=current_user">current_user</a>
                        <a id="logout" href="logout?auth=fake-auth-token&amp;goto=news">logout</a>
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
            id: 'current_user',
            profileUrl: 'https://news.ycombinator.com/user?id=current_user',
            logoutUrl:
                'https://news.ycombinator.com/logout?auth=fake-auth-token&goto=news',
        });
    });
});
