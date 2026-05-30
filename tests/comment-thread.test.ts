import { createElement } from 'react';
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

    it('renders revealed deep descendants for the expanded branch', () => {
        const html = renderThread(chain(0, 7), {
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(html).not.toContain('View 2 more replies');
        expect(html).toContain('user106');
        expect(html).toContain('user107');
    });

    it('manual collapse hides descendants even if they were revealed', () => {
        const html = renderThread(chain(0, 7), {
            collapsedCommentIds: new Set([100]),
            expandedDeepThreadDepths: { 105: 8 },
        });

        expect(html).toContain('user100');
        expect(html).not.toContain('user101');
        expect(html).not.toContain('View 2 more replies');
    });
});
