import type {
    ParsedAuthForm,
    ParsedAuthPage,
    ParsedComment,
    ParsedCurrentUser,
    ParsedPage,
    ParsedPagination,
    ParsedProfile,
    ParsedProfileTab,
    ParsedStory,
} from './types';

const HN_ORIGIN = 'https://news.ycombinator.com';

export function parseHnPage(
    document: Document,
    sourceUrl = document.location?.href ?? HN_ORIGIN,
    capturedAt = Date.now(),
): ParsedPage {
    const stories = parseStories(document, sourceUrl);
    const comments = parseComments(document, sourceUrl);
    const profile = parseProfile(document, sourceUrl);
    const auth = parseAuthPage(document, sourceUrl);
    const post =
        !profile && !auth && isItemPage(sourceUrl, document)
            ? enhancePostFromItemPage(document, stories[0], sourceUrl)
            : undefined;

    return {
        kind: profile
            ? 'profile'
            : auth
              ? 'auth'
              : post
                ? 'item'
                : stories.length > 0
                  ? 'feed'
                  : 'unknown',
        sourceUrl,
        title: text(document.querySelector('title')),
        currentUser: parseCurrentUser(document, sourceUrl),
        stories: post ? [] : stories,
        post,
        profile,
        auth,
        comments,
        pagination: parsePagination(document, sourceUrl),
        capturedAt,
    };
}

export function isRedhnSupportedPage(page: ParsedPage): boolean {
    return (
        (page.kind === 'feed' && page.stories.length > 0) ||
        (page.kind === 'item' && page.post !== undefined) ||
        (page.kind === 'profile' && page.profile !== undefined) ||
        (page.kind === 'auth' && page.auth !== undefined)
    );
}

export function parseStories(
    document: Document,
    sourceUrl = document.location?.href ?? HN_ORIGIN,
): ParsedStory[] {
    return Array.from(document.querySelectorAll('tr.athing'))
        .filter((row) => !row.classList.contains('comtr'))
        .map((row) => parseStoryRow(row, sourceUrl))
        .filter((story): story is ParsedStory => story !== undefined);
}

export function parseComments(
    document: Document,
    sourceUrl = document.location?.href ?? HN_ORIGIN,
): ParsedComment[] {
    const roots: ParsedComment[] = [];
    const stack: ParsedComment[] = [];

    for (const row of document.querySelectorAll('tr.athing.comtr')) {
        const comment = parseCommentRow(row, sourceUrl);
        if (!comment) {
            continue;
        }

        while (stack.length > comment.depth) {
            stack.pop();
        }

        const parent = stack[comment.depth - 1];
        if (parent) {
            parent.children.push(comment);
        } else {
            roots.push(comment);
        }

        stack[comment.depth] = comment;
    }

    return roots;
}

export function flattenComments(comments: ParsedComment[]): ParsedComment[] {
    const flat: ParsedComment[] = [];

    const visit = (comment: ParsedComment) => {
        flat.push(comment);
        for (const child of comment.children) {
            visit(child);
        }
    };

    for (const comment of comments) {
        visit(comment);
    }

    return flat;
}

export function parseItemIdFromUrl(
    value: string | undefined,
): number | undefined {
    if (!value) {
        return undefined;
    }

    const url = safeUrl(value, HN_ORIGIN);
    const id = url?.searchParams.get('id');
    return id ? toNumber(id) : undefined;
}

