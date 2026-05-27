import {
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { ArrowFatUpIcon } from '@phosphor-icons/react/dist/csr/ArrowFatUp';
import { BookmarkSimpleIcon } from '@phosphor-icons/react/dist/csr/BookmarkSimple';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree';
import { ShareFatIcon } from '@phosphor-icons/react/dist/csr/ShareFat';
import { sendRedhnMessage } from './api/backgroundClient';
import type { HnApiItem } from './api/hnApi';
import { performHnAction } from './hn/actions';
import type { ParsedComment, ParsedPage, ParsedStory } from './hn/types';
import {
    applyStoryFilters,
    defaultFilters,
    normalizeFilters,
    termsFromInput,
    termsToInput,
    type RedhnFilters,
} from './state/filters';
import {
    defaultPreferences,
    normalizePreferences,
    type RedhnPreferences,
} from './state/preferences';
import {
    countNewComments,
    defaultReadState,
    markPageRead,
    markStoryViewed,
    type RedhnReadState,
} from './state/readState';
import {
    filtersItem,
    preferencesItem,
    readStateItem,
    savedStoryIdsItem,
} from './state/storage';

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

export default function RedhnApp({ page, onClassicToggle }: RedhnAppProps) {
    const [enabled, setEnabled] = useState(true);
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    const [preferences, setPreferences] =
        useState<RedhnPreferences>(defaultPreferences);
    const [filters, setFilters] = useState<RedhnFilters>(defaultFilters);
    const [readState, setReadState] =
        useState<RedhnReadState>(defaultReadState);
    const [stateLoaded, setStateLoaded] = useState(false);
    const [savedStoryIds, setSavedStoryIds] = useState(() => new Set<number>());
    const [sharedStoryId, setSharedStoryId] = useState<number>();
    const [newCommentCount, setNewCommentCount] = useState(0);
    const [apiItems, setApiItems] = useState<Record<number, HnApiItem | null>>(
        {},
    );
    const title = useMemo(
        () => page.post?.title ?? 'Hacker News',
        [page.post?.title],
    );
    const visibleStories = useMemo(
        () => applyStoryFilters(page.stories, filters),
        [filters, page.stories],
    );
    const enrichedStories = useMemo(
        () =>
            visibleStories.map((story) =>
                enrichStoryWithApiItem(story, apiItems[story.id]),
            ),
        [apiItems, visibleStories],
    );
    const enrichedPost = page.post
        ? enrichStoryWithApiItem(page.post, apiItems[page.post.id])
        : undefined;
    const hiddenStoryCount = page.stories.length - visibleStories.length;

    const updatePreferences = (patch: Partial<RedhnPreferences>) => {
        setPreferences((current) => {
            const next = normalizePreferences({ ...current, ...patch });
            void preferencesItem.setValue(next);
            return next;
        });
    };

    const updateFilters = (patch: Partial<RedhnFilters>) => {
        setFilters((current) => {
            const next = normalizeFilters({ ...current, ...patch });
            void filtersItem.setValue(next);
            return next;
        });
    };

    const toggleSavedStory = (storyId: number) => {
        setSavedStoryIds((current) => {
            const next = new Set(current);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            void savedStoryIdsItem.setValue(Array.from(next));
            return next;
        });
    };

    const markViewed = (storyId: number) => {
        setReadState((current) => {
            const next = markStoryViewed(current, storyId, Date.now());
            void readStateItem.setValue(next);
            return next;
        });
    };

    const runHnAction = (href: string) => {
        void performHnAction(href).then((result) => {
            if (result.kind === 'navigate' || result.kind === 'failed') {
                window.location.assign(result.url);
            }
        });
    };

    useEffect(() => {
        onClassicToggle(enabled);
    }, [enabled, onClassicToggle]);

    useEffect(() => {
        let active = true;

        void Promise.all([
            preferencesItem.getValue(),
            filtersItem.getValue(),
            readStateItem.getValue(),
            savedStoryIdsItem.getValue(),
        ]).then(
            ([storedPreferences, storedFilters, storedReadState, savedIds]) => {
                if (!active) {
                    return;
                }

                setPreferences(normalizePreferences(storedPreferences));
                setFilters(normalizeFilters(storedFilters));
                setReadState(storedReadState);
                setSavedStoryIds(new Set(savedIds));
                setStateLoaded(true);
            },
        );

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!stateLoaded || !page.post) {
            return;
        }

        setNewCommentCount(countNewComments(readState, page));
        const next = markPageRead(readState, page, Date.now());
        setReadState(next);
        void readStateItem.setValue(next);
    }, [page, stateLoaded]);

    useEffect(() => {
        const ids = page.post
            ? [page.post.id]
            : visibleStories.slice(0, 30).map((story) => story.id);

        if (ids.length === 0) {
            return;
        }

        let active = true;
        void sendRedhnMessage({ type: 'redhn:getItems', ids }).then(
            (response) => {
                if (!active || !response.ok) {
                    return;
                }

                setApiItems((current) => ({
                    ...current,
                    ...response.data,
                }));
            },
        );

        return () => {
            active = false;
        };
    }, [page.post, visibleStories]);

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
        <div
            className={`redhn-shell redhn-shell--${preferences.theme}`}
            style={
                {
                    '--redhn-user-font-size': `${preferences.fontSize}px`,
                    '--redhn-user-line-height': preferences.lineHeight,
                    '--redhn-content-width': `${preferences.maxWidth}px`,
                } as CSSProperties
            }
        >
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
                    <button
                        className="redhn-button"
                        onClick={() => {
                            setPreferencesOpen((current) => !current);
                        }}
                        type="button"
                    >
                        Settings
                    </button>
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
            {preferencesOpen ? (
                <PreferencesPanel
                    filters={filters}
                    onFiltersChange={updateFilters}
                    onPreferencesChange={updatePreferences}
                    preferences={preferences}
                />
            ) : null}
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
                        </div>
                        {page.kind === 'item' && enrichedPost ? (
                            <PostView
                                comments={page.comments}
                                isSaved={savedStoryIds.has(enrichedPost.id)}
                                isShared={sharedStoryId === enrichedPost.id}
                                newCommentCount={newCommentCount}
                                onHnAction={runHnAction}
                                onSave={toggleSavedStory}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                post={enrichedPost}
                            />
                        ) : (
                            <StoryFeed
                                hiddenStoryCount={hiddenStoryCount}
                                onSave={toggleSavedStory}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                page={page}
                                readState={readState}
                                savedStoryIds={savedStoryIds}
                                sharedStoryId={sharedStoryId}
                                stories={enrichedStories}
                                onStoryView={markViewed}
                                onHnAction={runHnAction}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

type PreferencesPanelProps = {
    preferences: RedhnPreferences;
    filters: RedhnFilters;
    onPreferencesChange: (patch: Partial<RedhnPreferences>) => void;
    onFiltersChange: (patch: Partial<RedhnFilters>) => void;
};

function PreferencesPanel({
    preferences,
    filters,
    onPreferencesChange,
    onFiltersChange,
}: PreferencesPanelProps) {
    return (
        <section className="redhn-preferences" aria-label="Preferences">
            <label className="redhn-field">
                <span>Theme</span>
                <select
                    value={preferences.theme}
                    onChange={(event) => {
                        onPreferencesChange({
                            theme: event.currentTarget
                                .value as RedhnPreferences['theme'],
                        });
                    }}
                >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </label>
            <label className="redhn-field">
                <span>Font</span>
                <input
                    max="20"
                    min="12"
                    onChange={(event) => {
                        onPreferencesChange({
                            fontSize: event.currentTarget.valueAsNumber,
                        });
                    }}
                    type="range"
                    value={preferences.fontSize}
                />
            </label>
            <label className="redhn-field">
                <span>Line</span>
                <input
                    max="1.9"
                    min="1.2"
                    onChange={(event) => {
                        onPreferencesChange({
                            lineHeight: event.currentTarget.valueAsNumber,
                        });
                    }}
                    step="0.05"
                    type="range"
                    value={preferences.lineHeight}
                />
            </label>
            <label className="redhn-field">
                <span>Width</span>
                <input
                    max="1600"
                    min="720"
                    onChange={(event) => {
                        onPreferencesChange({
                            maxWidth: event.currentTarget.valueAsNumber,
                        });
                    }}
                    step="40"
                    type="range"
                    value={preferences.maxWidth}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Keywords</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedKeywords: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="ai, crypto, launch"
                    type="text"
                    value={termsToInput(filters.mutedKeywords)}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Domains</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedDomains: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="example.com"
                    type="text"
                    value={termsToInput(filters.mutedDomains)}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Topics</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedTopics: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="ask hn, show hn"
                    type="text"
                    value={termsToInput(filters.mutedTopics)}
                />
            </label>
        </section>
    );
}

type PostViewProps = {
    post: ParsedStory;
    comments: ParsedComment[];
    isSaved: boolean;
    isShared: boolean;
    newCommentCount: number;
    onHnAction: (href: string) => void;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

function PostView({
    post,
    comments,
    isSaved,
    isShared,
    newCommentCount,
    onHnAction,
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
                        <HnActionLink
                            className="redhn-action"
                            href={post.actions.upvote}
                            onHnAction={onHnAction}
                        >
                            <span aria-hidden="true">^</span>
                            <span>{formatNumber(post.score)}</span>
                        </HnActionLink>
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
                        <HnActionLink
                            className="redhn-action"
                            href={post.actions.reply}
                            onHnAction={onHnAction}
                        >
                            Reply
                        </HnActionLink>
                    ) : null}
                </div>
            </header>
            <div className="redhn-comment-tools">
                <span>
                    {formatNumber(totalComments)} comments
                    {newCommentCount > 0
                        ? ` / ${formatNumber(newCommentCount)} new`
                        : ''}
                </span>
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
                        onHnAction={onHnAction}
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
    onHnAction: (href: string) => void;
    onToggle: (commentId: number) => void;
};

function CommentThread({
    comment,
    collapsedCommentIds,
    collapseDepth,
    onHnAction,
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
                                <HnActionLink
                                    className="redhn-action"
                                    href={comment.actions.upvote}
                                    onHnAction={onHnAction}
                                >
                                    ^
                                </HnActionLink>
                            ) : null}
                            {comment.actions.reply ? (
                                <HnActionLink
                                    className="redhn-action"
                                    href={comment.actions.reply}
                                    onHnAction={onHnAction}
                                >
                                    Reply
                                </HnActionLink>
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
                                        onHnAction={onHnAction}
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
    page: ParsedPage;
    stories: ParsedStory[];
    hiddenStoryCount: number;
    readState: RedhnReadState;
    savedStoryIds: Set<number>;
    sharedStoryId?: number;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
};

function StoryFeed({
    page,
    stories,
    hiddenStoryCount,
    readState,
    savedStoryIds,
    sharedStoryId,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
}: StoryFeedProps) {
    return (
        <section className="redhn-feed" aria-label="Hacker News stories">
            {hiddenStoryCount > 0 ? (
                <p className="redhn-feed__muted">
                    {formatNumber(hiddenStoryCount)} muted
                </p>
            ) : null}
            {stories.map((story) => (
                <StoryCard
                    isSaved={savedStoryIds.has(story.id)}
                    isShared={sharedStoryId === story.id}
                    isViewed={readState.viewedStoryIds[story.id] !== undefined}
                    key={story.id}
                    onSave={onSave}
                    onShare={onShare}
                    onStoryView={onStoryView}
                    onHnAction={onHnAction}
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
    story: ParsedStory;
    isSaved: boolean;
    isShared: boolean;
    isViewed: boolean;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
};

function StoryCard({
    story,
    isSaved,
    isShared,
    isViewed,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
}: StoryCardProps) {
    const sourceLabel = story.domain ?? 'news.ycombinator.com';
    const commentsHref = story.actions.comments ?? story.hnUrl;

    return (
        <article
            className={
                isViewed ? 'redhn-story redhn-story--viewed' : 'redhn-story'
            }
        >
            <a
                aria-label={`Open comments for ${story.title}`}
                className="redhn-story__card-link"
                href={commentsHref}
                onClick={() => {
                    onStoryView(story.id);
                }}
            />
            <div className="redhn-story__content">
                <header className="redhn-story__header">
                    <div className="redhn-story__meta">
                        <a className="redhn-story__source" href={story.url}>
                            {sourceLabel}
                        </a>
                        {story.author ? (
                            <span>Posted by {story.author}</span>
                        ) : null}
                        {story.age ? <span>{story.age}</span> : null}
                    </div>
                    <details className="redhn-story__menu">
                        <summary aria-label="More story actions">
                            <DotsThreeIcon
                                aria-hidden="true"
                                className="redhn-story__menu-icon"
                                weight="bold"
                            />
                        </summary>
                        <div className="redhn-story__menu-panel">
                            <button
                                className="redhn-story__menu-item"
                                onClick={() => {
                                    onSave(story.id);
                                }}
                                type="button"
                            >
                                <BookmarkSimpleIcon
                                    aria-hidden="true"
                                    className="redhn-story__menu-item-icon"
                                    weight={isSaved ? 'fill' : 'bold'}
                                />
                                {isSaved ? 'Saved' : 'Save'}
                            </button>
                            {story.actions.hide ? (
                                <HnActionLink
                                    className="redhn-story__menu-item"
                                    href={story.actions.hide}
                                    onHnAction={onHnAction}
                                >
                                    Hide
                                </HnActionLink>
                            ) : null}
                        </div>
                    </details>
                </header>
                <h2 className="redhn-story__title">{story.title}</h2>
                <div className="redhn-story__actions redhn-story__actions--card">
                    {story.actions.upvote ? (
                        <HnActionLink
                            aria-label="Upvote"
                            className="redhn-action redhn-action--vote"
                            href={story.actions.upvote}
                            onHnAction={onHnAction}
                        >
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(story.score)}</span>
                        </HnActionLink>
                    ) : (
                        <span className="redhn-action redhn-action--vote redhn-action--disabled">
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(story.score)}</span>
                        </span>
                    )}
                    <a
                        className="redhn-action"
                        href={commentsHref}
                        onClick={() => {
                            onStoryView(story.id);
                        }}
                    >
                        <ChatCircleIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight="bold"
                        />
                        <span>{formatNumber(story.commentCount)}</span>
                    </a>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(story);
                        }}
                        type="button"
                    >
                        <ShareFatIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight="bold"
                        />
                        <span>{isShared ? 'Copied' : 'Share'}</span>
                    </button>
                </div>
            </div>
        </article>
    );
}

type HnActionLinkProps = {
    href: string;
    className: string;
    children: ReactNode;
    onHnAction: (href: string) => void;
    'aria-label'?: string;
};

function HnActionLink({
    href,
    className,
    children,
    onHnAction,
    'aria-label': ariaLabel,
}: HnActionLinkProps) {
    return (
        <a
            aria-label={ariaLabel}
            className={className}
            href={href}
            onClick={(event) => {
                event.preventDefault();
                onHnAction(href);
            }}
        >
            {children}
        </a>
    );
}

function countComments(comments: ParsedComment[]): number {
    return comments.reduce(
        (total, comment) => total + 1 + countComments(comment.children),
        0,
    );
}

function enrichStoryWithApiItem(
    story: ParsedStory,
    item: HnApiItem | null | undefined,
): ParsedStory {
    if (!item) {
        return story;
    }

    return {
        ...story,
        title: item.title ?? story.title,
        url: item.url ?? story.url,
        author: item.by ?? story.author,
        score: item.score ?? story.score,
        commentCount: item.descendants ?? story.commentCount,
    };
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
