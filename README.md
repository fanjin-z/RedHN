# RedHN

RedHN is a WXT-powered browser extension that renders Hacker News with a
Reddit-style reading interface. It keeps the loaded HN page as the source of
truth for speed and logged-in action links, then enriches public metadata with
the official read-only Hacker News Firebase API.

## Features

- Shadow DOM-isolated React UI on `news.ycombinator.com`.
- Reddit-style feed cards with compact density mode.
- Post pages with nested comment guides, per-thread collapse, and collapse by
  depth.
- Inline post comments and per-comment replies using Hacker News' authenticated
  reply forms.
- Classic Toggle to restore the original Hacker News page immediately.
- Storage-backed preferences for theme, font size, line height, max width, and
  density.
- Read/viewed story state, saved stories, muted keywords, muted domains, and
  muted topics.
- Background-only Hacker News API enrichment for scores/comment counts and item
  cache.
- Enhanced fallback for HN actions: safe same-origin vote, hide, and favorite
  links are fetched with credentials; replies submit inline when HN provides an
  authenticated form, and login/unknown flows link back to the original HN page.

## Privacy

RedHN stores settings and read state locally with extension storage. It requests
only `storage` plus host access for the official Hacker News Firebase API:
`https://hacker-news.firebaseio.com/*`. It does not add analytics, tracking, or
third-party write endpoints.

## Project Structure

```
entrypoints/
	background.ts
	redhn.content.tsx
	redhn/
		styles.css
public/
src/
	redhn/
		api/
		hn/
		state/
tests/
	fixtures/
	hn-actions.test.ts
	hn-api.test.ts
	hn-parser.test.ts
	redhn-state.test.ts
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
- The official Hacker News API is read-only. Authenticated write-like actions
  rely on action links/forms already present in the loaded HN page.
- Inline commenting uses Hacker News' native authenticated reply forms. If the
  user is logged out, RedHN keeps the draft in place and links to HN's original
  login/reply flow.
- If an HN markup change breaks parsing, the Classic Toggle restores the
  original page without requiring a reload.
