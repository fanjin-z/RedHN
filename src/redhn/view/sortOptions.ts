export type RedhnSortOption = {
    label: string;
    href: string;
    path: string;
};

export const redhnSortOptions: RedhnSortOption[] = [
    {
        label: 'Top Stories',
        href: 'https://news.ycombinator.com/news',
        path: '/news',
    },
    {
        label: 'Best',
        href: 'https://news.ycombinator.com/best',
        path: '/best',
    },
    {
        label: 'New',
        href: 'https://news.ycombinator.com/newest',
        path: '/newest',
    },
];

export function getActiveSortOption(
    sourceUrl: string,
): RedhnSortOption | undefined {
    return redhnSortOptions.find((option) =>
        isActivePath(sourceUrl, option.path),
    );
}

export function isActivePath(sourceUrl: string, path: string): boolean {
    try {
        const sourcePath = new URL(sourceUrl).pathname;
        return sourcePath === path || (sourcePath === '/' && path === '/news');
    } catch {
        return false;
    }
}
