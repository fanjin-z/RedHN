import { defineConfig } from 'wxt';

export default defineConfig({
    targetBrowsers: ['chrome', 'firefox'],
    manifest: {
        name: 'RedHN',
        description: 'RedHN browser extension built with WXT',
        permissions: ['storage'],
    },
    webExt: {
        chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
        keepProfileChanges: true,
    },
});
