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
        collapsedCommentIds?: Set<number>;
        expandedDeepThreadDepths?: Record<number, number>;
        onRevealMore?: (commentId: number, depthLimit: number) => void;
    } = {},
): string {
    vi.stubGlobal('document', parseHTML('<html><body></body></html>').document);

    return renderToStaticMarkup(
        createElement(CommentThread, {
            collapsedCommentIds: options.collapsedCommentIds ?? new Set(),
            comment: root,
            expandedDeepThreadDepths: options.expandedDeepThreadDepths,
            onHnAction: () => undefined,
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
    it('counts hidden replies beyond the visible depth limit', () => {
        const boundary = chain(5, 7);

        expect(countHiddenReplies(boundary.children, 5)).toBe(2);
        expect(countHiddenReplies(boundary.children, 8)).toBe(0);
    });

    it('reveals three additional depth levels at a time', () => {
        expect(nextRevealDepth(5)).toBe(8);
        expect(nextRevealDepth(8)).toBe(11);
    });

    it('renders a more replies row for deep descendants', () => {
        const html = renderThread(chain(0, 7));

        expect(html).toContain('View 2 more replies');
        expect(html).toContain('user105');
        expect(html).not.toContain('user106');
    });

    it('marks leaf comments as terminal without reply controls', () => {
        const html = renderThread(comment(1, 0));

        expect(html).toContain('redhn-comment--terminal');
        expect(html).not.toContain('redhn-comment__threadline');
        expect(html).not.toContain('redhn-comment__collapse');
    });

    it('marks visible reply branches with connector controls', () => {
        const html = renderThread(comment(1, 0, [comment(2, 1)]));

        expect(html).toContain('redhn-comment--has-replies');
        expect(html).toContain('redhn-comment__threadline');
        expect(html).toContain('redhn-comment__collapse');
    });

    it('keeps hidden deep replies as expandable reply branches', () => {
        const html = renderThread(chain(5, 7));

        expect(html).toContain('redhn-comment--has-replies');
        expect(html).toContain('redhn-comment__threadline');
        expect(html).toContain('View 2 more replies');
    });

    it('renders revealed deep descendants for the expanded branch', () => {
        const html = renderThread(chain(0, 7), {
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(html).not.toContain('View 2 more replies');
        expect(html).toContain('user106');
        expect(html).toContain('user107');
    });

    it('manual collapse compacts the comment and hides its descendants', () => {
        const html = renderThread(chain(0, 7), {
            collapsedCommentIds: new Set([100]),
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(html).toContain('user100');
        expect(html).toContain('1 hour ago');
        expect(html).toContain('redhn-comment--collapsed');
        expect(html).toContain('Expand comment');
        expect(html).not.toContain('Comment 100');
        expect(html).not.toContain('Award');
        expect(html).not.toContain('user101');
        expect(html).not.toContain('View 2 more replies');
    });

    it('connector line and collapse icon call the same toggle handler', async () => {
        const document = setupDom();
        const container = document.createElement('div');
        document.body.append(container);
        const onToggle = vi.fn();
        const root = createRoot(container);

        await act(async () => {
            root.render(
                createElement(CommentThread, {
                    collapsedCommentIds: new Set<number>(),
                    comment: comment(1, 0, [comment(2, 1)]),
                    onHnAction: () => undefined,
                    onRevealMore: () => undefined,
                    onToggle,
                }),
            );
        });

        const threadline = container.querySelector<HTMLButtonElement>(
            '.redhn-comment__threadline',
        );
        const collapse = container.querySelector<HTMLButtonElement>(
            '.redhn-comment__collapse',
        );

        expect(threadline).not.toBeNull();
        expect(collapse).not.toBeNull();

        threadline?.click();
        collapse?.click();

        expect(onToggle).toHaveBeenCalledTimes(2);
        expect(onToggle).toHaveBeenNthCalledWith(1, 1);
        expect(onToggle).toHaveBeenNthCalledWith(2, 1);

        await act(async () => {
            root.unmount();
        });
    });
});
