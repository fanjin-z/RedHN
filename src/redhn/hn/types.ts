export type ParsedPageKind = 'feed' | 'item' | 'unknown';

export type HnActionMap = {
    upvote?: string;
    downvote?: string;
    hide?: string;
    favorite?: string;
    reply?: string;
    comments?: string;
    parent?: string;
    next?: string;
    more?: string;
};

export type ParsedStory = {
    id: number;
    rank?: number;
    title: string;
    url: string;
    hnUrl: string;
    domain?: string;
    author?: string;
    age?: string;
    score?: number;
    commentCount?: number;
    textHtml?: string;
    text?: string;
    actions: HnActionMap;
};

export type ParsedComment = {
    id: number;
    depth: number;
    author?: string;
    age?: string;
    text: string;
    html: string;
    actions: HnActionMap;
    children: ParsedComment[];
};

export type ParsedPagination = {
    more?: string;
};

export type ParsedCurrentUser = {
    id: string;
    profileUrl: string;
    logoutUrl?: string;
};

export type ParsedPage = {
    kind: ParsedPageKind;
    sourceUrl: string;
    title?: string;
    currentUser?: ParsedCurrentUser;
    stories: ParsedStory[];
    post?: ParsedStory;
    comments: ParsedComment[];
    pagination: ParsedPagination;
    capturedAt: number;
};
