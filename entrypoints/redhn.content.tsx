import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import RedhnApp from '../src/redhn/RedhnApp';
import './redhn/styles.css';

type MountedApp = {
    root: Root;
};

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

                const root = createRoot(mountPoint);
                root.render(
                    <React.StrictMode>
                        <RedhnApp />
                    </React.StrictMode>,
                );

                return { root };
            },
            onRemove: (mounted) => {
                mounted?.root.unmount();
            },
        });

        ui.mount();
    },
});
