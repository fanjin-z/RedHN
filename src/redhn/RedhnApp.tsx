import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ParsedComment, ParsedPage, ParsedStory } from './hn/types';

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
                            <PostView
                                comments={page.comments}
                                isSaved={savedStoryIds.has(page.post.id)}
                                isShared={sharedStoryId === page.post.id}
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
                                post={page.post}
                            />
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

type PostViewProps = {
    post: ParsedStory;
    comments: ParsedComment[];
    isSaved: boolean;
    isShared: boolean;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

function PostView({
    post,
    comments,
    isSaved,
    isShared,
    onSave,
    onShare,
}: PostViewProps) {
    const [collapsedCommentIds, setCollapsedCommentIds] = useState(
        () => new Set<number>(),
    );
    const [collapseDepth, setCollapseDepth] = useState<number>();
    const totalComments = countComments(comments);

    const toggleComment = (commentId: number) => {
        setCollapsedCommentIds((current) => {
            const next = new Set(current);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    return (
        <article className="redhn-post">
            <header className="redhn-post__header">
                <div className="redhn-story__meta">
                    <a className="redhn-story__source" href={post.url}>
                        {post.domain ?? 'news.ycombinator.com'}
                    </a>
                    {post.author ? <span>Posted by {post.author}</span> : null}
                    {post.age ? <span>{post.age}</span> : null}
                </div>
                <h1 className="redhn-post__title">{post.title}</h1>
                {post.textHtml ? (
                    <div
                        className="redhn-post__text"
                        dangerouslySetInnerHTML={{
                            __html: sanitizeHnHtml(post.textHtml),
                        }}
                    />
                ) : null}
                <div className="redhn-story__actions">
                    {post.actions.upvote ? (
                        <a className="redhn-action" href={post.actions.upvote}>
                            <span aria-hidden="true">^</span>
                            <span>{formatNumber(post.score)}</span>
                        </a>
                    ) : (
                        <span className="redhn-action">
                            <span aria-hidden="true">^</span>
                            <span>{formatNumber(post.score)}</span>
                        </span>
                    )}
                    <a
                        className="redhn-action"
                        href={post.actions.comments ?? post.hnUrl}
                    >
                        <span aria-hidden="true">[]</span>
                        <span>{formatNumber(post.commentCount)}</span>
                    </a>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(post);
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
                            onSave(post.id);
                        }}
                        type="button"
                    >
                        <span aria-hidden="true">#</span>
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    {post.actions.reply ? (
                        <a className="redhn-action" href={post.actions.reply}>
                            Reply
                        </a>
                    ) : null}
                </div>
            </header>
            <div className="redhn-comment-tools">
                <span>{formatNumber(totalComments)} comments</span>
                <div className="redhn-comment-tools__buttons">
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(2);
                        }}
                        type="button"
                    >
                        Depth 2
                    </button>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(4);
                        }}
                        type="button"
                    >
                        Depth 4
                    </button>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(undefined);
                            setCollapsedCommentIds(new Set());
                        }}
                        type="button"
                    >
                        Expand
                    </button>
                </div>
            </div>
            <section className="redhn-comments" aria-label="Comments">
                {comments.map((comment) => (
                    <CommentThread
                        collapseDepth={collapseDepth}
                        collapsedCommentIds={collapsedCommentIds}
                        comment={comment}
                        key={comment.id}
                        onToggle={toggleComment}
                    />
                ))}
            </section>
        </article>
    );
}

type CommentThreadProps = {
    comment: ParsedComment;
    collapsedCommentIds: Set<number>;
    collapseDepth?: number;
    onToggle: (commentId: number) => void;
};

function CommentThread({
    comment,
    collapsedCommentIds,
    collapseDepth,
    onToggle,
}: CommentThreadProps) {
    const collapsed =
        collapsedCommentIds.has(comment.id) ||
        (collapseDepth !== undefined && comment.depth >= collapseDepth);
    const replies = countComments(comment.children);

    return (
        <article
            className={
                collapsed
                    ? 'redhn-comment redhn-comment--collapsed'
                    : 'redhn-comment'
            }
            style={
                {
                    '--redhn-comment-depth': comment.depth,
                    '--redhn-comment-guide': commentGuideColor(comment.depth),
                } as CSSProperties
            }
        >
            <button
                aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
                className="redhn-comment__guide"
                onClick={() => {
                    onToggle(comment.id);
                }}
                type="button"
            />
            <div className="redhn-comment__body">
                <header className="redhn-comment__header">
                    <span className="redhn-comment__avatar" aria-hidden="true">
                        {(comment.author ?? '?').slice(0, 1)}
                    </span>
                    {comment.author ? (
                        <a
                            className="redhn-comment__author"
                            href={`https://news.ycombinator.com/user?id=${comment.author}`}
                        >
                            {comment.author}
                        </a>
                    ) : (
                        <span className="redhn-comment__author">unknown</span>
                    )}
                    {comment.age ? <span>{comment.age}</span> : null}
                    {replies > 0 ? (
                        <span>{formatNumber(replies)} replies</span>
                    ) : null}
                    <button
                        className="redhn-comment__collapse"
                        onClick={() => {
                            onToggle(comment.id);
                        }}
                        type="button"
                    >
                        {collapsed ? '+' : '-'}
                    </button>
                </header>
                {collapsed ? (
                    <p className="redhn-comment__summary">{comment.text}</p>
                ) : (
                    <>
                        <div
                            className="redhn-comment__text"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHnHtml(comment.html),
                            }}
                        />
                        <div className="redhn-comment__actions">
                            {comment.actions.upvote ? (
                                <a
                                    className="redhn-action"
                                    href={comment.actions.upvote}
                                >
                                    ^
                                </a>
                            ) : null}
                            {comment.actions.reply ? (
                                <a
                                    className="redhn-action"
                                    href={comment.actions.reply}
                                >
                                    Reply
                                </a>
                            ) : null}
                            {comment.actions.parent ? (
                                <a
                                    className="redhn-action"
                                    href={comment.actions.parent}
                                >
                                    Parent
                                </a>
                            ) : null}
                        </div>
                        {comment.children.length > 0 ? (
                            <div className="redhn-comment__children">
                                {comment.children.map((child) => (
                                    <CommentThread
                                        collapseDepth={collapseDepth}
                                        collapsedCommentIds={
                                            collapsedCommentIds
                                        }
                                        comment={child}
                                        key={child.id}
                                        onToggle={onToggle}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </article>
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

function countComments(comments: ParsedComment[]): number {
    return comments.reduce(
        (total, comment) => total + 1 + countComments(comment.children),
        0,
    );
}

function commentGuideColor(depth: number): string {
    const colors = ['#926f66', '#4d7788', '#ad2c00', '#617152', '#6d5b8a'];
    return colors[depth % colors.length];
}

function sanitizeHnHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    for (const element of template.content.querySelectorAll('*')) {
        if (
            [
                'script',
                'style',
                'iframe',
                'object',
                'embed',
                'link',
                'meta',
            ].includes(element.tagName.toLowerCase())
        ) {
            element.remove();
            continue;
        }

        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (
                name.startsWith('on') ||
                ((name === 'href' || name === 'src') &&
                    value.startsWith('javascript:'))
            ) {
                element.removeAttribute(attribute.name);
            }
        }

        if (element.tagName.toLowerCase() === 'a') {
            element.setAttribute('rel', 'nofollow noopener noreferrer');
        }
    }

    return template.innerHTML;
}

function formatNumber(value: number | undefined): string {
    return value === undefined
        ? '-'
        : new Intl.NumberFormat('en-US').format(value);
}
