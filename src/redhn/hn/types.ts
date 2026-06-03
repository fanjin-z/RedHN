export type ParsedPageKind =
    | 'feed'
    | 'item'
    | 'profile'
    | 'auth'
    | 'submit'
    | 'unknown';

export type ParsedProfileTab = 'overview' | 'posts' | 'comments' | 'favorites';

export type ParsedAuthMode = 'login' | 'signup';

export type HnItemType = 'job' | 'story' | 'comment' | 'poll' | 'pollopt';

export type HnActionMap = {
    upvote?: string;
    unvote?: string;
    downvote?: string;
    hide?: string;
    favorite?: string;
    unfavorite?: string;
    reply?: string;
    comments?: string;
    parent?: string;
    next?: string;
    more?: string;
};

export type ParsedStory = {
    id: number;
    type?: HnItemType;
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

export type ParsedAuthForm = {
    action: string;
    method: string;
    usernameName: string;
    passwordName: string;
    submitLabel?: string;
    hiddenFields: Record<string, string>;
};

export type ParsedAuthPage = {
    initialMode: ParsedAuthMode;
    login: ParsedAuthForm;
    signup?: ParsedAuthForm;
    forgotUrl?: string;
    gotoUrl: string;
};

export type ParsedSubmitForm = {
    action: string;
    method: string;
    titleName: string;
    urlName: string;
    textName: string;
    titleValue: string;
    urlValue: string;
    textValue: string;
    hiddenFields: Record<string, string>;
};

export type ParsedSubmitPage = {
    form: ParsedSubmitForm;
    helperText?: string;
    bookmarkletUrl?: string;
};

export type ParsedPage = {
    kind: ParsedPageKind;
    sourceUrl: string;
    title?: string;
    currentUser?: ParsedCurrentUser;
    stories: ParsedStory[];
    post?: ParsedStory;
    profile?: ParsedProfile;
    auth?: ParsedAuthPage;
    submit?: ParsedSubmitPage;
    comments: ParsedComment[];
    pagination: ParsedPagination;
    capturedAt: number;
};
