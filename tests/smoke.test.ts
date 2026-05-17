import { describe, expect, it } from 'vitest';
import { storage } from 'wxt/utils/storage';

const launchCounter = storage.defineItem<number>('local:launch-counter', {
    fallback: 0,
});

describe('wxt smoke test', () => {
    it('stores and reads values through WXT storage', async () => {
        await launchCounter.setValue(1);
        await expect(launchCounter.getValue()).resolves.toBe(1);
    });
});
