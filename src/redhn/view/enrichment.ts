import type { HnApiItem, HnApiUser } from '../api/hnApi';
import type { ParsedProfile, ParsedStory } from '../hn/types';
import { textFromHtml } from './html';

export function enrichStoryWithApiItem(
    story: ParsedStory,
    item: HnApiItem | null | undefined,
): ParsedStory {
    if (!item) {
        return story;
    }

    return {
        ...story,
        type: story.type ?? item.type,
        title: story.title ?? item.title,
        url: story.url ?? item.url,
        author: story.author ?? item.by,
        score: story.score ?? item.score,
        commentCount: story.commentCount ?? item.descendants,
        textHtml: story.textHtml ?? item.text,
        text: story.text ?? (item.text ? textFromHtml(item.text) : undefined),
    };
}

export function enrichProfileWithApiUser(
    profile: ParsedProfile,
    user: HnApiUser | null | undefined,
): ParsedProfile {
    if (!user) {
        return profile;
    }

    return {
        ...profile,
        createdAt: profile.createdAt ?? user.created,
        karma: profile.karma ?? user.karma,
        about:
            profile.about ??
            (user.about ? textFromHtml(user.about) : undefined),
        aboutHtml: profile.aboutHtml ?? user.about,
    };
}

export function isVisibleApiItem(
    item: HnApiItem | null | undefined,
): item is HnApiItem {
    return item !== null && item !== undefined && !item.deleted && !item.dead;
}
