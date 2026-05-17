# RedHN

RedHN is a WXT-powered browser extension project with a TypeScript-first setup,
ESLint 9 flat config, and a basic Vitest smoke test.

## Project Structure

```
entrypoints/
	background.ts
public/
tests/
	smoke.test.ts
eslint.config.mjs
tsconfig.json
vitest.config.ts
wxt.config.ts
```

## Commands

- `npm run dev` starts the Chrome development runner.
- `npm run dev:firefox` starts the Firefox development runner.
- `npm run build` builds the extension for Chrome.
- `npm run build:firefox` builds the extension for Firefox.
- `npm run lint` runs ESLint.
- `npm run lint:fix` runs ESLint with auto-fixes.
- `npm run format:all` formats all files with Prettier.
- `npm run format:cached` formats staged files with Prettier.
- `npm run typecheck` runs TypeScript type checking.
- `npm test` runs the Vitest test suite once.
- `npm run test:watch` runs Vitest in watch mode.

## Git Hooks

- `pre-commit` runs `npm run lint:fix`, `npm run format:cached`, then `git update-index --again`.

## Notes

- TypeScript configuration extends WXT-generated settings from
  `.wxt/tsconfig.json`.
- Browser startup defaults are configured in `wxt.config.ts`.
- You can add machine-local startup overrides in `web-ext.config.ts`.
