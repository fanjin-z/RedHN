import type { ParsedAuthMode } from '../hn/types';

export function hnLoginUrl(sourceUrl: string, mode: ParsedAuthMode): string {
    let goto = 'news';

    try {
        const url = new URL(sourceUrl);
        const path = url.pathname.replace(/^\/+/, '');
        goto = `${path || 'news'}${url.search}`;
    } catch {
        goto = sourceUrl.replace(/^https:\/\/news\.ycombinator\.com\/?/, '');
    }

    return `https://news.ycombinator.com/login?goto=${encodeURIComponent(
        goto || 'news',
    )}#${mode}`;
}

export function hnItemUrl(id: number): string {
    return `https://news.ycombinator.com/item?id=${id}`;
}
