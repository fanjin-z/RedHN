# Chrome Web Store Listing

## Description

RedHN makes Hacker News easier to read.

It gives Hacker News a clean, Reddit-style layout with story cards, better
comment threads, easy collapsing, saved stories, muted topics, and comfortable
reading settings.

Install RedHN if you read Hacker News often and want a calmer, faster way to
scan stories and follow discussions.

## Single Purpose

Provide a Reddit-style reading interface for Hacker News.

## Permission Justifications

### `storage`

RedHN uses extension storage to save local user preferences and reading state,
including theme, font size, line height, page width, read/viewed stories, saved
stories, muted keywords, muted domains, muted topics, and a short-lived cache of
public Hacker News API responses. This data stays in the browser's extension
storage and is not sent to a RedHN server.

## Host Permission Justifications

### `https://news.ycombinator.com/*`

RedHN runs only on Hacker News pages so it can read the current page markup,
render the enhanced reading interface, and preserve Hacker News action links and
forms for voting, replying, hiding, favoriting, and login flows.

### `https://hacker-news.firebaseio.com/*`

RedHN uses the official read-only Hacker News Firebase API to fetch public story,
comment, and user metadata such as scores, comment counts, item details, and
profile details. This host access is limited to Hacker News API data needed to
enrich the reading interface.

## Privacy Disclosure

RedHN does not collect user data for the developer. It does not include
analytics, tracking, ads, remote code, or a developer-operated backend. RedHN
stores preferences and reading state locally in extension storage, reads
supported Hacker News pages to render the enhanced interface, and requests
public metadata from the official Hacker News Firebase API.

Hacker News account actions remain interactions with Hacker News. If a user
votes, replies, hides, favorites, or logs in, those actions are handled by Hacker
News using Hacker News' own authenticated pages, links, and forms.

## Privacy Policy URL

`https://fanjin.org/blog/redhn-privacy-policy`

## Test Instructions

No RedHN account or special setup is required. Install the extension, open
`https://news.ycombinator.com/`, and the enhanced Reddit-style interface should
load automatically. Core features to review include switching theme/settings,
collapsing comment threads, saving stories, muting topics or domains, and
opening Hacker News links.
