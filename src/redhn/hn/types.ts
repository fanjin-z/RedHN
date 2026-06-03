export type ParsedPageKind =
    | 'feed'
    | 'item'
    | 'profile'
    | 'auth'
    | 'submit'
    | 'unknown';

export type ParsedProfileTab =
    | 'overview'
    | 'posts'
    | 'comments'
    | 'favorites'
    | 'upvotedPosts'
    | 'upvotedComments'
    | 'favoriteComments';

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

export type ParsedProfileSelectOption = {
    value: string;
    label: string;
};

export type ParsedProfileSelectField = {
    name: string;
    value: string;
    options: ParsedProfileSelectOption[];
};

export type ParsedProfileTextField = {
    name: string;
    value: string;
};

export type ParsedProfileAccountForm = {
    action: string;
    method: string;
    hiddenFields: Record<string, string>;
    submitLabel?: string;
    about?: ParsedProfileTextField;
    email?: ParsedProfileTextField;
    showDead?: ParsedProfileSelectField;
    noProcrast?: ParsedProfileSelectField;
    maxVisit?: ParsedProfileTextField;
    minAway?: ParsedProfileTextField;
    delay?: ParsedProfileTextField;
    links: {
        changePassword?: string;
        submitted?: string;
        comments?: string;
        upvotedSubmissions?: string;
        upvotedComments?: string;
        favoriteSubmissions?: string;
        favoriteComments?: string;
        formatDoc?: string;
    };
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
        upvotedSubmissions: string;
        upvotedComments: string;
        favoriteComments: string;
    };
    accountForm?: ParsedProfileAccountForm;
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
    submitLabel?: string;
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
