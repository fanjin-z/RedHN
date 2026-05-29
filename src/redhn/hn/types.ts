export type ParsedPageKind = 'feed' | 'item' | 'profile' | 'unknown';

export type ParsedProfileTab = 'overview' | 'posts' | 'comments' | 'favorites';

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

export type ParsedProfile = {
    id: string;
    tab: ParsedProfileTab;
    createdAt?: number;
    created?: string;
    karma?: number;
    about?: string;
    aboutHtml?: string;
    links: {
        profile: string;
        submitted: string;
        comments: string;
        favorites: string;
    };
};

export type ParsedPage = {
    kind: ParsedPageKind;
    sourceUrl: string;
    title?: string;
    currentUser?: ParsedCurrentUser;
    stories: ParsedStory[];
    post?: ParsedStory;
    profile?: ParsedProfile;
    comments: ParsedComment[];
    pagination: ParsedPagination;
    capturedAt: number;
};