function parseStoryRow(
    row: Element,
    sourceUrl: string,
): ParsedStory | undefined {
    const id = toNumber(row.getAttribute('id'));
    const titleLink = row.querySelector<HTMLAnchorElement>('.titleline > a');
    const title = text(titleLink);

    if (!id || !title || !titleLink) {
        return undefined;
    }

    const subtext =
        row.nextElementSibling?.querySelector('.subtext') ?? undefined;
    const hnUrl = absoluteUrl(`item?id=${id}`, sourceUrl);
    const storyUrl = absoluteUrl(
        titleLink.getAttribute('href') ?? hnUrl,
        sourceUrl,
    );
    const commentsLink =
        findLink(subtext, 'comments') ?? findLink(subtext, 'discuss');

    return {
        id,
        rank: parseRank(text(row.querySelector('.rank'))),
        title,
        url: storyUrl,
        hnUrl,
        domain:
            text(row.querySelector('.sitestr')) ||
            domainFromUrl(storyUrl) ||
            undefined,
        author: text(subtext?.querySelector('.hnuser')) || undefined,
        age: text(subtext?.querySelector('.age')) || undefined,
        score: parseScore(text(subtext?.querySelector('.score'))),
        commentCount: parseCommentCount(text(commentsLink)),
        actions: {
            upvote: href(row.querySelector('.votelinks a'), sourceUrl),
            unvote: href(findLink(subtext, 'unvote'), sourceUrl),
            hide: href(findLink(subtext, 'hide'), sourceUrl),
            comments: href(commentsLink, sourceUrl) ?? hnUrl,
        },
    };
}

function parseCommentRow(
    row: Element,
    sourceUrl: string,
): ParsedComment | undefined {
    const id = toNumber(row.getAttribute('id'));
    const commentBody = row.querySelector<HTMLElement>('.commtext');

    if (!id || !commentBody) {
        return undefined;
    }

    const defaultCell = row.querySelector('.default');
    const links = row.querySelectorAll<HTMLAnchorElement>('a');

    return {
        id,
        depth: parseCommentDepth(row),
        author: text(row.querySelector('.hnuser')) || undefined,
        age: text(row.querySelector('.age')) || undefined,
        text: text(commentBody),
        html: commentBody.innerHTML.trim(),
        actions: {
            upvote: href(row.querySelector('.votelinks a'), sourceUrl),
            reply: href(findLink(defaultCell, 'reply'), sourceUrl),
            parent: href(findLinkByExactText(links, 'parent'), sourceUrl),
            next: href(findLinkByExactText(links, 'next'), sourceUrl),
        },
        children: [],
    };
}

function enhancePostFromItemPage(
    document: Document,
    story: ParsedStory | undefined,
    sourceUrl: string,
): ParsedStory | undefined {
    if (!story) {
        return undefined;
    }

    const textCell = document.querySelector<HTMLElement>('.toptext');
    const subtext = document.querySelector('.subtext');

    return {
        ...story,
        textHtml: textCell?.innerHTML.trim() || undefined,
        text: text(textCell) || undefined,
        actions: {
            ...story.actions,
            favorite: href(findLink(subtext, 'favorite'), sourceUrl),
            hide:
                href(findLink(subtext, 'hide'), sourceUrl) ??
                story.actions.hide,
            reply: replyUrl(story.id, sourceUrl),
        },
    };
}

function parsePagination(
    document: Document,
    sourceUrl: string,
): ParsedPagination {
    return {
        more: href(findPaginationMoreLink(document), sourceUrl),
    };
}

function parseCurrentUser(
    document: Document,
    sourceUrl: string,
): ParsedCurrentUser | undefined {
    const userLink =
        document.querySelector<HTMLAnchorElement>('.pagetop a#me') ??
        document.querySelector<HTMLAnchorElement>('a#me');
    const id = text(userLink);

    if (!id || !userLink) {
        return undefined;
    }

    return {
        id,
        profileUrl:
            href(userLink, sourceUrl) ??
            absoluteUrl(`user?id=${encodeURIComponent(id)}`, sourceUrl),
        logoutUrl: href(
            document.querySelector<HTMLAnchorElement>('.pagetop a#logout') ??
                document.querySelector<HTMLAnchorElement>('a#logout'),
            sourceUrl,
        ),
    };
}

