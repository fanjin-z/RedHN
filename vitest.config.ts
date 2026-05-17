import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
    plugins: await WxtVitest(),
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
        globals: true,
    },
});
