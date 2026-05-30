const HN_ORIGIN = 'https://news.ycombinator.com';
const FETCH_ACTION_PATHS = new Set(['/vote', '/hide', '/fave']);

export type HnActionResult =
    | { kind: 'performed'; url: string }
    | { kind: 'navigate'; url: string }
    | { kind: 'failed'; url: string; error: string };

export type HnReplyResult =
    | { kind: 'submitted'; url: string }
    | { kind: 'loginRequired'; url: string }
    | { kind: 'failed'; url: string; error: string };

export async function performHnAction(
    href: string,
    options: {
        fetcher?: typeof fetch;
        baseUrl?: string;
    } = {},
): Promise<HnActionResult> {
    const url = toUrl(href, options.baseUrl ?? window.location.href);
    if (!url) {
        return { kind: 'failed', url: href, error: 'Invalid HN action URL' };
    }

    if (!isFetchableHnAction(url)) {
        return { kind: 'navigate', url: url.href };
    }

    try {
        const response = await (options.fetcher ?? fetch)(url.href, {
            credentials: 'include',
            redirect: 'follow',
        });

        if (!response.ok || (await isLoginResponse(response))) {
            return { kind: 'navigate', url: url.href };
        }

        return { kind: 'performed', url: url.href };
    } catch (error) {
        return {
            kind: 'failed',
            url: url.href,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown HN action error',
        };
    }
}

async function isLoginResponse(response: Response): Promise<boolean> {
    if (response.url.includes('/login')) {
        return true;
    }

    try {
        const html = await response.clone().text();
        const normalized = html.toLowerCase();
        return (
            normalized.includes('please log in') &&
            normalized.includes('name="acct"') &&
            normalized.includes('name="pw"')
        );
    } catch {
        return false;
    }
}

export async function submitHnReply(
    href: string,
    text: string,
    options: {
        fetcher?: typeof fetch;
        baseUrl?: string;
        parseHtml?: (html: string) => Document;
    } = {},
): Promise<HnReplyResult> {
    const url = toUrl(href, options.baseUrl ?? window.location.href);
    if (!url) {
        return { kind: 'failed', url: href, error: 'Invalid HN reply URL' };
    }

    if (url.origin !== HN_ORIGIN || url.pathname !== '/reply') {
        return { kind: 'failed', url: url.href, error: 'Invalid HN reply URL' };
    }

    const fetcher = options.fetcher ?? fetch;

    try {
        const replyResponse = await fetcher(url.href, {
            credentials: 'include',
            redirect: 'follow',
        });

        if (!replyResponse.ok) {
            return {
                kind: 'failed',
                url: url.href,
                error: 'Could not load the Hacker News reply form.',
            };
        }

        const html = await replyResponse.text();
        const document = parseHnDocument(html, options.parseHtml);
        const form = findCommentForm(document);

        if (!form) {
            return hasAuthForm(document)
                ? { kind: 'loginRequired', url: url.href }
                : {
                      kind: 'failed',
                      url: url.href,
                      error: 'Could not find the Hacker News reply form.',
                  };
        }

        const textarea =
            form.querySelector<HTMLTextAreaElement>('textarea[name]');

        if (!textarea?.name) {
            return {
                kind: 'failed',
                url: url.href,
                error: 'Could not find the Hacker News comment field.',
            };
        }

        const body = new URLSearchParams();
        for (const input of form.querySelectorAll<HTMLInputElement>(
            'input[name]',
        )) {
            if (
                ['submit', 'button', 'image', 'file'].includes(
                    input.type.toLowerCase(),
                )
            ) {
                continue;
            }
            body.append(input.name, input.value);
        }
        body.set(textarea.name, text);

        const action = toUrl(
            form.getAttribute('action') || replyResponse.url || url.href,
            replyResponse.url || url.href,
        );

        if (!action) {
            return {
                kind: 'failed',
                url: url.href,
                error: 'Invalid Hacker News reply form action.',
            };
        }

        const submitResponse = await fetcher(action.href, {
            body,
            credentials: 'include',
            method: form.method || 'post',
            redirect: 'follow',
        });

        if (!submitResponse.ok) {
            return {
                kind: 'failed',
                url: action.href,
                error: 'Hacker News rejected the reply.',
            };
        }

        const submitUrl = submitResponse.url || action.href;
        const submittedUrl = toUrl(submitUrl, action.href);
        if (
            submittedUrl?.origin === HN_ORIGIN &&
            submittedUrl.pathname === '/item'
        ) {
            return { kind: 'submitted', url: submittedUrl.href };
        }

        const submitHtml = await submitResponse.text();
        const submitDocument = parseHnDocument(submitHtml, options.parseHtml);
        if (hasAuthForm(submitDocument)) {
            return { kind: 'loginRequired', url: url.href };
        }

        return {
            kind: 'failed',
            url: submitUrl,
            error:
                textContent(submitDocument.body) ||
                'Hacker News did not accept the reply.',
        };
    } catch (error) {
        return {
            kind: 'failed',
            url: url.href,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown HN reply error',
        };
    }
}

function isFetchableHnAction(url: URL): boolean {
    return url.origin === HN_ORIGIN && FETCH_ACTION_PATHS.has(url.pathname);
}

function toUrl(value: string, baseUrl: string): URL | undefined {
    try {
        return new URL(value, baseUrl);
    } catch {
        return undefined;
    }
}

function parseHnDocument(
    html: string,
    parseHtml: ((html: string) => Document) | undefined,
): Document {
    if (parseHtml) {
        return parseHtml(html);
    }

    return new DOMParser().parseFromString(html, 'text/html');
}

function findCommentForm(document: Document): HTMLFormElement | undefined {
    return Array.from(document.querySelectorAll<HTMLFormElement>('form')).find(
        (form) => form.querySelector('textarea[name]') !== null,
    );
}

function hasAuthForm(document: Document): boolean {
    return Array.from(document.querySelectorAll<HTMLFormElement>('form')).some(
        (form) =>
            form.querySelector('input[type="password"][name]') !== null &&
            form.querySelector('input[name]:not([type="hidden"])') !== null,
    );
}

function textContent(element: Element | null | undefined): string {
    return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
