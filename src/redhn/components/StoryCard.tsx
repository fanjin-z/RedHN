import { useCallback, useState } from 'react';
import {
    ArrowFatUpIcon,
    BookmarkSimpleIcon,
    ChatCircleIcon,
    DotsThreeIcon,
    ShareFatIcon,
} from '@phosphor-icons/react';
import type { ParsedStory } from '../hn/types';
import { formatNumber } from '../view/format';
import { HnActionLink } from './HnActionLink';
import { useCloseOnOutsidePointer } from './useCloseOnOutsidePointer';
import { userInitials } from './UserAvatar';

type StoryCardProps = {
    story: ParsedStory;
    isSaved: boolean;
    isShared: boolean;
    isViewed: boolean;
    isVotePending: boolean;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
    onVote: (story: ParsedStory) => void;
};

export function StoryCard({
    story,
    isSaved,
    isShared,
    isViewed,
    isVotePending,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
    onVote,
}: StoryCardProps) {
    const sourceLabel = story.domain ?? 'news.ycombinator.com';
    const commentsHref = story.actions.comments ?? story.hnUrl;
    const creditAuthor = story.author ?? 'unknown';
    const isUpvoted = Boolean(story.actions.unvote);
    const voteHref = story.actions.unvote ?? story.actions.upvote;
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);
    const menuRef = useCloseOnOutsidePointer<HTMLDetailsElement>({
        open: menuOpen,
        onClose: closeMenu,
    });

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
                    <details
                        className="redhn-story__menu"
                        open={menuOpen}
                        ref={menuRef}
                    >
                        <summary
                            aria-label="More story actions"
                            onClick={(event) => {
                                event.preventDefault();
                                setMenuOpen((current) => !current);
                            }}
                        >
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
                    {voteHref ? (
                        <button
                            aria-label={isUpvoted ? 'Remove upvote' : 'Upvote'}
                            aria-pressed={isUpvoted}
                            className={
                                isUpvoted
                                    ? 'redhn-action redhn-action--vote redhn-action--active'
                                    : 'redhn-action redhn-action--vote'
                            }
                            disabled={isVotePending}
                            onClick={() => {
                                onVote(story);
                            }}
                            type="button"
                        >
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight={isUpvoted ? 'fill' : 'bold'}
                            />
                            <span>{formatNumber(story.score)}</span>
                        </button>
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
