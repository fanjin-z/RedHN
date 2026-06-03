import { useCallback, useEffect, useState } from 'react';
import {
    ArrowFatUpIcon,
    CaretDownIcon,
    ChatCircleIcon,
} from '@phosphor-icons/react';
import type { HnApiItem, HnApiUser } from '../api/hnApi';
import { CommentThread } from '../components/CommentThread';
import { StoryFeed } from '../components/StoryFeed';
import { useCloseOnOutsidePointer } from '../components/useCloseOnOutsidePointer';
import { UserAvatar, userInitials } from '../components/UserAvatar';
import type {
    ParsedComment,
    ParsedPage,
    ParsedProfile,
    ParsedProfileAccountForm,
    ParsedProfileSelectField,
    ParsedProfileTextField,
    ParsedStory,
} from '../hn/types';
import type { RedhnReadState } from '../state/readState';
import {
    formatNumber,
    formatProfileDate,
    formatUnixDate,
} from '../view/format';
import { sanitizeHnHtml } from '../view/html';
import { hnItemUrl } from '../view/urls';

type ProfilePageProps = {
    profile: ParsedProfile;
    page: ParsedPage;
    apiUser: HnApiUser | null | undefined;
    overviewItems: HnApiItem[];
    overviewLoading: boolean;
    stories: ParsedStory[];
    comments: ParsedComment[];
    hiddenStoryCount: number;
    readState: RedhnReadState;
    savedStoryIds: Set<number>;
    sharedStoryId?: number;
    pendingVoteStoryIds: Set<number>;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
    onVote: (story: ParsedStory) => void;
};

type ProfileVisibleTab = ParsedProfile['tab'] | 'account';

type ProfileMoreLink = {
    href: string;
    label: string;
};

const profileTabs: Array<{
    tab: ParsedProfile['tab'];
    label: string;
    link: keyof ParsedProfile['links'];
}> = [
    { tab: 'overview', label: 'Overview', link: 'profile' },
    { tab: 'posts', label: 'Posts', link: 'submitted' },
    { tab: 'comments', label: 'Comments', link: 'comments' },
    { tab: 'favorites', label: 'Favorites', link: 'favorites' },
];

