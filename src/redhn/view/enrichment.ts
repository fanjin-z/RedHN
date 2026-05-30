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
        title: item.title ?? story.title,
        url: item.url ?? story.url,
        author: item.by ?? story.author,
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
        createdAt: user.created ?? profile.createdAt,
        karma: user.karma ?? profile.karma,
        about: user.about ? textFromHtml(user.about) : profile.about,
        aboutHtml: user.about ?? profile.aboutHtml,
    };
}

export function isVisibleApiItem(
    item: HnApiItem | null | undefined,
): item is HnApiItem {
    return item !== null && item !== undefined && !item.deleted && !item.dead;
}
