# RedHN: A Reddit-style extension for Hacker News

A browser extension that makes Hacker News feel more familiar, readable, and interactive while keeping the official site, links, and account actions intact.

Follow [@FanjinTech on X](https://x.com/FanjinTech) for more projects like this.

**Get RedHN**

| Chrome                                                                                              | Firefox                                                                  | Edge           |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------- |
| [Chrome Web Store](https://chromewebstore.google.com/detail/redhn/deinobdjbeklfjandchchadookglpcnc) | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/redhn/) | Pending review |

## Motivation

RedHN brings a Reddit-style UX to Hacker News: card-based stories, clearer discussion threads, familiar actions, theme controls, and easier navigation, all while staying on HN. It is built for readers who love HN's content but prefer the comfort and flow of a more modern social-news interface.

## Features

### Card-based story feed

Reddit makes posts feel like distinct units you can browse, vote on, open, share, or skip. RedHN brings that card-based rhythm to Hacker News while preserving HN's metadata: title, source domain, author, age, score, comments, hide, viewed state, and links to both the story and discussion.

| Hacker News                                                              | RedHN Light                                                        | RedHN Dark                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![Hacker News front page](docs/readme-assets/front-page-hacker-news.png) | ![RedHN light front page](docs/readme-assets/front-page-light.png) | ![RedHN dark front page](docs/readme-assets/front-page-dark.png) |

### Sticky navigation and search

Reddit-style browsing depends on fast movement between feeds and communities. RedHN gives Hacker News a sticky top bar, search, collapsible sidebar, and quick access to HN's main sections: Hacker News, Best, New, Past, Comments, Ask HN, Show HN, Jobs, Guidelines, and FAQ.

| Hacker News                                                                        | RedHN Light                                                                  | RedHN Dark                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![Hacker News feed navigation](docs/readme-assets/feed-navigation-hacker-news.png) | ![RedHN light feed navigation](docs/readme-assets/feed-navigation-light.png) | ![RedHN dark feed navigation](docs/readme-assets/feed-navigation-dark.png) |

### Visual comment threading

Reddit discussions are easier to follow because replies feel connected to their parent comments. RedHN brings that clarity to Hacker News with vertical thread guides, larger collapse targets, collapsed branch states, reply counts, inline replies, and reveal-more controls for deep conversations.

| Hacker News                                                          | RedHN Light                                                    | RedHN Dark                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| ![Hacker News comments](docs/readme-assets/comments-hacker-news.png) | ![RedHN light comments](docs/readme-assets/comments-light.png) | ![RedHN dark comments](docs/readme-assets/comments-dark.png) |

### Hacker News actions still work

Reddit keeps common actions close to the content. RedHN does the same for Hacker News: voting, hiding, favoriting, replying, logging in, signing up, opening threads, creating posts, editing account settings, and logging out all stay available through HN's own links and forms, with optimistic UI where safe.

| Hacker News                                                        | RedHN Light                                                  | RedHN Dark                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| ![Hacker News actions](docs/readme-assets/actions-hacker-news.png) | ![RedHN light actions](docs/readme-assets/actions-light.png) | ![RedHN dark actions](docs/readme-assets/actions-dark.png) |

### Reading preferences and local state

Modern social apps let readers shape the interface around their habits. RedHN adds light, dark, and system theme controls, local reading preferences, viewed-story styling, item-page read state, and support for stored keyword, domain, and topic mute filters.

| Hacker News                                                                 | RedHN Light                                                           | RedHN Dark                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ![Hacker News display settings](docs/readme-assets/display-hacker-news.png) | ![RedHN light display settings](docs/readme-assets/display-light.png) | ![RedHN dark display settings](docs/readme-assets/display-dark.png) |

### Profile pages with more context

Reddit profiles make activity easier to browse. RedHN gives Hacker News profiles a clearer overview with karma, joined date, about text, recent activity, posts, comments, favorites, upvoted posts, upvoted comments, favorite comments, and own-account controls.

| Hacker News                                                        | RedHN Light                                                  | RedHN Dark                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| ![Hacker News profile](docs/readme-assets/profile-hacker-news.png) | ![RedHN light profile](docs/readme-assets/profile-light.png) | ![RedHN dark profile](docs/readme-assets/profile-dark.png) |

### A friendlier submit flow

Reddit's create flow makes post type and intent explicit. RedHN brings that clarity to Hacker News submissions with Hacker News, Ask HN, and Show HN modes, title prefix handling, URL behavior, character-count feedback, body text, and posting rules.

| Hacker News                                                      | RedHN Light                                                | RedHN Dark                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| ![Hacker News submit](docs/readme-assets/submit-hacker-news.png) | ![RedHN light submit](docs/readme-assets/submit-light.png) | ![RedHN dark submit](docs/readme-assets/submit-dark.png) |

### Classic fallback and isolated styling

RedHN is an optional Reddit-style layer, not a replacement for Hacker News. The popup toggle brings classic HN back immediately, and the extension runs in a Shadow DOM so RedHN styles and events stay isolated from the original page.

| Hacker News                                                                          | RedHN Light                                                                    | RedHN Dark                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| ![Hacker News classic fallback](docs/readme-assets/classic-fallback-hacker-news.png) | ![RedHN light classic fallback](docs/readme-assets/classic-fallback-light.png) | ![RedHN dark classic fallback](docs/readme-assets/classic-fallback-dark.png) |

## Privacy

RedHN stores settings and read state locally in browser extension storage. It does not add analytics, tracking, ads, remote code, or a RedHN-operated backend.

RedHN runs on supported `news.ycombinator.com` pages and requests public metadata from the official read-only Hacker News Firebase API at `https://hacker-news.firebaseio.com/`.

Privacy policy: `https://fanjin.org/blog/redhn-privacy-policy`

## License

MIT
