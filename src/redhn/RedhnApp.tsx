import { useEffect, useMemo, useState } from 'react';
import type { ParsedPage, ParsedStory } from './hn/types';

type RedhnAppProps = {
    page: ParsedPage;
    onClassicToggle: (enabled: boolean) => void;
};

const navItems = [
    { label: 'Home', href: 'https://news.ycombinator.com/news' },
    { label: 'Popular', href: 'https://news.ycombinator.com/best' },
    { label: 'Top', href: 'https://news.ycombinator.com/front' },
    { label: 'New', href: 'https://news.ycombinator.com/newest' },
    { label: 'Ask HN', href: 'https://news.ycombinator.com/ask' },
    { label: 'Show HN', href: 'https://news.ycombinator.com/show' },
    { label: 'Jobs', href: 'https://news.ycombinator.com/jobs' },
    { label: 'Saved', href: 'https://news.ycombinator.com/favorites' },
];

type Density = 'card' | 'compact';

export default function RedhnApp({ page, onClassicToggle }: RedhnAppProps) {
    const [enabled, setEnabled] = useState(true);
    const [density, setDensity] = useState<Density>('card');
    const [savedStoryIds, setSavedStoryIds] = useState(() => new Set<number>());
    const [sharedStoryId, setSharedStoryId] = useState<number>();
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
                                href="https://news.ycombinator.com/news"
                            >
                                Best
                            </a>
                            <a
                                className="redhn-tabs__item"
                                href="https://news.ycombinator.com/newest"
                            >
                                New
                            </a>
                            <a
                                className="redhn-tabs__item"
                                href="https://news.ycombinator.com/best"
                            >
                                Top
                            </a>
                            <div
                                className="redhn-density"
                                role="group"
                                aria-label="Density"
                            >
                                <button
                                    className={
                                        density === 'card'
                                            ? 'redhn-density__button redhn-density__button--active'
                                            : 'redhn-density__button'
                                    }
                                    onClick={() => {
                                        setDensity('card');
                                    }}
                                    type="button"
                                >
                                    Card
                                </button>
                                <button
                                    className={
                                        density === 'compact'
                                            ? 'redhn-density__button redhn-density__button--active'
                                            : 'redhn-density__button'
                                    }
                                    onClick={() => {
                                        setDensity('compact');
                                    }}
                                    type="button"
                                >
                                    Compact
                                </button>
                            </div>
                        </div>
                        {page.kind === 'item' && page.post ? (
                            <section
                                className="redhn-surface"
                                aria-label={title}
                            >
                                <h1 className="redhn-page-title">
                                    {page.post.title}
                                </h1>
                                <p className="redhn-page-meta">
                                    {page.comments.length} top-level comments
                                </p>
                            </section>
                        ) : (
                            <StoryFeed
                                density={density}
                                onSave={(storyId) => {
                                    setSavedStoryIds((current) => {
                                        const next = new Set(current);
                                        if (next.has(storyId)) {
                                            next.delete(storyId);
                                        } else {
                                            next.add(storyId);
                                        }
                                        return next;
                                    });
                                }}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                page={page}
                                savedStoryIds={savedStoryIds}
                                sharedStoryId={sharedStoryId}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

type StoryFeedProps = {
    density: Density;
    page: ParsedPage;
    savedStoryIds: Set<number>;
    sharedStoryId?: number;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

function StoryFeed({
    density,
    page,
    savedStoryIds,
    sharedStoryId,
    onSave,
    onShare,
}: StoryFeedProps) {
    return (
        <section
            className={`redhn-feed redhn-feed--${density}`}
            aria-label="Hacker News stories"
        >
            {page.stories.map((story) => (
                <StoryCard
                    density={density}
                    isSaved={savedStoryIds.has(story.id)}
                    isShared={sharedStoryId === story.id}
                    key={story.id}
                    onSave={onSave}
                    onShare={onShare}
                    story={story}
                />
            ))}
            {page.pagination.more ? (
                <div className="redhn-feed__more">
                    <a
                        className="redhn-button redhn-button--primary"
                        href={page.pagination.more}
                    >
                        View More
                    </a>
                </div>
            ) : null}
        </section>
    );
}

type StoryCardProps = {
    density: Density;
    story: ParsedStory;
    isSaved: boolean;
    isShared: boolean;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

function StoryCard({
    density,
    story,
    isSaved,
    isShared,
    onSave,
    onShare,
}: StoryCardProps) {
    const sourceLabel = story.domain ?? 'news.ycombinator.com';

    return (
        <article className={`redhn-story redhn-story--${density}`}>
            <div className="redhn-story__vote" aria-label="Story score">
                {story.actions.upvote ? (
                    <a
                        aria-label="Upvote"
                        className="redhn-icon-button"
                        href={story.actions.upvote}
                    >
                        ^
                    </a>
                ) : (
                    <span className="redhn-icon-button redhn-icon-button--disabled">
                        ^
                    </span>
                )}
                <span className="redhn-story__score">
                    {formatNumber(story.score)}
                </span>
            </div>
            <div className="redhn-story__content">
                <div className="redhn-story__meta">
                    <a className="redhn-story__source" href={story.url}>
                        {sourceLabel}
                    </a>
                    {story.author ? (
                        <span>Posted by {story.author}</span>
                    ) : null}
                    {story.age ? <span>{story.age}</span> : null}
                </div>
                <h2 className="redhn-story__title">
                    <a href={story.url}>{story.title}</a>
                </h2>
                <div className="redhn-story__actions">
                    <a
                        className="redhn-action"
                        href={story.actions.comments ?? story.hnUrl}
                    >
                        <span aria-hidden="true">[]</span>
                        <span>{formatNumber(story.commentCount)}</span>
                    </a>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(story);
                        }}
                        type="button"
                    >
                        <span aria-hidden="true">/</span>
                        <span>{isShared ? 'Copied' : 'Share'}</span>
                    </button>
                    <button
                        className={
                            isSaved
                                ? 'redhn-action redhn-action--active'
                                : 'redhn-action'
                        }
                        onClick={() => {
                            onSave(story.id);
                        }}
                        type="button"
                    >
                        <span aria-hidden="true">#</span>
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    {story.actions.hide ? (
                        <a className="redhn-action" href={story.actions.hide}>
                            Hide
                        </a>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function formatNumber(value: number | undefined): string {
    return value === undefined
        ? '-'
        : new Intl.NumberFormat('en-US').format(value);
}
