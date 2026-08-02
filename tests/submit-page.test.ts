import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
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
                fnid: 'fake-form-id',
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
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    return document;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('SubmitPage', () => {
    it('preserves form values while switching through submit sections', async () => {
        const document = setupDom();
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);

        await act(async () => {
            root.render(
                createElement(SubmitPage, {
                    submit: submitPage('A sample submission'),
                }),
            );
        });

        expect(
            container.querySelector<HTMLInputElement>(
                'input[type="text"][name="title"]',
            )?.value,
        ).toBe('A sample submission');
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
        expect(
            container.querySelector<HTMLInputElement>(
                'input[type="hidden"][name="url"]',
            )?.value,
        ).toBe('');
        expect(
            container.querySelector<HTMLInputElement>(
                'input[type="hidden"][name="title"]',
            )?.value,
        ).toBe('Ask HN: A sample submission');

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
        expect(
            container.querySelector<HTMLInputElement>(
                'input[type="hidden"][name="title"]',
            )?.value,
        ).toBe('Show HN: A sample submission');

        await act(async () => {
            root.unmount();
        });
    });

    it('closes the section menu on outside pointer down only', async () => {
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

        const sectionButton = container.querySelector<HTMLButtonElement>(
            '.redhn-submit-section__button',
        );
        expect(sectionButton).not.toBeNull();

        await act(async () => {
            sectionButton!.click();
        });

        expect(
            container.querySelector('.redhn-submit-section__menu'),
        ).not.toBeNull();

        const section = container.querySelector<HTMLDivElement>(
            '.redhn-submit-section',
        );
        expect(section).not.toBeNull();

        await act(async () => {
            const insideEvent = new window.Event('pointerdown', {
                bubbles: true,
                composed: true,
            });
            Object.defineProperty(insideEvent, 'composedPath', {
                value: () => [sectionButton, section, container, document.body],
            });
            document.body.dispatchEvent(insideEvent);
        });

        expect(
            container.querySelector('.redhn-submit-section__menu'),
        ).not.toBeNull();

        const outsideButton = document.createElement('button');
        document.body.append(outsideButton);

        await act(async () => {
            outsideButton.dispatchEvent(
                new window.Event('pointerdown', { bubbles: true }),
            );
        });

        expect(
            container.querySelector('.redhn-submit-section__menu'),
        ).toBeNull();

        await act(async () => {
            root.unmount();
        });
    });
});
