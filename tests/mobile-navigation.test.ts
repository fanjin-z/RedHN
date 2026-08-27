import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../src/redhn/components/AppShell';
import { defaultPreferences } from '../src/redhn/state/preferences';

// Linkedom does not implement CSS declaration priorities or native dialogs.
// These stubs exercise our lifecycle; focus and layout are checked in a browser.
function hostStyle() {
    const values = new Map<string, { value: string; priority: string }>();
    return {
        getPropertyValue: (property: string) =>
            values.get(property)?.value ?? '',
        getPropertyPriority: (property: string) =>
            values.get(property)?.priority ?? '',
        setProperty: (property: string, value: string, priority = '') => {
            values.set(property, { value, priority });
        },
        removeProperty: (property: string) => values.delete(property),
    };
}

async function mountShell() {
    const { document, window } = parseHTML('<html><body></body></html>');
    const listeners = new Set<() => void>();
    const media = {
        matches: true,
        addEventListener: (_type: string, listener: () => void) => {
            listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
            listeners.delete(listener);
        },
    };
    const scrollTo = vi.fn();
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', window);
    vi.stubGlobal('HTMLElement', window.HTMLElement);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal('scrollX', 0);
    vi.stubGlobal('scrollY', 420);
    vi.stubGlobal('scrollTo', scrollTo);

    const bodyStyle = hostStyle();
    bodyStyle.setProperty('width', '93%', 'important');
    bodyStyle.setProperty('background', 'orange');
    Object.defineProperty(document.body, 'style', { value: bodyStyle });
    Object.defineProperty(document.documentElement, 'style', {
        value: hostStyle(),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onMenuOpenChange = vi.fn();
    await act(async () => {
        root.render(
            createElement(AppShell, {
                accountMenuOpen: false,
                children: 'Feed',
                onMenuOpenChange,
                onPreferencesChange: () => undefined,
                preferences: defaultPreferences,
                sourceUrl: 'https://news.ycombinator.com/news',
                title: 'Hacker News',
            }),
        );
    });
    const dialog = container.querySelector('dialog')!;
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    Object.assign(dialog, { showModal, close });
    const trigger = container.querySelector<HTMLButtonElement>(
        '[aria-label="Open navigation"]',
    )!;
    return {
        bodyStyle,
        close,
        container,
        dialog,
        listeners,
        media,
        onMenuOpenChange,
        root,
        scrollTo,
        showModal,
        trigger,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('mobile navigation', () => {
    it('uses the desktop destinations and closes on navigation without changing desktop collapse state', async () => {
        const ui = await mountShell();
        try {
            const desktopToggle = ui.container.querySelector<HTMLButtonElement>(
                '[aria-label="Collapse navigation"]',
            )!;
            await act(async () => desktopToggle.click());
            await act(async () => ui.trigger.click());
            expect(ui.showModal).toHaveBeenCalledOnce();
            expect(ui.trigger.getAttribute('aria-expanded')).toBe('true');
            expect(ui.onMenuOpenChange).toHaveBeenCalledWith(false);
            expect(ui.bodyStyle.getPropertyValue('top')).toBe('-420px');

            const destinations = (element: Element) =>
                Array.from(element.querySelectorAll('nav a')).map((link) => ({
                    href: link.getAttribute('href'),
                    label: link.textContent,
                    current: link.getAttribute('aria-current'),
                }));
            expect(destinations(ui.dialog)).toEqual(
                destinations(ui.container.querySelector('aside')!),
            );
            const best =
                ui.dialog.querySelector<HTMLAnchorElement>('[title="Best"]')!;
            expect(best.getAttribute('href')).toBe(
                'https://news.ycombinator.com/best',
            );
            await act(async () => best.click());
            expect(ui.trigger.getAttribute('aria-expanded')).toBe('false');
            expect(ui.close).toHaveBeenCalledOnce();
            expect(desktopToggle.getAttribute('aria-expanded')).toBe('false');
        } finally {
            await act(async () => ui.root.unmount());
        }
    });

    it.each(['close', 'escape', 'desktop', 'unmount'])(
        'restores host styles and scroll after %s',
        async (action) => {
            const ui = await mountShell();
            try {
                await act(async () => ui.trigger.click());
                expect(ui.bodyStyle.getPropertyValue('position')).toBe('fixed');
                await act(async () => {
                    if (action === 'close') {
                        ui.dialog
                            .querySelector<HTMLButtonElement>('button')!
                            .click();
                    } else if (action === 'escape') {
                        const event = new window.Event('keydown', {
                            bubbles: true,
                            cancelable: true,
                        });
                        Object.defineProperty(event, 'key', {
                            value: 'Escape',
                        });
                        ui.dialog.dispatchEvent(event);
                    } else if (action === 'desktop') {
                        ui.media.matches = false;
                        ui.listeners.forEach((listener) => listener());
                    } else {
                        ui.root.unmount();
                    }
                });
                expect(ui.close).toHaveBeenCalledOnce();
                expect(ui.bodyStyle.getPropertyValue('position')).toBe('');
                expect(ui.bodyStyle.getPropertyValue('top')).toBe('');
                expect(ui.bodyStyle.getPropertyValue('width')).toBe('93%');
                expect(ui.bodyStyle.getPropertyPriority('width')).toBe(
                    'important',
                );
                expect(ui.bodyStyle.getPropertyValue('background')).toBe(
                    'orange',
                );
                expect(ui.scrollTo).toHaveBeenLastCalledWith({
                    left: 0,
                    top: 420,
                    behavior: 'instant',
                });
                expect(ui.listeners.size).toBe(0);
            } finally {
                if (action !== 'unmount')
                    await act(async () => ui.root.unmount());
            }
        },
    );
});
