import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DOMParser } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHnHtml, textFromHtml } from '../src/redhn/view/html';

function renderContent(className: string, html: string): string {
    vi.stubGlobal('DOMParser', DOMParser);

    return renderToStaticMarkup(
        createElement('div', { className }, renderHnHtml(html)),
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('HN HTML rendering', () => {
    it('preserves allowed HN formatting without arbitrary attributes', () => {
        expect(
            renderContent(
                'redhn-post__text',
                [
                    '<p>Paragraph with <a href="https://example.com/path">link</a></p>',
                    '<pre><code>const answer = 42;</code></pre>',
                    '<br>',
                    '<i>italic</i> <b>bold</b> <u>under</u>',
                    '<div style="color:red"><span class="c00">About</span></div>',
                ].join(''),
            ),
        ).toBe(
            [
                '<div class="redhn-post__text">',
                '<p>Paragraph with <a href="https://example.com/path" rel="nofollow noopener noreferrer">link</a></p>',
                '<pre><code>const answer = 42;</code></pre>',
                '<br/>',
                '<i>italic</i> <b>bold</b> <u>under</u>',
                '<div><span>About</span></div>',
                '</div>',
            ].join(''),
        );
    });

    it('strips dangerous tags, handlers, styles, and unsafe links', () => {
        expect(
            renderContent(
                'redhn-profile-activity__text',
                [
                    '<script>alert(1)</script>',
                    '<svg><a href="https://example.com">bad</a></svg>',
                    '<img src="https://example.com/x.png" onerror="alert(1)">',
                    '<a href="java&#x0a;script:alert(1)" onclick="alert(1)" style="color:red">blocked</a>',
                    '<a href="item?id=1001">relative</a>',
                ].join(''),
            ),
        ).toBe(
            [
                '<div class="redhn-profile-activity__text">',
                '<a rel="nofollow noopener noreferrer">blocked</a>',
                '<a href="https://news.ycombinator.com/item?id=1001" rel="nofollow noopener noreferrer">relative</a>',
                '</div>',
            ].join(''),
        );
    });

    it('extracts whitespace-normalized text without assigning innerHTML', () => {
        vi.stubGlobal('DOMParser', DOMParser);

        expect(textFromHtml('Hello <i>from</i>\n<p>HN</p>')).toBe(
            'Hello from HN',
        );
    });
});
