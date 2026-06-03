import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubmitPage } from '../src/redhn/pages/SubmitPage';
import type { ParsedSubmitPage } from '../src/redhn/hn/types';

function submitPage(
    titleValue = '',
    urlValue = 'https://example.com/project',
): ParsedSubmitPage {
    return {
        form: {
            action: 'https://news.ycombinator.com/r',
            hiddenFields: {
                fnid: 'abc',
                fnop: 'submit-page',
            },
            method: 'post',
            textName: 'text',
            textValue: '',
            titleName: 'title',
            titleValue,
            urlName: 'url',
            urlValue,
        },
    };
}

function setupDom() {
    const { document, window } = parseHTML('<html><body></body></html>');
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', window);
    vi.stubGlobal('HTMLElement', window.HTMLElement);
    vi.stubGlobal('Event', window.Event);
    return document;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('SubmitPage', () => {
    it('hides the URL field for Ask HN and submits a blank hidden URL', () => {
        const html = renderToStaticMarkup(
            createElement(SubmitPage, {
                submit: submitPage('Ask HN: Good question?'),
            }),
        );
        const document = parseHTML(html).document;

        expect(document.querySelector('input[type="url"]')).toBeNull();

        const hiddenUrl = document.querySelector<HTMLInputElement>(
            'input[type="hidden"][name="url"]',
        );
        expect(hiddenUrl?.value).toBe('');
    });

    it('keeps the URL field for Show HN', () => {
        const html = renderToStaticMarkup(
            createElement(SubmitPage, {
                submit: submitPage('Show HN: My project'),
            }),
        );
        const document = parseHTML(html).document;
        const urlInput = document.querySelector<HTMLInputElement>(
            'input[type="url"][name="url"]',
        );

        expect(urlInput?.value).toBe('https://example.com/project');
    });

    it('preserves the URL state when switching through Ask HN', async () => {
        const document = setupDom();
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);

        await act(async () => {
            root.render(
                createElement(SubmitPage, {
                    submit: submitPage(),
                }),
            );
        });

        const urlInput = container.querySelector<HTMLInputElement>(
            'input[type="url"][name="url"]',
        );
        expect(urlInput).not.toBeNull();
        const sectionButton = container.querySelector<HTMLButtonElement>(
            '.redhn-submit-section__button',
        );
        expect(sectionButton).not.toBeNull();

        await act(async () => {
            sectionButton!.click();
        });
        await act(async () => {
            container
                .querySelectorAll<HTMLButtonElement>(
                    '.redhn-submit-section__option',
                )
                .item(1)
                .click();
        });

        expect(container.querySelector('input[type="url"]')).toBeNull();

        await act(async () => {
            sectionButton!.click();
        });
        await act(async () => {
            container
                .querySelectorAll<HTMLButtonElement>(
                    '.redhn-submit-section__option',
                )
                .item(2)
                .click();
        });

        expect(
            container.querySelector<HTMLInputElement>(
                'input[type="url"][name="url"]',
            )?.value,
        ).toBe('https://example.com/project');

        await act(async () => {
            root.unmount();
        });
    });
});