function parseAuthPage(
    document: Document,
    sourceUrl: string,
): ParsedAuthPage | undefined {
    const url = safeUrl(sourceUrl, HN_ORIGIN);
    if (url?.pathname !== '/login') {
        return undefined;
    }

    const forms = Array.from(document.querySelectorAll('form'))
        .map((form) => parseAuthForm(form, sourceUrl))
        .filter((form): form is ParsedAuthForm => form !== undefined);
    const signup = forms.find((form) => form.hiddenFields.creating === 't');
    const login = forms.find((form) => form.hiddenFields.creating !== 't');

    if (!login) {
        return undefined;
    }

    const goto =
        login.hiddenFields.goto ??
        signup?.hiddenFields.goto ??
        url.searchParams.get('goto') ??
        'news';

    return {
        initialMode: url.hash === '#signup' ? 'signup' : 'login',
        login,
        signup,
        forgotUrl: href(findLink(document, 'Forgot your password?'), sourceUrl),
        gotoUrl: absoluteUrl(goto || 'news', sourceUrl),
    };
}

function parseAuthForm(
    form: HTMLFormElement,
    sourceUrl: string,
): ParsedAuthForm | undefined {
    const usernameInput = form.querySelector<HTMLInputElement>(
        'input[name]:not([type="hidden"]):not([type="password"])',
    );
    const passwordInput = form.querySelector<HTMLInputElement>(
        'input[type="password"][name]',
    );
    const submit = form.querySelector<HTMLInputElement>('input[type="submit"]');

    if (!usernameInput || !passwordInput) {
        return undefined;
    }

    return {
        action: absoluteUrl(
            form.getAttribute('action') || sourceUrl,
            sourceUrl,
        ),
        method: (form.getAttribute('method') || 'get').toLowerCase(),
        usernameName: usernameInput.name,
        passwordName: passwordInput.name,
        submitLabel: submit?.value || undefined,
        hiddenFields: parseHiddenFields(form),
    };
}

function parseHiddenFields(form: HTMLFormElement): Record<string, string> {
    return Object.fromEntries(
        Array.from(
            form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
        )
            .filter((input) => input.name)
            .map((input) => [input.name, input.value]),
    );
}

function parseProfile(
    document: Document,
    sourceUrl: string,
): ParsedProfile | undefined {
    const route = parseProfileRoute(sourceUrl);
    if (!route) {
        return undefined;
    }

    const rows = Array.from(document.querySelectorAll('tr'));
    const userRow = findProfileRow(rows, 'user');
    const createdRow = findProfileRow(rows, 'created');
    const karmaRow = findProfileRow(rows, 'karma');
    const aboutRow = findProfileRow(rows, 'about');
    const userCell = userRow?.children.item(1);
    const createdCell = createdRow?.children.item(1);
    const karmaCell = karmaRow?.children.item(1);
    const aboutCell = aboutRow?.children.item(1) as HTMLElement | null;
    const id = text(userCell?.querySelector('.hnuser')) || route.id;

    return {
        id,
        tab: route.tab,
        createdAt: toNumber(userCell?.getAttribute('timestamp')),
        created: text(createdCell) || undefined,
        karma: toNumber(text(karmaCell)),
        about: text(aboutCell) || undefined,
        aboutHtml: aboutCell?.innerHTML.trim() || undefined,
        links: profileLinks(id, sourceUrl),
    };
}

function parseProfileRoute(
    sourceUrl: string,
): { id: string; tab: ParsedProfileTab } | undefined {
    const url = safeUrl(sourceUrl, HN_ORIGIN);
    if (!url) {
        return undefined;
    }

    const id = url.searchParams.get('id')?.trim();
    if (!id) {
        return undefined;
    }

    const tabByPath: Record<string, ParsedProfileTab | undefined> = {
        '/user': 'overview',
        '/submitted': 'posts',
        '/threads': 'comments',
        '/favorites': 'favorites',
    };
    const tab = tabByPath[url.pathname];

    return tab ? { id, tab } : undefined;
}

