import { useEffect, useMemo, useState } from 'react';
import type { ParsedPage } from './hn/types';

type RedhnAppProps = {
    page: ParsedPage;
    onClassicToggle: (enabled: boolean) => void;
};

const navItems = [
    { label: 'Home', href: 'https://news.ycombinator.com/news' },
    { label: 'Popular', href: 'https://news.ycombinator.com/best' },
    { label: 'New', href: 'https://news.ycombinator.com/newest' },
    { label: 'Ask HN', href: 'https://news.ycombinator.com/ask' },
    { label: 'Show HN', href: 'https://news.ycombinator.com/show' },
    { label: 'Jobs', href: 'https://news.ycombinator.com/jobs' },
];

export default function RedhnApp({ page, onClassicToggle }: RedhnAppProps) {
    const [enabled, setEnabled] = useState(true);
    const title = useMemo(
        () => page.post?.title ?? 'Hacker News',
        [page.post?.title],
    );

    useEffect(() => {
        onClassicToggle(enabled);
    }, [enabled, onClassicToggle]);

    if (!enabled) {
        return (
            <div className="redhn-classic-bar">
                <strong>RedHN</strong>
                <button
                    className="redhn-button redhn-button--primary"
                    type="button"
                    onClick={() => {
                        setEnabled(true);
                    }}
                >
                    Enable
                </button>
            </div>
        );
    }

    return (
        <div className="redhn-shell">
            <header className="redhn-topbar">
                <a
                    className="redhn-brand"
                    href="https://news.ycombinator.com/news"
                >
                    <span className="redhn-brand__mark">R</span>
                    <span>RedHN</span>
                    <span className="redhn-brand__submark">Hacker News</span>
                </a>
                <form
                    className="redhn-search"
                    action="https://hn.algolia.com/"
                    method="get"
                >
                    <label className="redhn-sr-only" htmlFor="redhn-search">
                        Search Hacker News
                    </label>
                    <span aria-hidden="true" className="redhn-search__icon">
                        /
                    </span>
                    <input
                        id="redhn-search"
                        name="q"
                        placeholder="Search Hacker News"
                        type="search"
                    />
                </form>
                <div className="redhn-topbar__actions">
                    <a
                        className="redhn-button"
                        href="https://news.ycombinator.com/submit"
                    >
                        Create
                    </a>
                    <label className="redhn-switch">
                        <input
                            checked={enabled}
                            onChange={(event) => {
                                setEnabled(event.currentTarget.checked);
                            }}
                            type="checkbox"
                        />
                        <span>RedHN</span>
                    </label>
                </div>
            </header>
            <div className="redhn-layout">
                <aside
                    className="redhn-sidebar"
                    aria-label="Hacker News navigation"
                >
                    <nav className="redhn-nav">
                        {navItems.map((item) => (
                            <a
                                className="redhn-nav__item"
                                href={item.href}
                                key={item.href}
                            >
                                <span
                                    className="redhn-nav__icon"
                                    aria-hidden="true"
                                >
                                    {item.label.slice(0, 1)}
                                </span>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                    <div className="redhn-sidebar__footer">
                        <a href="https://news.ycombinator.com/newsguidelines.html">
                            Guidelines
                        </a>
                        <a href="https://news.ycombinator.com/newsfaq.html">
                            FAQ
                        </a>
                    </div>
                </aside>
                <main className="redhn-main" aria-label={title}>
                    <div className="redhn-main__inner">
                        <div
                            className="redhn-tabs"
                            role="navigation"
                            aria-label="Sort"
                        >
                            <a
                                className="redhn-tabs__item redhn-tabs__item--active"
                                href="news"
                            >
                                Best
                            </a>
                            <a className="redhn-tabs__item" href="newest">
                                New
                            </a>
                            <a className="redhn-tabs__item" href="best">
                                Top
                            </a>
                        </div>
                        <section className="redhn-surface" aria-label={title}>
                            {page.kind === 'item' && page.post ? (
                                <h1 className="redhn-page-title">
                                    {page.post.title}
                                </h1>
                            ) : (
                                <h1 className="redhn-page-title">
                                    Hacker News
                                </h1>
                            )}
                            <p className="redhn-page-meta">
                                {page.kind === 'item'
                                    ? `${page.comments.length} top-level comments`
                                    : `${page.stories.length} stories`}
                            </p>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
