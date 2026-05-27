const HN_ORIGIN = 'https://news.ycombinator.com';
const FETCH_ACTION_PATHS = new Set(['/vote', '/hide', '/fave']);

export type HnActionResult =
    | { kind: 'performed'; url: string }
    | { kind: 'navigate'; url: string }
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

        if (!response.ok || response.url.includes('/login')) {
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
