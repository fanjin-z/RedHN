import { Fragment, createElement, type ReactNode } from 'react';

const HN_ORIGIN = 'https://news.ycombinator.com';
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const PRESERVED_TAGS = new Set([
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'i',
    'p',
    'pre',
    's',
    'span',
    'strike',
    'strong',
    'u',
]);

const DROPPED_TAGS = new Set([
    'audio',
    'button',
    'canvas',
    'embed',
    'form',
    'iframe',
    'img',
    'input',
    'link',
    'math',
    'meta',
    'object',
    'script',
    'select',
    'source',
    'style',
    'svg',
    'template',
    'textarea',
    'video',
]);

export function renderHnHtml(html: string): ReactNode {
    const document = parseHtmlSnippet(html);
    return renderChildren(document.body.childNodes, 'hn');
}

export function textFromHtml(html: string): string {
    const document = parseHtmlSnippet(html);
    return document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function parseHtmlSnippet(html: string): Document {
    return new DOMParser().parseFromString(
        `<!doctype html><html><body>${html}</body></html>`,
        'text/html',
    );
}

function renderChildren(nodes: NodeListOf<ChildNode>, keyPrefix: string) {
    return Array.from(nodes)
        .map((node, index) => renderNode(node, `${keyPrefix}-${index}`))
        .filter((node) => node !== null);
}

function renderNode(node: ChildNode, key: string): ReactNode {
    if (node.nodeType === TEXT_NODE) {
        return node.textContent ?? '';
    }

    if (node.nodeType !== ELEMENT_NODE) {
        return null;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (DROPPED_TAGS.has(tagName)) {
        return null;
    }

    const children = renderChildren(element.childNodes, key);

    if (!PRESERVED_TAGS.has(tagName)) {
        return createElement(Fragment, { key }, ...children);
    }

    if (tagName === 'br') {
        return createElement('br', { key });
    }

    if (tagName === 'a') {
        return createElement(
            'a',
            {
                href: safeHref(element.getAttribute('href')),
                key,
                rel: 'nofollow noopener noreferrer',
            },
            ...children,
        );
    }

    return createElement(tagName, { key }, ...children);
}

function safeHref(href: string | null): string | undefined {
    const value = href?.trim();

    if (!value) {
        return undefined;
    }

    try {
        const url = new URL(value, HN_ORIGIN);
        return ['http:', 'https:', 'mailto:'].includes(url.protocol)
            ? url.href
            : undefined;
    } catch {
        return undefined;
    }
}
