import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    CommentThread,
    countHiddenReplies,
    nextRevealDepth,
} from '../src/redhn/components/CommentThread';
import type { HnReplyResult } from '../src/redhn/hn/actions';
import type { ParsedComment } from '../src/redhn/hn/types';

function comment(
    id: number,
    depth: number,
    children: ParsedComment[] = [],
): ParsedComment {
    return {
        actions: {},
        age: '1 hour ago',
        author: `user${id}`,
        children,
        depth,
        html: `Comment ${id}`,
        id,
        text: `Comment ${id}`,
    };
}

function chain(depth: number, maxDepth: number): ParsedComment {
    return comment(
        100 + depth,
        depth,
        depth < maxDepth ? [chain(depth + 1, maxDepth)] : [],
    );
}

function renderThread(
    root: ParsedComment,
    options: {
        activeReplyCommentId?: number;
        collapsedCommentIds?: Set<number>;
        expandedDeepThreadDepths?: Record<number, number>;
        onReplyCancel?: () => void;
        onReplyOpen?: (commentId: number) => void;
        onSubmitReply?: (href: string, text: string) => Promise<HnReplyResult>;
        onRevealMore?: (commentId: number, depthLimit: number) => void;
    } = {},
): string {
    vi.stubGlobal('document', parseHTML('<html><body></body></html>').document);

    return renderToStaticMarkup(
        createElement(CommentThread, {
            activeReplyCommentId: options.activeReplyCommentId,
            collapsedCommentIds: options.collapsedCommentIds ?? new Set(),
            comment: root,
            expandedDeepThreadDepths: options.expandedDeepThreadDepths,
            onHnAction: () => undefined,
            onReplyCancel: options.onReplyCancel,
            onReplyOpen: options.onReplyOpen,
            onSubmitReply: options.onSubmitReply,
            onRevealMore: options.onRevealMore ?? (() => undefined),
            onToggle: () => undefined,
        }),
    );
}

function setupDom() {
    const { document, window } = parseHTML('<html><body></body></html>');
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', window);
    vi.stubGlobal('HTMLElement', window.HTMLElement);
    return document;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('comment thread depth reveal', () => {
    it('counts hidden replies and advances reveal depth in steps', () => {
        const boundary = chain(5, 7);

        expect(countHiddenReplies(boundary.children, 5)).toBe(2);
        expect(countHiddenReplies(boundary.children, 8)).toBe(0);
        expect(nextRevealDepth(5)).toBe(8);
        expect(nextRevealDepth(8)).toBe(11);
    });

    it('hides and reveals deep descendants by branch depth', () => {
        const hiddenHtml = renderThread(chain(0, 7));
        const revealedHtml = renderThread(chain(0, 7), {
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(hiddenHtml).toContain('View 2 more replies');
        expect(hiddenHtml).toContain('user105');
        expect(hiddenHtml).not.toContain('user106');
        expect(revealedHtml).not.toContain('View 2 more replies');
        expect(revealedHtml).toContain('user106');
        expect(revealedHtml).toContain('user107');
    });

    it('compacts collapsed branches and hides descendants', () => {
        const html = renderThread(chain(0, 7), {
            collapsedCommentIds: new Set([100]),
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(html).toContain('user100');
        expect(html).toContain('redhn-comment--collapsed');
        expect(html).toContain('Expand comment');
        expect(html).not.toContain('Comment 100');
        expect(html).not.toContain('user101');
        expect(html).not.toContain('View 2 more replies');
    });

    it('renders only HN-backed comment actions', () => {
        const root = {
            ...comment(1, 0),
            actions: {
                reply: 'https://news.ycombinator.com/reply?id=1',
                upvote: 'https://news.ycombinator.com/vote?id=1&how=up',
            },
        };
        const html = renderThread(root, {
            onReplyOpen: () => undefined,
            onSubmitReply: async () => ({
                kind: 'submitted',
                url: 'https://news.ycombinator.com/item?id=1',
            }),
        });

        expect(html).toContain('Upvote comment');
        expect(html).toContain('Reply');
        expect(html).not.toContain('Downvote comment');
        expect(html).not.toContain('Award');
        expect(html).not.toContain('Share');
    });

    it('connector controls toggle the parent comment', async () => {
        const document = setupDom();
        const container = document.createElement('div');
        document.body.append(container);
        const onToggle = vi.fn();
        const root = createRoot(container);

        await act(async () => {
            root.render(
                createElement(CommentThread, {
                    collapsedCommentIds: new Set<number>(),
                    comment: comment(1, 0, [comment(2, 1), comment(3, 1)]),
                    onHnAction: () => undefined,
                    onRevealMore: () => undefined,
                    onToggle,
                }),
            );
        });

        const selectors = [
            '.redhn-comment__threadline',
            '.redhn-comment__collapse',
            '.redhn-comment__branchline-hit',
        ];

        for (const selector of selectors) {
            const button = container.querySelector<HTMLButtonElement>(selector);
            expect(button).not.toBeNull();
            button?.click();
        }

        expect(onToggle).toHaveBeenCalledTimes(3);
        expect(onToggle).toHaveBeenCalledWith(1);

        await act(async () => {
            root.unmount();
        });
    });
});
