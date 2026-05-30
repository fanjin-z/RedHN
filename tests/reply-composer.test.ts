import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReplyComposer } from '../src/redhn/components/ReplyComposer';
import type { HnReplyResult } from '../src/redhn/hn/actions';

describe('reply composer', () => {
    it('uses one textarea row before focus', () => {
        const submitted: HnReplyResult = {
            kind: 'submitted',
            url: 'https://news.ycombinator.com/item?id=1',
        };
        const html = renderToStaticMarkup(
            createElement(ReplyComposer, {
                label: 'Reply',
                onSubmit: async () => submitted,
                placeholder: 'Reply',
            }),
        );

        expect(html).toContain('rows="1"');
        expect(html).toContain('class="auto-grow"');
    });

    it('uses two textarea rows when expanded', () => {
        const submitted: HnReplyResult = {
            kind: 'submitted',
            url: 'https://news.ycombinator.com/item?id=1',
        };
        const html = renderToStaticMarkup(
            createElement(ReplyComposer, {
                autoFocus: true,
                label: 'Reply',
                onSubmit: async () => submitted,
                placeholder: 'Reply',
            }),
        );

        expect(html).toContain('rows="2"');
    });
});
