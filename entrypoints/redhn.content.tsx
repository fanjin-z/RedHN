import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
    createShadowRootUi,
    type ShadowRootContentScriptUi,
} from 'wxt/utils/content-script-ui/shadow-root';
import RedhnApp from '../src/redhn/RedhnApp';
import { isRedhnSupportedPage, parseHnPage } from '../src/redhn/hn/parser';
import { extensionEnabledItem } from '../src/redhn/state/storage';
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
        const page = parseHnPage(document, window.location.href);

        if (!isRedhnSupportedPage(page)) {
            return;
        }

        let desiredEnabled = await extensionEnabledItem.getValue();
        let syncToken = 0;
        let ui: ShadowRootContentScriptUi<MountedApp> | null = null;
        let uiPromise: Promise<ShadowRootContentScriptUi<MountedApp>> | null =
            null;

        const getUi = () => {
            uiPromise ??= createShadowRootUi<MountedApp>(ctx, {
                name: 'redhn-root',
                position: 'inline',
                anchor: document.body,
                append: 'first',
                isolateEvents: true,
                onMount: (container) => {
                    const mountPoint = document.createElement('div');
                    mountPoint.id = 'redhn-app';
                    container.append(mountPoint);

                    const visibilityStyle = createVisibilityStyle();
                    setOriginalPageHidden(visibilityStyle, true);

                    const root = createRoot(mountPoint);
                    root.render(
                        <React.StrictMode>
                            <RedhnApp page={page} />
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
            }).then((createdUi) => {
                ui = createdUi;
                return createdUi;
            });

            return uiPromise;
        };

        const syncUi = async (enabled: boolean) => {
            desiredEnabled = enabled;
            const currentToken = ++syncToken;

            if (!enabled) {
                if (ui?.mounted) {
                    ui.remove();
                }
                return;
            }

            const currentUi = await getUi();
            if (
                ctx.isInvalid ||
                currentToken !== syncToken ||
                !desiredEnabled ||
                currentUi.mounted
            ) {
                return;
            }

            currentUi.mount();
        };

        const unwatchEnabled = extensionEnabledItem.watch((enabled) => {
            void syncUi(enabled);
        });
        ctx.onInvalidated(unwatchEnabled);

        await syncUi(desiredEnabled);
    },
});
