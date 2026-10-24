import { useCallback, useRef, useState } from 'react';
import {
    ArrowFatUpIcon,
    BookmarkSimpleIcon,
    ChatCircleIcon,
    DotsThreeIcon,
    ShareFatIcon,
} from '@phosphor-icons/react';
import type { ParsedComment, ParsedStory } from '../hn/types';
import { hasVoteAuth } from '../hn/votes';
import { CommentThread } from '../components/CommentThread';
import { HnActionLink } from '../components/HnActionLink';
import { ReplyComposer } from '../components/ReplyComposer';
import { submitHnReply, type HnReplyResult } from '../hn/actions';
import { formatNumber } from '../view/format';
import { renderHnHtml } from '../view/html';
import { userInitials } from '../components/UserAvatar';
import { useCloseOnOutsidePointer } from '../components/useCloseOnOutsidePointer';

type PostPageProps = {
    post: ParsedStory;
    comments: ParsedComment[];
    isFavoritePending: boolean;
    isShared: boolean;
    isVotePending: boolean;
    pendingVoteCommentIds: Set<number>;
    onCommentVote: (comment: ParsedComment) => void;
    onFavorite: (story: ParsedStory) => void;
    onHnAction: (href: string) => void;
    onShare: (story: ParsedStory) => void;
    onVote: (story: ParsedStory) => void;
};

