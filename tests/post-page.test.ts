import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DOMParser } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedComment, ParsedStory } from '../src/redhn/hn/types';
import { PostPage } from '../src/redhn/pages/PostPage';

function renderPost(post: ParsedStory, comments: ParsedComment[]): string {
    vi.stubGlobal('DOMParser', DOMParser);

    return renderToStaticMarkup(
        createElement(PostPage, {
            comments,
            isFavoritePending: false,
            isShared: false,
            isVotePending: false,
            onCommentVote: () => undefined,
            onFavorite: () => undefined,
            onHnAction: () => undefined,
            onShare: () => undefined,
            onVote: () => undefined,
            pendingVoteCommentIds: new Set<number>(),
            post,
        }),
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('focused comment PostPage', () => {
    it('reuses the post layout with comment-specific context and actions', () => {
        const post: ParsedStory = {
            actions: {
                comments: 'https://news.ycombinator.com/item?id=9100',
                favorite:
                    'https://news.ycombinator.com/fave?id=9100&auth=fake-auth-token',
                reply: 'https://news.ycombinator.com/reply?id=9100',
                upvote: 'https://news.ycombinator.com/vote?id=9100&how=up',
            },
            age: '1 hour ago',
            author: 'test_author',
            commentCount: 1,
            hnUrl: 'https://news.ycombinator.com/item?id=9100',
            id: 9100,
            text: 'Focused comment body.',
            textHtml: 'Focused <i>comment body</i>.',
            title: 'Parent story title',
            type: 'comment',
            url: 'https://news.ycombinator.com/item?id=9001',
        };
        const comments: ParsedComment[] = [
            {
                actions: {},
                age: '20 minutes ago',
                author: 'child-user',
                children: [],
                depth: 0,
                html: 'Only descendant reply.',
                id: 9101,
                text: 'Only descendant reply.',
            },
        ];
        const html = renderPost(post, comments);

        expect(html).toContain('Comment on ');
        expect(html).toContain(
            'href="https://news.ycombinator.com/item?id=9001"',
        );
        expect(html).toContain('Parent story title');
        expect(html.match(/Focused <i>comment body<\/i>\./g)).toHaveLength(1);
        expect(html).toContain('Only descendant reply.');
        expect(html).not.toContain('redhn-post__link-preview');
        expect(html).toContain('aria-label="Upvote comment"');
        expect(html).toContain('aria-label="Reply to this comment"');
        expect(html).toContain('placeholder="Write a reply"');
        expect(html).toContain('aria-label="Replies"');
        expect(html).toContain('Open comment on HN');
    });

    it('renders a generic heading when story context is unavailable', () => {
        const hnUrl = 'https://news.ycombinator.com/item?id=7001';
        const html = renderPost(
            {
                actions: {},
                hnUrl,
                id: 7001,
                text: 'Standalone comment.',
                textHtml: 'Standalone comment.',
                title: 'Comment',
                type: 'comment',
                url: hnUrl,
            },
            [],
        );

        expect(html).toContain('<h1 class="redhn-post__title">Comment</h1>');
        expect(html).not.toContain('Comment on ');
        expect(html).not.toContain('redhn-post__context-link');
    });
});
