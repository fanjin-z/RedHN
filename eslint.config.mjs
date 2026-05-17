import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { existsSync } from 'node:fs';
import eslintConfigPrettier from 'eslint-config-prettier';

const autoImportsModule = './.wxt/eslint-auto-imports.mjs';
const autoImportsExport = existsSync(autoImportsModule)
    ? (await import(autoImportsModule)).default
    : [];
const autoImports = Array.isArray(autoImportsExport)
    ? autoImportsExport
    : [autoImportsExport];

export default tseslint.config(
    {
        ignores: ['.output/**', '.wxt/**', 'coverage/**', 'node_modules/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                },
            ],
        },
    },
    ...autoImports,
    eslintConfigPrettier,
);
