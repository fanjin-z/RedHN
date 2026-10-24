import { parseHnPage } from './parser';
import type { ParsedPage } from './types';

export function feedUrl(href: string, sourceUrl: string): string {
    const source = new URL(sourceUrl);
    const url = new URL(href, source);
    const feedPath = (path: string) => (path === '/' ? '/news' : path);

    if (
        url.origin !== 'https://news.ycombinator.com' ||
        url.username ||
        url.password ||
        feedPath(url.pathname) !== feedPath(source.pathname)
    ) {
        throw new Error('Invalid Hacker News feed URL.');
    }

    url.hash = '';
    return url.href;
}

export async function fetchFeedPage(
    href: string,
    sourceUrl: string,
    signal: AbortSignal,
): Promise<ParsedPage> {
    const url = feedUrl(href, sourceUrl);
    const response = await fetch(url, {
        credentials: 'include',
        signal,
    });
    if (!response.ok) {
        throw new Error(`Hacker News returned ${response.status}.`);
    }

    const responseUrl = feedUrl(response.url || url, sourceUrl);
    const document = new DOMParser().parseFromString(
        await response.text(),
        'text/html',
    );
    const page = parseHnPage(document, responseUrl);
    const emptyFeed =
        page.kind === 'unknown' &&
        document.querySelector('table.itemlist') &&
        !page.pagination.more;
    if (page.kind !== 'feed' && !emptyFeed) {
        throw new Error('Hacker News did not return a story feed.');
    }
    if (page.pagination.more) {
        page.pagination.more = feedUrl(page.pagination.more, sourceUrl);
    }
    return page;
}
