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

type StoryFeedProps = {
    page: ParsedPage;
    stories: ParsedStory[];
    hiddenStoryCount: number;
    readState: RedhnReadState;
    savedStoryIds: Set<number>;
    sharedStoryId?: number;
    pendingVoteStoryIds: Set<number>;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
    onVote: (story: ParsedStory) => void;
};

export function StoryFeed({
    page,
    stories,
    hiddenStoryCount,
    readState,
    savedStoryIds,
    sharedStoryId,
    pendingVoteStoryIds,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
    onVote,
}: StoryFeedProps) {
    return (
        <section className="redhn-feed" aria-label="Hacker News stories">
            <SortMenu sourceUrl={page.sourceUrl} />
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
                    isVotePending={pendingVoteStoryIds.has(story.id)}
                    key={story.id}
                    onSave={onSave}
                    onShare={onShare}
                    onStoryView={onStoryView}
                    onHnAction={onHnAction}
                    onVote={onVote}
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

function SortMenu({ sourceUrl }: { sourceUrl: string }) {
    const activeSort = getActiveSortOption(sourceUrl);

    if (!activeSort) {
        return null;
    }

    return (
        <details className="redhn-sort-menu">
            <summary className="redhn-sort-menu__button">
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
