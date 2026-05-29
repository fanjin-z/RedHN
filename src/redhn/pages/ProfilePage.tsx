import { useState } from 'react';
import { ArrowFatUpIcon } from '@phosphor-icons/react/dist/csr/ArrowFatUp';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import type { HnApiItem, HnApiUser } from '../api/hnApi';
import { CommentThread } from '../components/CommentThread';
import { StoryFeed } from '../components/StoryFeed';
import { UserAvatar, userInitials } from '../components/UserAvatar';
import type {
    ParsedComment,
    ParsedPage,
    ParsedProfile,
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
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
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
    onSave,
    onShare,
    onStoryView,
    onHnAction,
}: ProfilePageProps) {
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
                    {profileTabs.map((item) => (
                        <a
                            className={
                                profile.tab === item.tab
                                    ? 'redhn-profile-tabs__item redhn-profile-tabs__item--active'
                                    : 'redhn-profile-tabs__item'
                            }
                            href={profile.links[item.link]}
                            key={item.tab}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
                {profile.tab === 'overview' ? (
                    <ProfileOverviewFeed
                        items={overviewItems}
                        loading={overviewLoading}
                        profile={profile}
                    />
                ) : null}
                {profile.tab === 'posts' ? (
                    stories.length > 0 || page.pagination.more ? (
                        <StoryFeed
                            hiddenStoryCount={hiddenStoryCount}
                            onHnAction={onHnAction}
                            onSave={onSave}
                            onShare={onShare}
                            onStoryView={onStoryView}
                            page={page}
                            readState={readState}
                            savedStoryIds={savedStoryIds}
                            sharedStoryId={sharedStoryId}
                            stories={stories}
                        />
                    ) : (
                        <ProfileEmptyState title="No posts yet" />
                    )
                ) : null}
                {profile.tab === 'comments' ? (
                    <ProfileCommentsList
                        comments={comments}
                        onHnAction={onHnAction}
                    />
                ) : null}
                {profile.tab === 'favorites' ? (
                    stories.length > 0 || page.pagination.more ? (
                        <StoryFeed
                            hiddenStoryCount={hiddenStoryCount}
                            onHnAction={onHnAction}
                            onSave={onSave}
                            onShare={onShare}
                            onStoryView={onStoryView}
                            page={page}
                            readState={readState}
                            savedStoryIds={savedStoryIds}
                            sharedStoryId={sharedStoryId}
                            stories={stories}
                        />
                    ) : (
                        <ProfileEmptyState title="No visible favorites" />
                    )
                ) : null}
            </div>
            <ProfileSummaryCard apiUser={apiUser} profile={profile} />
        </section>
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

    if (comments.length === 0) {
        return <ProfileEmptyState title="No comments yet" />;
    }

    return (
        <section className="redhn-comments redhn-profile-comments">
            {comments.map((comment) => (
                <CommentThread
                    collapsedCommentIds={collapsedCommentIds}
                    comment={comment}
                    key={comment.id}
                    onHnAction={onHnAction}
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
