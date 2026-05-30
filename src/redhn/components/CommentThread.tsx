import {
    ArrowFatDownIcon,
    ArrowFatUpIcon,
    ChatCircleIcon,
    MedalIcon,
    MinusCircleIcon,
    PlusCircleIcon,
    ShareFatIcon,
} from '@phosphor-icons/react';
import type { HnReplyResult } from '../hn/actions';
import type { ParsedComment } from '../hn/types';
import { formatNumber } from '../view/format';
import { sanitizeHnHtml } from '../view/html';
import { HnActionLink } from './HnActionLink';
import { ReplyComposer } from './ReplyComposer';
import { userInitials } from './UserAvatar';

export const DEFAULT_VISIBLE_COMMENT_DEPTH = 5;
export const REVEAL_DEPTH_STEP = 3;

type CommentThreadProps = {
    comment: ParsedComment;
    collapsedCommentIds: Set<number>;
    activeReplyCommentId?: number;
    collapseDepth?: number;
    expandedDeepThreadDepths?: Record<number, number>;
    visibleDepthLimit?: number;
    onHnAction: (href: string) => void;
    onRevealMore?: (commentId: number, depthLimit: number) => void;
    onReplyCancel?: () => void;
    onReplyOpen?: (commentId: number) => void;
    onSubmitReply?: (href: string, text: string) => Promise<HnReplyResult>;
    onToggle: (commentId: number) => void;
};

export function CommentThread({
    comment,
    collapsedCommentIds,
    activeReplyCommentId,
    collapseDepth,
    expandedDeepThreadDepths = {},
    visibleDepthLimit = DEFAULT_VISIBLE_COMMENT_DEPTH,
    onHnAction,
    onRevealMore,
    onReplyCancel,
    onReplyOpen,
    onSubmitReply,
    onToggle,
}: CommentThreadProps) {
    const collapsed =
        collapsedCommentIds.has(comment.id) ||
        (collapseDepth !== undefined && comment.depth >= collapseDepth);
    const replies = countComments(comment.children);
    const author = comment.author ?? 'unknown';
    const hnCommentUrl = `https://news.ycombinator.com/item?id=${comment.id}`;
    const replyHref = comment.actions.reply;
    const childDepthLimit =
        expandedDeepThreadDepths[comment.id] ?? visibleDepthLimit;
    const visibleChildren = comment.children.filter(
        (child) => child.depth <= childDepthLimit,
    );
    const hiddenReplies = countHiddenReplies(comment.children, childDepthLimit);

    return (
        <article
            className={
                collapsed
                    ? 'redhn-comment redhn-comment--collapsed'
                    : 'redhn-comment'
            }
        >
            <div className="redhn-comment__rail">
                <span className="redhn-comment__avatar" aria-hidden="true">
                    {userInitials(author)}
                </span>
                <button
                    aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
                    aria-expanded={!collapsed}
                    className="redhn-comment__collapse"
                    onClick={() => {
                        onToggle(comment.id);
                    }}
                    type="button"
                >
                    {collapsed ? (
                        <PlusCircleIcon aria-hidden="true" weight="bold" />
                    ) : (
                        <MinusCircleIcon aria-hidden="true" weight="bold" />
                    )}
                </button>
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
                        <span className="redhn-comment__author">unknown</span>
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
                    {replies > 0 ? (
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
                {collapsed ? null : (
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
                                    aria-label="Upvote comment"
                                    className="redhn-comment-action"
                                    href={comment.actions.upvote}
                                    onHnAction={onHnAction}
                                >
                                    <ArrowFatUpIcon
                                        aria-hidden="true"
                                        weight="bold"
                                    />
                                </HnActionLink>
                            ) : null}
                            <button
                                aria-label="Downvote comment"
                                className="redhn-comment-action redhn-comment-action--muted"
                                disabled
                                type="button"
                            >
                                <ArrowFatDownIcon
                                    aria-hidden="true"
                                    weight="bold"
                                />
                            </button>
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
                            <button
                                className="redhn-comment-action redhn-comment-action--muted"
                                disabled
                                type="button"
                            >
                                <MedalIcon aria-hidden="true" weight="bold" />
                                <span>Award</span>
                            </button>
                            <a
                                className="redhn-comment-action"
                                href={hnCommentUrl}
                            >
                                <ShareFatIcon
                                    aria-hidden="true"
                                    weight="bold"
                                />
                                <span>Share</span>
                            </a>
                        </div>
                        {activeReplyCommentId === comment.id &&
                        replyHref &&
                        onSubmitReply ? (
                            <ReplyComposer
                                autoFocus
                                compact
                                label={`Reply to ${author}`}
                                onCancel={onReplyCancel}
                                onSubmit={(text) =>
                                    onSubmitReply(replyHref, text)
                                }
                                placeholder={`Reply to ${author}`}
                                submitLabel="Reply"
                            />
                        ) : null}
                        {visibleChildren.length > 0 ? (
                            <div className="redhn-comment__children">
                                {visibleChildren.map((child) => (
                                    <CommentThread
                                        activeReplyCommentId={
                                            activeReplyCommentId
                                        }
                                        collapseDepth={collapseDepth}
                                        collapsedCommentIds={
                                            collapsedCommentIds
                                        }
                                        comment={child}
                                        expandedDeepThreadDepths={
                                            expandedDeepThreadDepths
                                        }
                                        key={child.id}
                                        onHnAction={onHnAction}
                                        onRevealMore={onRevealMore}
                                        onReplyCancel={onReplyCancel}
                                        onReplyOpen={onReplyOpen}
                                        onSubmitReply={onSubmitReply}
                                        onToggle={onToggle}
                                        visibleDepthLimit={childDepthLimit}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {hiddenReplies > 0 && onRevealMore ? (
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
                                View {formatNumber(hiddenReplies)} more{' '}
                                {hiddenReplies === 1 ? 'reply' : 'replies'}
                            </button>
                        ) : null}
                    </>
                )}
            </div>
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
