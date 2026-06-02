import { describe, expect, it } from 'vitest';
import { storage } from 'wxt/utils/storage';
import { extensionEnabledItem } from '../src/redhn/state/storage';

const launchCounter = storage.defineItem<number>('local:launch-counter', {
    fallback: 0,
});

describe('wxt smoke test', () => {
    it('stores and reads values through WXT storage', async () => {
        await launchCounter.setValue(1);
        await expect(launchCounter.getValue()).resolves.toBe(1);
    });

    it('defaults RedHN extension rendering to enabled', async () => {
        await extensionEnabledItem.removeValue();
        await expect(extensionEnabledItem.getValue()).resolves.toBe(true);

        await extensionEnabledItem.setValue(false);
        await expect(extensionEnabledItem.getValue()).resolves.toBe(false);

        await extensionEnabledItem.removeValue();
    });
});