export function PostPage({
    post,
    comments,
    isFavoritePending,
    isShared,
    isVotePending,
    pendingVoteCommentIds,
    onCommentVote,
    onFavorite,
    onHnAction,
    onShare,
    onVote,
}: PostPageProps) {
    const postReplyComposerRef = useRef<HTMLTextAreaElement>(null);
    const [collapsedCommentIds, setCollapsedCommentIds] = useState(
        () => new Set<number>(),
    );
    const [activeReplyCommentId, setActiveReplyCommentId] = useState<number>();
    const [expandedDeepThreadDepths, setExpandedDeepThreadDepths] = useState<
        Record<number, number>
    >({});
    const isCommentPost = post.type === 'comment';
    const hasStoryContext = isCommentPost && post.url !== post.hnUrl;
    const postReplyHref = post.actions.reply;
    const author = post.author ?? 'unknown';
    const isUpvoted = Boolean(post.actions.unvote);
    const voteHref = post.actions.unvote ?? post.actions.upvote;
    const voteRequiresLogin = Boolean(voteHref && !hasVoteAuth(voteHref));
    const isFavorited = Boolean(post.actions.unfavorite);
    const favoriteHref = post.actions.unfavorite ?? post.actions.favorite;
    const postUrl = isCommentPost ? undefined : linkPreviewUrl(post);
    const postUrlLabel = postUrl ? displayUrl(postUrl) : undefined;
    const commentsHref = post.actions.comments ?? post.hnUrl;
    const [postMenuOpen, setPostMenuOpen] = useState(false);
    const closePostMenu = useCallback(() => {
        setPostMenuOpen(false);
    }, []);
    const postMenuRef = useCloseOnOutsidePointer<HTMLDetailsElement>({
        open: postMenuOpen,
        onClose: closePostMenu,
    });

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

    const submitReply = async (
        href: string,
        text: string,
    ): Promise<HnReplyResult> => {
        const result = await submitHnReply(href, text, {
            baseUrl: post.hnUrl,
        });

        if (result.kind === 'submitted') {
            window.location.assign(result.url || post.hnUrl);
        }

        return result;
    };

    const revealMoreReplies = (commentId: number, depthLimit: number) => {
        setExpandedDeepThreadDepths((current) => ({
            ...current,
            [commentId]: depthLimit,
        }));
    };

    return (
        <article className="redhn-post">
            <header className="redhn-post__header">
                <div className="redhn-post__credit">
                    <span className="redhn-story__avatar" aria-hidden="true">
                        {userInitials(author)}
                    </span>
                    {post.author ? (
                        <a
                            className="redhn-story__author"
                            href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                                post.author,
                            )}`}
                        >
                            u/{post.author}
                        </a>
                    ) : (
                        <span className="redhn-story__author">u/{author}</span>
                    )}
                    {post.age ? (
                        <>
                            <span
                                className="redhn-story__credit-dot"
                                aria-hidden="true"
                            >
                                •
                            </span>
                            <span>{post.age}</span>
                        </>
                    ) : null}
                    <details
                        className="redhn-post__menu redhn-story__menu"
                        open={postMenuOpen}
                        ref={postMenuRef}
                    >
                        <summary
                            aria-label={
                                isCommentPost
                                    ? 'More comment actions'
                                    : 'More post actions'
                            }
                            onClick={(event) => {
                                event.preventDefault();
                                setPostMenuOpen((current) => !current);
                            }}
                        >
                            <DotsThreeIcon
                                aria-hidden="true"
                                className="redhn-story__menu-icon"
                                weight="bold"
                            />
                        </summary>
                        <div className="redhn-story__menu-panel">
                            {post.actions.hide ? (
                                <HnActionLink
                                    className="redhn-story__menu-item"
                                    href={post.actions.hide}
                                    onHnAction={onHnAction}
                                >
                                    Hide
                                </HnActionLink>
                            ) : null}
                            <a
                                className="redhn-story__menu-item"
                                href={post.hnUrl}
                            >
                                {isCommentPost
                                    ? 'Open comment on HN'
                                    : 'Open on HN'}
                            </a>
                        </div>
                    </details>
                </div>
                <h1 className="redhn-post__title">
                    {hasStoryContext ? (
                        <>
                            Comment on{' '}
                            <a
                                className="redhn-post__context-link"
                                href={post.url}
                            >
                                {post.title}
                            </a>
                        </>
                    ) : (
                        post.title
                    )}
                </h1>
                {postUrl && postUrlLabel ? (
                    <div className="redhn-post__link-preview">
                        <a
                            className="redhn-post__url"
                            href={postUrl}
                            title={postUrl}
                        >
                            {postUrlLabel}
                        </a>
                        <a className="redhn-post__open" href={postUrl}>
                            Open
                        </a>
                    </div>
                ) : null}
                {post.textHtml ? (
                    <div className="redhn-post__text">
                        {renderHnHtml(post.textHtml)}
                    </div>
                ) : null}
                <div className="redhn-story__actions">
                    {voteHref ? (
                        <button
                            aria-label={
                                voteRequiresLogin
                                    ? 'Log in to upvote'
                                    : isCommentPost
                                      ? isUpvoted
                                          ? 'Remove comment upvote'
                                          : 'Upvote comment'
                                      : isUpvoted
                                        ? 'Remove upvote'
                                        : 'Upvote'
                            }
                            aria-pressed={isUpvoted}
                            className={
                                isUpvoted
                                    ? 'redhn-action redhn-action--vote redhn-action--active'
                                    : 'redhn-action redhn-action--vote'
                            }
                            disabled={isVotePending}
                            onClick={() => {
                                onVote(post);
                            }}
                            title={
                                voteRequiresLogin
                                    ? 'Log in to upvote'
                                    : undefined
                            }
                            type="button"
                        >
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight={isUpvoted ? 'fill' : 'bold'}
                            />
                            <span>
                                {isCommentPost
                                    ? isUpvoted
                                        ? 'Upvoted'
                                        : 'Upvote'
                                    : formatNumber(post.score)}
                            </span>
                        </button>
                    ) : (
                        <span className="redhn-action redhn-action--vote redhn-action--disabled">
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>
                                {isCommentPost
                                    ? 'Upvote'
                                    : formatNumber(post.score)}
                            </span>
                        </span>
                    )}
                    {postReplyHref ? (
                        <button
                            aria-label={
                                isCommentPost
                                    ? 'Reply to this comment'
                                    : undefined
                            }
                            className="redhn-action"
                            onClick={() => {
                                postReplyComposerRef.current?.focus();
                            }}
                            type="button"
                        >
                            <ChatCircleIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(post.commentCount)}</span>
                        </button>
                    ) : (
                        <a className="redhn-action" href={commentsHref}>
                            <ChatCircleIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(post.commentCount)}</span>
                        </a>
                    )}
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(post);
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
                    <button
                        className={
                            isFavorited
                                ? 'redhn-action redhn-action--active'
                                : 'redhn-action'
                        }
                        disabled={!favoriteHref || isFavoritePending}
                        onClick={() => {
                            onFavorite(post);
                        }}
                        type="button"
                    >
                        <BookmarkSimpleIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight={isFavorited ? 'fill' : 'bold'}
                        />
                        <span>{isFavorited ? 'Un-favorite' : 'Favorite'}</span>
                    </button>
                </div>
                {postReplyHref ? (
                    <ReplyComposer
                        parentId={post.id}
                        label={
                            isCommentPost
                                ? 'Reply to this comment'
                                : 'Comment on this post'
                        }
                        onSubmit={(text) => submitReply(postReplyHref, text)}
                        placeholder={
                            isCommentPost
                                ? 'Write a reply'
                                : 'Join the conversation'
                        }
                        ref={postReplyComposerRef}
                        submitLabel={isCommentPost ? 'Reply' : undefined}
                    />
                ) : null}
            </header>
            <section
                className="redhn-comments"
                aria-label={isCommentPost ? 'Replies' : 'Comments'}
            >
                {comments.map((comment) => (
                    <CommentThread
                        activeReplyCommentId={activeReplyCommentId}
                        collapsedCommentIds={collapsedCommentIds}
                        comment={comment}
                        expandedDeepThreadDepths={expandedDeepThreadDepths}
                        key={comment.id}
                        pendingVoteCommentIds={pendingVoteCommentIds}
                        onRevealMore={revealMoreReplies}
                        onReplyCancel={() => {
                            setActiveReplyCommentId(undefined);
                        }}
                        onReplyOpen={setActiveReplyCommentId}
                        onSubmitReply={submitReply}
                        onToggle={toggleComment}
                        onVote={onCommentVote}
                    />
                ))}
            </section>
        </article>
    );
}

function linkPreviewUrl(post: ParsedStory): string | undefined {
    if (post.url && post.url !== post.hnUrl) {
        return post.url;
    }

    return undefined;
}

function displayUrl(value: string): string {
    try {
        const url = new URL(value);
        return url.hostname.replace(/^www\./, '') || value;
    } catch {
        return value;
    }
}
