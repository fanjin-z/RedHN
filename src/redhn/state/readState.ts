import type { ParsedComment, ParsedPage } from '../hn/types';

export type RedhnReadState = {
    viewedStoryIds: Record<string, number>;
    readCommentIds: Record<string, number>;
    storyCommentCounts: Record<string, number>;
};

export const defaultReadState: RedhnReadState = {
    viewedStoryIds: {},
    readCommentIds: {},
    storyCommentCounts: {},
};

export function markStoryViewed(
    readState: RedhnReadState,
    storyId: number,
    viewedAt: number,
): RedhnReadState {
    return {
        ...readState,
        viewedStoryIds: {
            ...readState.viewedStoryIds,
            [storyId]: viewedAt,
        },
    };
}

export function markPageRead(
    readState: RedhnReadState,
    page: ParsedPage,
    viewedAt: number,
): RedhnReadState {
    if (!page.post) {
        return readState;
    }

    const commentIds = collectCommentIds(page.comments);
    return {
        viewedStoryIds: {
            ...readState.viewedStoryIds,
            [page.post.id]: viewedAt,
        },
        readCommentIds: {
            ...readState.readCommentIds,
            ...Object.fromEntries(commentIds.map((id) => [id, viewedAt])),
        },
        storyCommentCounts: {
            ...readState.storyCommentCounts,
            [page.post.id]: commentIds.length,
        },
    };
}

export function countNewComments(
    readState: RedhnReadState,
    page: ParsedPage,
): number {
    if (!page.post) {
        return 0;
    }

    const previousCount = readState.storyCommentCounts[page.post.id] ?? 0;
    return Math.max(0, collectCommentIds(page.comments).length - previousCount);
}

export function collectCommentIds(comments: ParsedComment[]): number[] {
    return comments.flatMap((comment) => [
        comment.id,
        ...collectCommentIds(comment.children),
    ]);
}
