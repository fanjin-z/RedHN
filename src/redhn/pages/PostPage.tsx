import { useState } from 'react';
import type { ParsedComment, ParsedStory } from '../hn/types';
import { CommentThread, countComments } from '../components/CommentThread';
import { HnActionLink } from '../components/HnActionLink';
import { ReplyComposer } from '../components/ReplyComposer';
import { submitHnReply, type HnReplyResult } from '../hn/actions';
import { formatNumber } from '../view/format';
import { sanitizeHnHtml } from '../view/html';

type PostPageProps = {
    post: ParsedStory;
    comments: ParsedComment[];
    isSaved: boolean;
    isShared: boolean;
    newCommentCount: number;
    onHnAction: (href: string) => void;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

export function PostPage({
    post,
    comments,
    isSaved,
    isShared,
    newCommentCount,
    onHnAction,
    onSave,
    onShare,
}: PostPageProps) {
    const [collapsedCommentIds, setCollapsedCommentIds] = useState(
        () => new Set<number>(),
    );
    const [collapseDepth, setCollapseDepth] = useState<number>();
    const [activeReplyCommentId, setActiveReplyCommentId] = useState<number>();
    const [expandedDeepThreadDepths, setExpandedDeepThreadDepths] = useState<
        Record<number, number>
    >({});
    const totalComments = countComments(comments);
    const postReplyHref = post.actions.reply;

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
                </div>
                {postReplyHref ? (
                    <ReplyComposer
                        label="Comment on this post"
                        onSubmit={(text) => submitReply(postReplyHref, text)}
                        placeholder="Join the conversation"
                    />
                ) : null}
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
                        activeReplyCommentId={activeReplyCommentId}
                        collapseDepth={collapseDepth}
                        collapsedCommentIds={collapsedCommentIds}
                        comment={comment}
                        expandedDeepThreadDepths={expandedDeepThreadDepths}
                        key={comment.id}
                        onHnAction={onHnAction}
                        onRevealMore={revealMoreReplies}
                        onReplyCancel={() => {
                            setActiveReplyCommentId(undefined);
                        }}
                        onReplyOpen={setActiveReplyCommentId}
                        onSubmitReply={submitReply}
                        onToggle={toggleComment}
                    />
                ))}
            </section>
        </article>
    );
}
