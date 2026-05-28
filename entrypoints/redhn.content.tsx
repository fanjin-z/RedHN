import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import RedhnApp from '../src/redhn/RedhnApp';
import { parseHnPage } from '../src/redhn/hn/parser';
import './redhn/styles.css';

type MountedApp = {
    root: Root;
    visibilityStyle: HTMLStyleElement;
};

function createVisibilityStyle(): HTMLStyleElement {
    const style = document.createElement('style');
    style.id = 'redhn-original-page-visibility';
    document.head.append(style);
    return style;
}

function setOriginalPageHidden(style: HTMLStyleElement, hidden: boolean): void {
    style.textContent = hidden
        ? `
            html,
            body {
                margin: 0 !important;
                padding: 0 !important;
            }

            redhn-root {
                display: block !important;
            }

            body > :not(redhn-root) {
                display: none !important;
            }
        `
        : '';
}

export default defineContentScript({
    matches: ['https://news.ycombinator.com/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {
        const ui = await createShadowRootUi<MountedApp>(ctx, {
            name: 'redhn-root',
            position: 'inline',
            anchor: document.body,
            append: 'first',
            isolateEvents: true,
            onMount: (container) => {
                const mountPoint = document.createElement('div');
                mountPoint.id = 'redhn-app';
                container.append(mountPoint);

                const page = parseHnPage(document, window.location.href);
                const visibilityStyle = createVisibilityStyle();
                setOriginalPageHidden(visibilityStyle, true);

                const root = createRoot(mountPoint);
                root.render(
                    <React.StrictMode>
                        <RedhnApp
                            page={page}
                            onClassicToggle={(enabled) => {
                                setOriginalPageHidden(visibilityStyle, enabled);
                            }}
                        />
                    </React.StrictMode>,
                );

                return { root, visibilityStyle };
            },
            onRemove: (mounted) => {
                if (mounted?.visibilityStyle) {
                    setOriginalPageHidden(mounted.visibilityStyle, false);
                    mounted.visibilityStyle.remove();
                }
                mounted?.root.unmount();
            },
        });

        ui.mount();
    },
});
