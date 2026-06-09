import { defineConfig } from 'wxt';

export default defineConfig({
    targetBrowsers: ['chrome', 'firefox'],
    manifestVersion: 3,
    manifest: {
        name: 'RedHN',
        description: 'A Reddit-style reading interface for Hacker News.',
        permissions: ['storage'],
        host_permissions: ['https://hacker-news.firebaseio.com/*'],
        browser_specific_settings: {
            gecko: {
                id: '{236c74aa-26d2-4453-ab23-90148d0cce77}',
                data_collection_permissions: {
                    required: ['none'],
                },
            },
            gecko_android: {},
        },
    },
    webExt: {
        chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
        keepProfileChanges: true,
    },
});
