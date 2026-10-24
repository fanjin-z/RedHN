import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import type { ParsedPage, ParsedStory } from '../hn/types';
import type { RedhnReadState } from '../state/readState';
import { formatNumber } from '../view/format';
import {
    getActiveSortOption,
    redhnSortOptions,
    type RedhnSortOption,
} from '../view/sortOptions';
import { StoryCard } from './StoryCard';
import { useCloseOnOutsidePointer } from './useCloseOnOutsidePointer';

type StoryFeedProps = {
    page: ParsedPage;
    stories: ParsedStory[];
    hiddenStoryCount: number;
    readState: RedhnReadState;
    sharedStoryId?: number;
    pendingVoteStoryIds: Set<number>;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
    onVote: (story: ParsedStory) => void;
    feedRef?: RefObject<HTMLElement | null>;
    loading?: boolean;
    loadError?: string;
    more?: string;
    ready?: boolean;
    onLoadMore?: () => Promise<void>;
};

export function StoryFeed({
    page,
    stories,
    hiddenStoryCount,
    readState,
    sharedStoryId,
    pendingVoteStoryIds,
    onShare,
    onStoryView,
    onHnAction,
    onVote,
    feedRef,
    loading = false,
    loadError,
    more: nextUrl,
    ready = false,
    onLoadMore,
}: StoryFeedProps) {
    const more = onLoadMore ? nextUrl : page.pagination.more;
    const moreRef = useRef<HTMLDivElement>(null);
    const progress = useRef({ more, visible: stories.length, empty: 0 });

    useEffect(() => {
        if (progress.current.more !== more) {
            progress.current = {
                more,
                visible: stories.length,
                empty:
                    stories.length > progress.current.visible
                        ? 0
                        : progress.current.empty + 1,
            };
        } else if (stories.length !== progress.current.visible) {
            progress.current.visible = stories.length;
            progress.current.empty = 0;
        }
    }, [more, stories.length]);

    useEffect(() => {
        const target = moreRef.current;
        if (
            !target ||
            !ready ||
            !onLoadMore ||
            !more ||
            loading ||
            loadError ||
            progress.current.empty >= 3 ||
            typeof IntersectionObserver === 'undefined'
        )
            return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    void onLoadMore();
                }
            },
            { rootMargin: '600px 0px' },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [ready, more, loading, loadError, onLoadMore, stories.length]);

    return (
        <section
            className="redhn-feed"
            aria-label="Hacker News stories"
            ref={feedRef}
        >
            <SortMenu sourceUrl={page.sourceUrl} />
            {hiddenStoryCount > 0 ? (
                <p className="redhn-feed__muted">
                    {formatNumber(hiddenStoryCount)} muted
                </p>
            ) : null}
            {stories.map((story) => (
                <StoryCard
                    isShared={sharedStoryId === story.id}
                    isViewed={readState.viewedStoryIds[story.id] !== undefined}
                    isVotePending={pendingVoteStoryIds.has(story.id)}
                    key={story.id}
                    onShare={onShare}
                    onStoryView={onStoryView}
                    onHnAction={onHnAction}
                    onVote={onVote}
                    story={story}
                />
            ))}
            {onLoadMore ? (
                <div className="redhn-feed__more" ref={moreRef}>
                    <p className="redhn-feed__status" role="status">
                        {loading
                            ? 'Loading more stories…'
                            : (loadError ?? (more ? '' : 'No more stories.'))}
                    </p>
                    {more ? (
                        <button
                            className="redhn-button redhn-button--primary"
                            disabled={loading || !ready}
                            onClick={() => {
                                progress.current.empty = 0;
                                void onLoadMore();
                            }}
                            type="button"
                        >
                            {loadError ? 'Try again' : 'Load more'}
                        </button>
                    ) : null}
                    {loadError && more ? (
                        <a href={more}>Open next page</a>
                    ) : null}
                </div>
            ) : more ? (
                <div className="redhn-feed__more">
                    <a
                        className="redhn-button redhn-button--primary"
                        href={more}
                    >
                        View More
                    </a>
                </div>
            ) : null}
        </section>
    );
}

function SortMenu({ sourceUrl }: { sourceUrl: string }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const activeSort = getActiveSortOption(sourceUrl);
    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);
    const menuRef = useCloseOnOutsidePointer<HTMLDetailsElement>({
        open: menuOpen,
        onClose: closeMenu,
    });

    if (!activeSort) {
        return null;
    }

    return (
        <details className="redhn-sort-menu" open={menuOpen} ref={menuRef}>
            <summary
                className="redhn-sort-menu__button"
                onClick={(event) => {
                    event.preventDefault();
                    setMenuOpen((current) => !current);
                }}
            >
                <span>{activeSort.label}</span>
                <CaretDownIcon aria-hidden="true" weight="bold" />
            </summary>
            <div className="redhn-sort-menu__panel" role="menu">
                <p className="redhn-sort-menu__title">View</p>
                {redhnSortOptions.map((option) => (
                    <SortMenuItem
                        active={option.path === activeSort.path}
                        key={option.path}
                        option={option}
                    />
                ))}
            </div>
        </details>
    );
}

function SortMenuItem({
    active,
    option,
}: {
    active: boolean;
    option: RedhnSortOption;
}) {
    return (
        <a
            aria-current={active ? 'page' : undefined}
            className={
                active
                    ? 'redhn-sort-menu__item redhn-sort-menu__item--active'
                    : 'redhn-sort-menu__item'
            }
            href={option.href}
            role="menuitem"
        >
            <span>{option.label}</span>
            {active ? <CheckIcon aria-hidden="true" weight="bold" /> : null}
        </a>
    );
}
