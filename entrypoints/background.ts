function registerRuntimeHooks(): void {
    browser.runtime.onInstalled.addListener(() => {
        console.info('RedHN installed successfully.');
    });
}

export default defineBackground(() => {
    registerRuntimeHooks();
});