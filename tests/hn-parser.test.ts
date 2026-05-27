import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import {
    flattenComments,
    parseHnPage,
    parseItemIdFromUrl,
} from '../src/redhn/hn/parser';

function fixture(name: string): Document {
    const html = readFileSync(
        new URL(`./fixtures/${name}`, import.meta.url),
        'utf8',
    );
    return parseHTML(html).document;
}

describe('HN DOM parser', () => {
    it('parses feed stories and pagination from loaded HN markup', () => {
        const page = parseHnPage(
            fixture('feed.html'),
            'https://news.ycombinator.com/news',
            123,
        );

        expect(page.kind).toBe('feed');
        expect(page.capturedAt).toBe(123);
        expect(page.pagination.more).toBe(
            'https://news.ycombinator.com/news?p=2',
        );
        expect(page.stories).toHaveLength(2);
        expect(page.stories[0]).toMatchObject({
            id: 1001,
            rank: 1,
            title: 'Show HN: A new framework for building web components',
            url: 'https://example.com/framework',
            hnUrl: 'https://news.ycombinator.com/item?id=1001',
            domain: 'example.com',
            author: 'dev_jane',
            age: '3 hours ago',
            score: 428,
            commentCount: 156,
        });
        expect(page.stories[0].actions.upvote).toContain('/vote?id=1001');
        expect(page.stories[1]).toMatchObject({
            id: 1002,
            rank: 2,
            domain: undefined,
            commentCount: 432,
        });
    });

    it('parses an item page into a post and nested comment tree', () => {
        const page = parseHnPage(
            fixture('item.html'),
            'https://news.ycombinator.com/item?id=2001',
            456,
        );

        expect(page.kind).toBe('item');
        expect(page.post).toMatchObject({
            id: 2001,
            title: 'Show HN: I built RedHN',
            domain: 'github.com',
            score: 452,
            author: 'pg',
            commentCount: 128,
            text: 'I built a minimal, high-density Hacker News client.',
        });
        expect(page.post?.actions.favorite).toContain('/fave?id=2001');
        expect(page.comments).toHaveLength(1);
        expect(page.comments[0]).toMatchObject({
            id: 3001,
            depth: 0,
            author: 'dave_t',
            age: '3 hours ago',
            text: 'This looks really clean.',
        });
        expect(page.comments[0].children[0]).toMatchObject({
            id: 3002,
            depth: 1,
            author: 'pg',
            text: 'Thanks Dave!',
        });
        expect(
            flattenComments(page.comments).map((comment) => comment.id),
        ).toEqual([3001, 3002]);
    });

    it('extracts item ids from HN URLs', () => {
        expect(parseItemIdFromUrl('item?id=123')).toBe(123);
        expect(
            parseItemIdFromUrl('https://news.ycombinator.com/item?id=456'),
        ).toBe(456);
        expect(parseItemIdFromUrl('news')).toBeUndefined();
    });
});
