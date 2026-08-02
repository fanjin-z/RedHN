import {
    ArrowFatUpIcon,
    ChatCircleIcon,
    MinusCircleIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import type { HnReplyResult } from '../hn/actions';
import type { ParsedComment } from '../hn/types';
import { formatNumber } from '../view/format';
import { renderHnHtml } from '../view/html';
import { ReplyComposer } from './ReplyComposer';
import { userInitials } from './UserAvatar';

export const DEFAULT_VISIBLE_COMMENT_DEPTH = 5;
export const REVEAL_DEPTH_STEP = 3;

type CommentThreadProps = {
    comment: ParsedComment;
    collapsedCommentIds: Set<number>;
    activeReplyCommentId?: number;
    expandedDeepThreadDepths?: Record<number, number>;
    pendingVoteCommentIds: Set<number>;
    visibleDepthLimit?: number;
    onRevealMore?: (commentId: number, depthLimit: number) => void;
    onReplyCancel?: () => void;
    onReplyOpen?: (commentId: number) => void;
    onSubmitReply?: (href: string, text: string) => Promise<HnReplyResult>;
    onToggle: (commentId: number) => void;
    onVote: (comment: ParsedComment) => void;
};

export function CommentThread({
    comment,
    collapsedCommentIds,
    activeReplyCommentId,
    expandedDeepThreadDepths = {},
    pendingVoteCommentIds,
    visibleDepthLimit = DEFAULT_VISIBLE_COMMENT_DEPTH,
    onRevealMore,
    onReplyCancel,
    onReplyOpen,
    onSubmitReply,
    onToggle,
    onVote,
}: CommentThreadProps) {
    const collapsed = collapsedCommentIds.has(comment.id);
    const replies = countComments(comment.children);
    const author = comment.author ?? 'unknown';
    const replyHref = comment.actions.reply;
    const isUpvoted = Boolean(comment.actions.unvote);
    const voteHref = comment.actions.unvote ?? comment.actions.upvote;
    const isVotePending = pendingVoteCommentIds.has(comment.id);
    const childDepthLimit =
        expandedDeepThreadDepths[comment.id] ?? visibleDepthLimit;
    const visibleChildren = comment.children.filter(
        (child) => child.depth <= childDepthLimit,
    );
    const hiddenReplies = countHiddenReplies(comment.children, childDepthLimit);
    const hasVisibleChildren = visibleChildren.length > 0;
    const hasHiddenReplies = hiddenReplies > 0;
    const hasReplyBranch = hasVisibleChildren || hasHiddenReplies;
    const commentClassName = [
        'redhn-comment',
        hasReplyBranch
            ? 'redhn-comment--has-replies'
            : 'redhn-comment--terminal',
        collapsed ? 'redhn-comment--collapsed' : undefined,
    ]
        .filter(Boolean)
        .join(' ');

    const toggleComment = () => {
        onToggle(comment.id);
    };

    return (
        <article className={commentClassName}>
            <div className="redhn-comment__row">
                <div className="redhn-comment__rail">
                    {collapsed ? (
                        <button
                            aria-label="Expand comment"
                            aria-expanded="false"
                            className="redhn-comment__collapsed-toggle"
                            onClick={toggleComment}
                            type="button"
                        >
                            <PlusCircleIcon aria-hidden="true" weight="bold" />
                        </button>
                    ) : (
                        <button
                            aria-label="Collapse comment"
                            aria-expanded="true"
                            className="redhn-comment__avatar redhn-comment__avatar-button"
                            onClick={toggleComment}
                            type="button"
                        >
                            {userInitials(author)}
                        </button>
                    )}
                    {hasReplyBranch && !collapsed ? (
                        <>
                            <button
                                aria-label="Collapse comment"
                                aria-expanded="true"
                                className="redhn-comment__threadline"
                                onClick={toggleComment}
                                type="button"
                            />
                            <button
                                aria-label="Collapse comment"
                                aria-expanded="true"
                                className="redhn-comment__collapse"
                                onClick={toggleComment}
                                type="button"
                            >
                                <MinusCircleIcon
                                    aria-hidden="true"
                                    weight="bold"
                                />
                            </button>
                        </>
                    ) : null}
                </div>
                <div className="redhn-comment__body">
                    <header className="redhn-comment__header">
                        {comment.author ? (
                            <a
                                className="redhn-comment__author"
                                href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                                    comment.author,
                                )}`}
                            >
                                {comment.author}
                            </a>
                        ) : (
                            <span className="redhn-comment__author">
                                unknown
                            </span>
                        )}
                        {comment.age ? (
                            <>
                                <span
                                    className="redhn-comment__meta-dot"
                                    aria-hidden="true"
                                >
                                    •
                                </span>
                                <span>{comment.age}</span>
                            </>
                        ) : null}
                        {replies > 0 && !collapsed ? (
                            <>
                                <span
                                    className="redhn-comment__meta-dot"
                                    aria-hidden="true"
                                >
                                    •
                                </span>
                                <span>{formatNumber(replies)} replies</span>
                            </>
                        ) : null}
                    </header>
                    {!collapsed ? (
                        <>
                            <div className="redhn-comment__text">
                                {renderHnHtml(comment.html)}
                            </div>
                            <div className="redhn-comment__actions">
                                {voteHref ? (
                                    <button
                                        aria-label={
                                            isUpvoted
                                                ? 'Remove comment upvote'
                                                : 'Upvote comment'
                                        }
                                        aria-pressed={isUpvoted}
                                        className={
                                            isUpvoted
                                                ? 'redhn-comment-action redhn-comment-action--active'
                                                : 'redhn-comment-action'
                                        }
                                        disabled={isVotePending}
                                        onClick={() => {
                                            onVote(comment);
                                        }}
                                        type="button"
                                    >
                                        <ArrowFatUpIcon
                                            aria-hidden="true"
                                            weight={isUpvoted ? 'fill' : 'bold'}
                                        />
                                    </button>
                                ) : null}
                                {replyHref && onReplyOpen && onSubmitReply ? (
                                    <button
                                        className="redhn-comment-action"
                                        onClick={() => {
                                            onReplyOpen(comment.id);
                                        }}
                                        type="button"
                                    >
                                        <ChatCircleIcon
                                            aria-hidden="true"
                                            weight="bold"
                                        />
                                        <span>Reply</span>
                                    </button>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                    {!collapsed &&
                    activeReplyCommentId === comment.id &&
                    replyHref &&
                    onSubmitReply ? (
                        <ReplyComposer
                            autoFocus
                            compact
                            label={`Reply to ${author}`}
                            onCancel={onReplyCancel}
                            onSubmit={(text) => onSubmitReply(replyHref, text)}
                            placeholder={`Reply to ${author}`}
                            submitLabel="Reply"
                        />
                    ) : null}
                </div>
            </div>
            {hasReplyBranch && !collapsed ? (
                <div className="redhn-comment__branch">
                    {hasVisibleChildren ? (
                        <div className="redhn-comment__children">
                            {visibleChildren.map((child, index) => {
                                const isLastChild =
                                    index === visibleChildren.length - 1;

                                return (
                                    <div
                                        className={
                                            isLastChild
                                                ? 'redhn-comment__child-frame redhn-comment__child-frame--last'
                                                : 'redhn-comment__child-frame'
                                        }
                                        key={child.id}
                                    >
                                        <button
                                            aria-label="Collapse comment"
                                            aria-expanded="true"
                                            className="redhn-comment__branchline-hit"
                                            onClick={toggleComment}
                                            type="button"
                                        />
                                        <CommentThread
                                            activeReplyCommentId={
                                                activeReplyCommentId
                                            }
                                            collapsedCommentIds={
                                                collapsedCommentIds
                                            }
                                            comment={child}
                                            expandedDeepThreadDepths={
                                                expandedDeepThreadDepths
                                            }
                                            pendingVoteCommentIds={
                                                pendingVoteCommentIds
                                            }
                                            onRevealMore={onRevealMore}
                                            onReplyCancel={onReplyCancel}
                                            onReplyOpen={onReplyOpen}
                                            onSubmitReply={onSubmitReply}
                                            onToggle={onToggle}
                                            onVote={onVote}
                                            visibleDepthLimit={childDepthLimit}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                    {hasHiddenReplies && onRevealMore ? (
                        <button
                            className="redhn-comment__more-replies"
                            onClick={() => {
                                onRevealMore(
                                    comment.id,
                                    nextRevealDepth(childDepthLimit),
                                );
                            }}
                            type="button"
                        >
                            <PlusCircleIcon aria-hidden="true" weight="bold" />
                            <span>
                                View {formatNumber(hiddenReplies)} more{' '}
                                {hiddenReplies === 1 ? 'reply' : 'replies'}
                            </span>
                        </button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}

export function countComments(comments: ParsedComment[]): number {
    return comments.reduce(
        (total, comment) => total + 1 + countComments(comment.children),
        0,
    );
}

export function countHiddenReplies(
    comments: ParsedComment[],
    depthLimit: number,
): number {
    return comments.reduce((total, comment) => {
        if (comment.depth > depthLimit) {
            return total + 1 + countComments(comment.children);
        }

        return total;
    }, 0);
}

export function nextRevealDepth(currentDepthLimit: number): number {
    return currentDepthLimit + REVEAL_DEPTH_STEP;
}
