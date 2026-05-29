import type { ParsedPage, ParsedStory } from '../hn/types';
import type { RedhnReadState } from '../state/readState';
import { formatNumber } from '../view/format';
import { StoryCard } from './StoryCard';

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

export function StoryFeed({
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
