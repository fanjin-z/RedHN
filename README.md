# RedHN: A Reddit-style extension for Hacker News

A browser extension that makes Hacker News feel more familiar, readable, and interactive while keeping the official site, links, and account actions intact.

Follow [@FanjinTech on X](https://x.com/FanjinTech) for more projects like this.

**Get RedHN**

| Chrome                                                                                              | Firefox                                                                  | Edge                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [Chrome Web Store](https://chromewebstore.google.com/detail/redhn/deinobdjbeklfjandchchadookglpcnc) | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/redhn/) | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/redhn/oaabfmmjfglddlcbdpeodcefmnahcchl) |

## Motivation

RedHN brings a Reddit-style UX to Hacker News: card-based stories, clearer discussion threads, familiar actions, theme controls, and easier navigation, all while staying on HN. It is built for readers who love HN's content but prefer the comfort and flow of a more modern social-news interface.

## Demo

![30-second RedHN demo](docs/readme-assets/redhn-demo.gif)

[Watch the higher-quality MP4 demo](docs/readme-assets/redhn-demo.mp4)

## Features

### Card-based story feed

Stories become scannable cards with HN metadata, voting, links, comments, hide, and viewed states.

| Hacker News                                                              | RedHN Light                                                        | RedHN Dark                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![Hacker News front page](docs/readme-assets/front-page-hacker-news.png) | ![RedHN light front page](docs/readme-assets/front-page-light.png) | ![RedHN dark front page](docs/readme-assets/front-page-dark.png) |

### Sticky navigation and search

A sticky top bar, search, sidebar, and quick links make HN feeds easier to move through.

| Hacker News                                                                        | RedHN Light                                                                  | RedHN Dark                                                                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![Hacker News feed navigation](docs/readme-assets/feed-navigation-hacker-news.png) | ![RedHN light feed navigation](docs/readme-assets/feed-navigation-light.png) | ![RedHN dark feed navigation](docs/readme-assets/feed-navigation-dark.png) |

### Visual comment threading

Thread guides, collapse controls, reply counts, inline replies, and reveal-more states make discussions easier to follow.

| Hacker News                                                          | RedHN Light                                                    | RedHN Dark                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| ![Hacker News comments](docs/readme-assets/comments-hacker-news.png) | ![RedHN light comments](docs/readme-assets/comments-light.png) | ![RedHN dark comments](docs/readme-assets/comments-dark.png) |

### Hacker News actions still work

Voting, hiding, favoriting, replying, login, signup, submit, account, and logout actions still use HN's own links and forms.

| Hacker News                                                        | RedHN Light                                                  | RedHN Dark                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| ![Hacker News actions](docs/readme-assets/actions-hacker-news.png) | ![RedHN light actions](docs/readme-assets/actions-light.png) | ![RedHN dark actions](docs/readme-assets/actions-dark.png) |

### Reading preferences and local state

Theme controls, viewed-story styling, read state, and mute filters let readers tune the interface locally.

| Hacker News                                                                 | RedHN Light                                                           | RedHN Dark                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ![Hacker News display settings](docs/readme-assets/display-hacker-news.png) | ![RedHN light display settings](docs/readme-assets/display-light.png) | ![RedHN dark display settings](docs/readme-assets/display-dark.png) |

### Profile pages with more context

Profiles show karma, join date, about text, activity, submissions, comments, favorites, upvotes, and account controls.

| Hacker News                                                        | RedHN Light                                                  | RedHN Dark                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| ![Hacker News profile](docs/readme-assets/profile-hacker-news.png) | ![RedHN light profile](docs/readme-assets/profile-light.png) | ![RedHN dark profile](docs/readme-assets/profile-dark.png) |

### A friendlier submit flow

Submit modes separate Hacker News, Ask HN, and Show HN posts with clearer URL, title, body, and rule feedback.

| Hacker News                                                      | RedHN Light                                                | RedHN Dark                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| ![Hacker News submit](docs/readme-assets/submit-hacker-news.png) | ![RedHN light submit](docs/readme-assets/submit-light.png) | ![RedHN dark submit](docs/readme-assets/submit-dark.png) |

### Classic fallback and isolated styling

The popup toggle restores classic HN immediately, while Shadow DOM keeps RedHN styling isolated.

| Hacker News                                                                          | RedHN Light                                                                    | RedHN Dark                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| ![Hacker News classic fallback](docs/readme-assets/classic-fallback-hacker-news.png) | ![RedHN light classic fallback](docs/readme-assets/classic-fallback-light.png) | ![RedHN dark classic fallback](docs/readme-assets/classic-fallback-dark.png) |

## Privacy

RedHN stores settings and read state locally in browser extension storage. It does not add analytics, tracking, ads, remote code, or a RedHN-operated backend.

RedHN runs on supported `news.ycombinator.com` pages and requests public metadata from the official read-only Hacker News Firebase API at `https://hacker-news.firebaseio.com/`.

Privacy policy: `https://fanjin.org/blog/redhn-privacy-policy`

## License

MIT
