import { ArrowFatUpIcon } from '@phosphor-icons/react/dist/csr/ArrowFatUp';
import { BookmarkSimpleIcon } from '@phosphor-icons/react/dist/csr/BookmarkSimple';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree';
import { ShareFatIcon } from '@phosphor-icons/react/dist/csr/ShareFat';
import type { ParsedStory } from '../hn/types';
import { formatNumber } from '../view/format';
import { HnActionLink } from './HnActionLink';
import { userInitials } from './UserAvatar';

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

export function StoryCard({
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
    const creditAuthor = story.author ?? 'unknown';

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
                    <div className="redhn-story__credit">
                        <span
                            className="redhn-story__avatar"
                            aria-hidden="true"
                        >
                            {userInitials(creditAuthor)}
                        </span>
                        {story.author ? (
                            <a
                                className="redhn-story__author"
                                href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                                    story.author,
                                )}`}
                            >
                                u/{story.author}
                            </a>
                        ) : (
                            <span className="redhn-story__author">
                                u/{creditAuthor}
                            </span>
                        )}
                        {story.age ? (
                            <>
                                <span
                                    className="redhn-story__credit-dot"
                                    aria-hidden="true"
                                >
                                    •
                                </span>
                                <span>{story.age}</span>
                            </>
                        ) : null}
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
                <a
                    className="redhn-story__source-link"
                    href={story.url}
                    title={story.url}
                >
                    {story.url || sourceLabel}
                </a>
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
