# RedHN

RedHN is a browser extension that gives Hacker News a modern, Reddit-style
reading interface. It keeps you on the official Hacker News site while making
stories easier to scan, comments easier to follow, and daily reading more
comfortable.

## Motivation

Hacker News is one of the best places to find thoughtful technical discussions,
and its classic interface is intentionally minimal. RedHN is for readers who
want a more structured, familiar browsing experience while still using the
original Hacker News domain.

The design is opinionated, with an emphasis on fast scanning, readable threads,
and information density.

## Features

- Reddit-style story cards for easier scanning.
- Cleaner nested comment threads with visual guides.
- Collapse individual threads or hide replies after a chosen depth.
- Mute keywords, domains, and topics.
- Adjust theme, font size, line height, density, and content width.
- Reply, vote, hide, and favorite through Hacker News' own links and forms.
- Toggle back to classic Hacker News at any time.
- Keep settings and read state in local browser storage.

## Screenshots

Screenshots are placeholders for now and will be replaced with real examples.

| Feed                                                                           | Comments                                                                                           | Settings                                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| ![Feed before and after placeholder](docs/readme-assets/feed-before-after.png) | ![Comment thread before and after placeholder](docs/readme-assets/comment-thread-before-after.png) | ![Settings placeholder](docs/readme-assets/settings-placeholder.png) |

## Privacy

RedHN stores settings and read state locally in browser extension storage. It
does not add analytics, tracking, ads, remote code, or a RedHN-operated backend.

RedHN runs on supported `news.ycombinator.com` pages and requests public
metadata from the official read-only Hacker News Firebase API at
`https://hacker-news.firebaseio.com/`.

Privacy policy: `https://fanjin.org/blog/redhn-privacy-policy`

## Development

RedHN is built with WXT, React, and TypeScript.

```sh
npm install
npm run dev
```

Useful commands:

- `npm run dev` starts the Chrome development runner.
- `npm run dev:firefox` starts the Firefox development runner.
- `npm run build` builds the extension for Chrome.
- `npm run build:firefox` builds the extension for Firefox.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript type checking.
- `npm test` runs the Vitest test suite once.

## Publishing Notes

- Chrome Web Store listing copy and permission justifications live in
  `docs/chrome-web-store.md`.
- The privacy policy source lives in `docs/privacy-policy.md`.
- The extension requests `storage` plus host access for the official Hacker
  News Firebase API.
- Authenticated Hacker News actions rely on links and forms already provided by
  the loaded Hacker News page.

## License

MIT
