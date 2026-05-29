import type { CSSProperties } from 'react';
import type { ParsedComment } from '../hn/types';
import { formatNumber } from '../view/format';
import { sanitizeHnHtml } from '../view/html';
import { HnActionLink } from './HnActionLink';

type CommentThreadProps = {
    comment: ParsedComment;
    collapsedCommentIds: Set<number>;
    collapseDepth?: number;
    onHnAction: (href: string) => void;
    onToggle: (commentId: number) => void;
};

export function CommentThread({
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

export function countComments(comments: ParsedComment[]): number {
    return comments.reduce(
        (total, comment) => total + 1 + countComments(comment.children),
        0,
    );
}

function commentGuideColor(depth: number): string {
    const colors = ['#926f66', '#4d7788', '#ad2c00', '#617152', '#6d5b8a'];
    return colors[depth % colors.length];
}