function findProfileRow(rows: Element[], label: string): Element | undefined {
    return rows.find((row) => {
        const firstCell = row.children.item(0);
        return text(firstCell).replace(/:$/, '').toLowerCase() === label;
    });
}

function profileLinks(id: string, sourceUrl: string): ParsedProfile['links'] {
    const encodedId = encodeURIComponent(id);

    return {
        profile: absoluteUrl(`user?id=${encodedId}`, sourceUrl),
        submitted: absoluteUrl(`submitted?id=${encodedId}`, sourceUrl),
        comments: absoluteUrl(`threads?id=${encodedId}`, sourceUrl),
        favorites: absoluteUrl(`favorites?id=${encodedId}`, sourceUrl),
    };
}

function parseCommentDepth(row: Element): number {
    const width = row
        .querySelector<HTMLImageElement>('td.ind img')
        ?.getAttribute('width');
    const value = toNumber(width);
    return value ? Math.floor(value / 40) : 0;
}

function isItemPage(sourceUrl: string, document: Document): boolean {
    return (
        parseItemIdFromUrl(sourceUrl) !== undefined ||
        document.querySelector('tr.athing.comtr') !== null ||
        document.querySelector('.toptext') !== null
    );
}

function parseRank(value: string): number | undefined {
    return toNumber(value.replace('.', ''));
}

function parseScore(value: string): number | undefined {
    return toNumber(value.replace('points', '').replace('point', ''));
}

function parseCommentCount(value: string): number | undefined {
    if (!value || value.toLowerCase() === 'discuss') {
        return 0;
    }

    const match = value.match(/(\d+)/);
    return match ? toNumber(match[1]) : undefined;
}

function findLink(
    root: ParentNode | null | undefined,
    label: string,
): HTMLAnchorElement | undefined {
    if (!root) {
        return undefined;
    }

    return Array.from(root.querySelectorAll<HTMLAnchorElement>('a')).find(
        (link) =>
            link.textContent
                ?.trim()
                .toLowerCase()
                .includes(label.toLowerCase()),
    );
}

function findLinkByExactText(
    links: NodeListOf<HTMLAnchorElement>,
    label: string,
): HTMLAnchorElement | undefined {
    return Array.from(links).find(
        (link) =>
            link.textContent?.trim().toLowerCase() === label.toLowerCase(),
    );
}

function findPaginationMoreLink(document: Document): HTMLAnchorElement | null {
    return (
        document.querySelector<HTMLAnchorElement>('a.morelink[rel="next"]') ??
        document.querySelector<HTMLAnchorElement>('a.morelink') ??
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
            (link) => text(link).toLowerCase() === 'more',
        ) ??
        null
    );
}

function href(
    element: Element | undefined | null,
    sourceUrl: string,
): string | undefined {
    if (!element || element.tagName.toLowerCase() !== 'a') {
        return undefined;
    }

    const value = element.getAttribute('href');
    return value ? absoluteUrl(value, sourceUrl) : undefined;
}

function absoluteUrl(value: string, sourceUrl: string): string {
    return safeUrl(value, sourceUrl)?.href ?? value;
}

function replyUrl(itemId: number, sourceUrl: string): string {
    const params = new URLSearchParams({
        id: String(itemId),
        goto: `item?id=${itemId}`,
    });
    return absoluteUrl(`reply?${params.toString()}`, sourceUrl);
}

function safeUrl(value: string, baseUrl: string): URL | undefined {
    try {
        return new URL(value, baseUrl);
    } catch {
        return undefined;
    }
}

function domainFromUrl(value: string): string | undefined {
    const url = safeUrl(value, HN_ORIGIN);
    return url && url.origin !== HN_ORIGIN
        ? url.hostname.replace(/^www\./, '')
        : undefined;
}

function text(element: Element | null | undefined): string {
    return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function toNumber(value: string | null | undefined): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