export function ProfilePage({
    profile,
    page,
    apiUser,
    overviewItems,
    overviewLoading,
    stories,
    comments,
    hiddenStoryCount,
    readState,
    savedStoryIds,
    sharedStoryId,
    pendingVoteStoryIds,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
    onVote,
}: ProfilePageProps) {
    const [activeTab, setActiveTab] = useState<ProfileVisibleTab>(profile.tab);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const isOwnProfile = Boolean(
        profile.accountForm || page.currentUser?.id === profile.id,
    );
    const moreLinks = isOwnProfile ? profileMoreLinks(profile) : [];
    const closeMoreMenu = useCallback(() => {
        setMoreMenuOpen(false);
    }, []);
    const moreMenuRef = useCloseOnOutsidePointer<HTMLDivElement>({
        open: moreMenuOpen,
        onClose: closeMoreMenu,
    });

    useEffect(() => {
        setActiveTab(profile.tab);
        setMoreMenuOpen(false);
    }, [profile.id, profile.tab]);

    return (
        <section className="redhn-profile" aria-label={`${profile.id} profile`}>
            <div className="redhn-profile__main">
                <header className="redhn-profile-hero">
                    <div className="redhn-profile-hero__avatar">
                        {userInitials(profile.id)}
                    </div>
                    <div>
                        <h1>{profile.id}</h1>
                        <p>u/{profile.id}</p>
                    </div>
                </header>
                <nav className="redhn-profile-tabs" aria-label="Profile">
                    {profile.accountForm ? (
                        <button
                            className={
                                activeTab === 'account'
                                    ? 'redhn-profile-tabs__item redhn-profile-tabs__item--active'
                                    : 'redhn-profile-tabs__item'
                            }
                            onClick={() => {
                                setActiveTab('account');
                                setMoreMenuOpen(false);
                            }}
                            type="button"
                        >
                            Account
                        </button>
                    ) : isOwnProfile ? (
                        <a
                            className="redhn-profile-tabs__item"
                            href={profile.links.profile}
                        >
                            Account
                        </a>
                    ) : null}
                    {profileTabs.map((item) => (
                        <a
                            className={
                                activeTab === item.tab
                                    ? 'redhn-profile-tabs__item redhn-profile-tabs__item--active'
                                    : 'redhn-profile-tabs__item'
                            }
                            href={profile.links[item.link]}
                            key={item.tab}
                        >
                            {item.label}
                        </a>
                    ))}
                    {moreLinks.length > 0 ? (
                        <div
                            className="redhn-profile-tabs__more"
                            ref={moreMenuRef}
                        >
                            <button
                                aria-expanded={moreMenuOpen}
                                aria-haspopup="menu"
                                className={
                                    isMoreTab(activeTab)
                                        ? 'redhn-profile-tabs__item redhn-profile-tabs__item--more redhn-profile-tabs__item--active'
                                        : 'redhn-profile-tabs__item redhn-profile-tabs__item--more'
                                }
                                onClick={() => {
                                    setMoreMenuOpen((current) => !current);
                                }}
                                type="button"
                            >
                                <span>More</span>
                                <CaretDownIcon
                                    aria-hidden="true"
                                    weight="bold"
                                />
                            </button>
                            {moreMenuOpen ? (
                                <div
                                    aria-label="More profile links"
                                    className="redhn-profile-tabs__more-menu"
                                    role="menu"
                                >
                                    {moreLinks.map((link) => (
                                        <a
                                            href={link.href}
                                            key={link.label}
                                            role="menuitem"
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </nav>
                {activeTab === 'overview' ? (
                    <ProfileOverviewFeed
                        items={overviewItems}
                        loading={overviewLoading}
                        profile={profile}
                    />
                ) : null}
                {activeTab === 'posts' ? (
                    stories.length > 0 || page.pagination.more ? (
                        <StoryFeed
                            hiddenStoryCount={hiddenStoryCount}
                            onHnAction={onHnAction}
                            onSave={onSave}
                            onShare={onShare}
                            onStoryView={onStoryView}
                            onVote={onVote}
                            page={page}
                            pendingVoteStoryIds={pendingVoteStoryIds}
                            readState={readState}
                            savedStoryIds={savedStoryIds}
                            sharedStoryId={sharedStoryId}
                            stories={stories}
                        />
                    ) : (
                        <ProfileEmptyState title="No posts yet" />
                    )
                ) : null}
                {activeTab === 'comments' ? (
                    <ProfileCommentsList
                        comments={comments}
                        onHnAction={onHnAction}
                    />
                ) : null}
                {activeTab === 'favorites' ? (
                    stories.length > 0 || page.pagination.more ? (
                        <StoryFeed
                            hiddenStoryCount={hiddenStoryCount}
                            onHnAction={onHnAction}
                            onSave={onSave}
                            onShare={onShare}
                            onStoryView={onStoryView}
                            onVote={onVote}
                            page={page}
                            pendingVoteStoryIds={pendingVoteStoryIds}
                            readState={readState}
                            savedStoryIds={savedStoryIds}
                            sharedStoryId={sharedStoryId}
                            stories={stories}
                        />
                    ) : (
                        <ProfileEmptyState title="No visible favorites" />
                    )
                ) : null}
                {activeTab === 'upvotedPosts' ? (
                    stories.length > 0 || page.pagination.more ? (
                        <StoryFeed
                            hiddenStoryCount={hiddenStoryCount}
                            onHnAction={onHnAction}
                            onSave={onSave}
                            onShare={onShare}
                            onStoryView={onStoryView}
                            onVote={onVote}
                            page={page}
                            pendingVoteStoryIds={pendingVoteStoryIds}
                            readState={readState}
                            savedStoryIds={savedStoryIds}
                            sharedStoryId={sharedStoryId}
                            stories={stories}
                        />
                    ) : (
                        <ProfileEmptyState title="No upvoted posts" />
                    )
                ) : null}
                {activeTab === 'upvotedComments' ? (
                    <ProfileCommentsList
                        comments={comments}
                        onHnAction={onHnAction}
                    />
                ) : null}
                {activeTab === 'favoriteComments' ? (
                    <ProfileCommentsList
                        comments={comments}
                        onHnAction={onHnAction}
                    />
                ) : null}
                {activeTab === 'account' && profile.accountForm ? (
                    <ProfileAccountForm form={profile.accountForm} />
                ) : null}
            </div>
            <ProfileSummaryCard apiUser={apiUser} profile={profile} />
        </section>
    );
}

function profileMoreLinks(profile: ParsedProfile): ProfileMoreLink[] {
    return [
        {
            href: profile.links.upvotedSubmissions,
            label: 'Upvoted posts',
        },
        {
            href: profile.links.upvotedComments,
            label: 'Upvoted comments',
        },
        {
            href: profile.links.favoriteComments,
            label: 'Favorite comments',
        },
    ];
}

function isMoreTab(tab: ProfileVisibleTab): boolean {
    return (
        tab === 'upvotedPosts' ||
        tab === 'upvotedComments' ||
        tab === 'favoriteComments'
    );
}

function ProfileAccountForm({ form }: { form: ParsedProfileAccountForm }) {
    const [about, setAbout] = useState(form.about?.value ?? '');
    const [email, setEmail] = useState(form.email?.value ?? '');
    const [showDead, setShowDead] = useState(form.showDead?.value ?? 'no');
    const [noProcrast, setNoProcrast] = useState(
        form.noProcrast?.value ?? 'no',
    );
    const [maxVisit, setMaxVisit] = useState(form.maxVisit?.value ?? '');
    const [minAway, setMinAway] = useState(form.minAway?.value ?? '');
    const [delay, setDelay] = useState(form.delay?.value ?? '');
    const showVisitLimits = noProcrast === 'yes';

    return (
        <form
            action={form.action}
            className="redhn-profile-account"
            method={form.method}
        >
            {Object.entries(form.hiddenFields).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
            ))}
            {form.about ? (
                <ProfileAccountTextArea
                    field={form.about}
                    helper="public bio. HN formatting works here."
                    label="About"
                    onChange={setAbout}
                    value={about}
                />
            ) : null}
            {form.links.formatDoc ? (
                <a
                    className="redhn-profile-account__help-link"
                    href={form.links.formatDoc}
                >
                    Formatting help
                </a>
            ) : null}
            {form.email ? (
                <ProfileAccountInput
                    field={form.email}
                    helper="private. only HN admins can see it."
                    label="Email"
                    onChange={setEmail}
                    type="email"
                    value={email}
                />
            ) : null}
            {form.links.changePassword ? (
                <a
                    className="redhn-profile-account__utility-link"
                    href={form.links.changePassword}
                >
                    Change password
                </a>
            ) : null}
            <section
                className="redhn-profile-account__group"
                aria-label="Display settings"
            >
                {form.showDead ? (
                    <ProfileAccountSelect
                        field={form.showDead}
                        helper="show dead posts and comments."
                        label="Showdead"
                        onChange={setShowDead}
                        value={showDead}
                    />
                ) : null}
                {form.delay ? (
                    <ProfileAccountInput
                        field={form.delay}
                        helper="delay your comments before they go live. max 10 minutes."
                        label="Delay"
                        max="10"
                        min="0"
                        onChange={setDelay}
                        type="number"
                        value={delay}
                    />
                ) : null}
            </section>
            <section
                className="redhn-profile-account__group"
                aria-label="Procrastination settings"
            >
                {form.noProcrast ? (
                    <ProfileAccountSelect
                        field={form.noProcrast}
                        helper="turn on HN's time limit."
                        label="Noprocrast"
                        onChange={setNoProcrast}
                        value={noProcrast}
                    />
                ) : null}
                {showVisitLimits ? (
                    <>
                        {form.maxVisit ? (
                            <ProfileAccountInput
                                field={form.maxVisit}
                                helper="minutes allowed per visit."
                                label="Maxvisit"
                                min="0"
                                onChange={setMaxVisit}
                                type="number"
                                value={maxVisit}
                            />
                        ) : null}
                        {form.minAway ? (
                            <ProfileAccountInput
                                field={form.minAway}
                                helper="minutes away before HN lets you back."
                                label="Minaway"
                                min="0"
                                onChange={setMinAway}
                                type="number"
                                value={minAway}
                            />
                        ) : null}
                    </>
                ) : (
                    <>
                        {form.maxVisit ? (
                            <input
                                name={form.maxVisit.name}
                                type="hidden"
                                value={maxVisit}
                            />
                        ) : null}
                        {form.minAway ? (
                            <input
                                name={form.minAway.name}
                                type="hidden"
                                value={minAway}
                            />
                        ) : null}
                    </>
                )}
            </section>
            <div className="redhn-profile-account__footer">
                <button
                    className="redhn-button redhn-button--primary"
                    type="submit"
                >
                    {form.submitLabel || 'Update'}
                </button>
            </div>
        </form>
    );
}

function ProfileAccountInput({
    field,
    helper,
    label,
    max,
    min,
    onChange,
    type = 'text',
    value,
}: {
    field: ParsedProfileTextField;
    helper: string;
    label: string;
    max?: string;
    min?: string;
    onChange: (value: string) => void;
    type?: string;
    value: string;
}) {
    return (
        <label className="redhn-profile-account__field">
            <span>{label}</span>
            <input
                max={max}
                min={min}
                name={field.name}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
                type={type}
                value={value}
            />
            <small>{helper}</small>
        </label>
    );
}

function ProfileAccountTextArea({
    field,
    helper,
    label,
    onChange,
    value,
}: {
    field: ParsedProfileTextField;
    helper: string;
    label: string;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <label className="redhn-profile-account__field redhn-profile-account__field--wide">
            <span>{label}</span>
            <textarea
                name={field.name}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
                rows={7}
                value={value}
            />
            <small>{helper}</small>
        </label>
    );
}

function ProfileAccountSelect({
    field,
    helper,
    label,
    onChange,
    value,
}: {
    field: ParsedProfileSelectField;
    helper: string;
    label: string;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <label className="redhn-profile-account__field">
            <span>{label}</span>
            <select
                name={field.name}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
                value={value}
            >
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <small>{helper}</small>
        </label>
    );
}

function ProfileSummaryCard({
    profile,
    apiUser,
}: {
    profile: ParsedProfile;
    apiUser: HnApiUser | null | undefined;
}) {
    return (
        <aside className="redhn-profile-card" aria-label="Profile details">
            <div className="redhn-profile-card__header">
                <UserAvatar userId={profile.id} />
                <div>
                    <strong>{profile.id}</strong>
                    <span>u/{profile.id}</span>
                </div>
            </div>
            <dl className="redhn-profile-stats">
                <div>
                    <dt>Karma</dt>
                    <dd>{formatNumber(profile.karma)}</dd>
                </div>
                <div>
                    <dt>Contributions</dt>
                    <dd>{formatNumber(apiUser?.submitted?.length)}</dd>
                </div>
                <div>
                    <dt>Joined</dt>
                    <dd>{formatProfileDate(profile)}</dd>
                </div>
            </dl>
            {profile.aboutHtml ? (
                <div
                    className="redhn-profile-card__about"
                    dangerouslySetInnerHTML={{
                        __html: sanitizeHnHtml(profile.aboutHtml),
                    }}
                />
            ) : null}
        </aside>
    );
}

function ProfileOverviewFeed({
    profile,
    items,
    loading,
}: {
    profile: ParsedProfile;
    items: HnApiItem[];
    loading: boolean;
}) {
    if (loading) {
        return <ProfileEmptyState title="Loading activity" />;
    }

    if (items.length === 0) {
        return <ProfileEmptyState title="No recent activity" />;
    }

    return (
        <div className="redhn-profile-feed">
            {items.map((item) => (
                <ProfileActivityCard
                    item={item}
                    key={item.id}
                    profile={profile}
                />
            ))}
        </div>
    );
}

function ProfileActivityCard({
    item,
    profile,
}: {
    item: HnApiItem;
    profile: ParsedProfile;
}) {
    const isComment = item.type === 'comment';
    const title = isComment ? 'Comment' : (item.title ?? 'Untitled');
    const itemUrl = hnItemUrl(item.id);
    const itemType = item.type ?? 'item';

    return (
        <article className="redhn-profile-activity">
            <header className="redhn-story__credit">
                <span className="redhn-story__avatar" aria-hidden="true">
                    {userInitials(item.by ?? profile.id)}
                </span>
                <a
                    className="redhn-story__author"
                    href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                        item.by ?? profile.id,
                    )}`}
                >
                    u/{item.by ?? profile.id}
                </a>
                <span className="redhn-story__credit-dot" aria-hidden="true">
                    •
                </span>
                <span>{itemType}</span>
                {item.time ? (
                    <>
                        <span
                            className="redhn-story__credit-dot"
                            aria-hidden="true"
                        >
                            •
                        </span>
                        <span>{formatUnixDate(item.time)}</span>
                    </>
                ) : null}
            </header>
            <h2 className="redhn-profile-activity__title">
                <a href={itemUrl}>{title}</a>
            </h2>
            {isComment && item.text ? (
                <div
                    className="redhn-profile-activity__text"
                    dangerouslySetInnerHTML={{
                        __html: sanitizeHnHtml(item.text),
                    }}
                />
            ) : null}
            {!isComment && item.url ? (
                <a
                    className="redhn-story__source-link"
                    href={item.url}
                    title={item.url}
                >
                    {item.url}
                </a>
            ) : null}
            <div className="redhn-story__actions redhn-story__actions--card">
                {item.score !== undefined ? (
                    <span className="redhn-action redhn-action--vote redhn-action--disabled">
                        <ArrowFatUpIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight="bold"
                        />
                        <span>{formatNumber(item.score)}</span>
                    </span>
                ) : null}
                <a className="redhn-action" href={itemUrl}>
                    <ChatCircleIcon
                        aria-hidden="true"
                        className="redhn-action__icon"
                        weight="bold"
                    />
                    <span>
                        {isComment ? 'Thread' : formatNumber(item.descendants)}
                    </span>
                </a>
            </div>
        </article>
    );
}

function ProfileCommentsList({
    comments,
    onHnAction,
}: {
    comments: ParsedComment[];
    onHnAction: (href: string) => void;
}) {
    const [collapsedCommentIds, setCollapsedCommentIds] = useState(
        () => new Set<number>(),
    );
    const [expandedDeepThreadDepths, setExpandedDeepThreadDepths] = useState<
        Record<number, number>
    >({});

    const toggleComment = (commentId: number) => {
        setCollapsedCommentIds((current) => {
            const next = new Set(current);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    const revealMoreReplies = (commentId: number, depthLimit: number) => {
        setExpandedDeepThreadDepths((current) => ({
            ...current,
            [commentId]: depthLimit,
        }));
    };

    if (comments.length === 0) {
        return <ProfileEmptyState title="No comments yet" />;
    }

    return (
        <section className="redhn-comments redhn-profile-comments">
            {comments.map((comment) => (
                <CommentThread
                    collapsedCommentIds={collapsedCommentIds}
                    comment={comment}
                    expandedDeepThreadDepths={expandedDeepThreadDepths}
                    key={comment.id}
                    onHnAction={onHnAction}
                    onRevealMore={revealMoreReplies}
                    onToggle={toggleComment}
                />
            ))}
        </section>
    );
}

function ProfileEmptyState({ title }: { title: string }) {
    return (
        <div className="redhn-profile-empty">
            <p>{title}</p>
        </div>
    );
}
