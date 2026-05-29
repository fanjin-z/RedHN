import { useEffect, useMemo, useState } from 'react';
import { sendRedhnMessage } from './api/backgroundClient';
import type { HnApiItem, HnApiUser } from './api/hnApi';
import { AppShell, AuthShell, ClassicBar } from './components/AppShell';
import { StoryFeed } from './components/StoryFeed';
import { performHnAction } from './hn/actions';
import type { ParsedPage, ParsedStory } from './hn/types';
import {
    applyOptimisticStoryVote,
    createOptimisticStoryVote,
    getStoryVoteHref,
    type OptimisticStoryVote,
} from './hn/votes';
import { AuthPage } from './pages/AuthPage';
import { PostPage } from './pages/PostPage';
import { ProfilePage } from './pages/ProfilePage';
import {
    applyStoryFilters,
    defaultFilters,
    normalizeFilters,
    type RedhnFilters,
} from './state/filters';
import {
    defaultPreferences,
    normalizePreferences,
    type RedhnPreferences,
} from './state/preferences';
import {
    countNewComments,
    defaultReadState,
    markPageRead,
    markStoryViewed,
    type RedhnReadState,
} from './state/readState';
import {
    filtersItem,
    preferencesItem,
    readStateItem,
    savedStoryIdsItem,
} from './state/storage';
import {
    enrichProfileWithApiUser,
    enrichStoryWithApiItem,
    isVisibleApiItem,
} from './view/enrichment';

type RedhnAppProps = {
    page: ParsedPage;
    onClassicToggle: (enabled: boolean) => void;
};

type StoryVoteOverride = OptimisticStoryVote & {
    pending: boolean;
};

export default function RedhnApp({ page, onClassicToggle }: RedhnAppProps) {
    const [enabled, setEnabled] = useState(true);
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [preferences, setPreferences] =
        useState<RedhnPreferences>(defaultPreferences);
    const [filters, setFilters] = useState<RedhnFilters>(defaultFilters);
    const [readState, setReadState] =
        useState<RedhnReadState>(defaultReadState);
    const [stateLoaded, setStateLoaded] = useState(false);
    const [savedStoryIds, setSavedStoryIds] = useState(() => new Set<number>());
    const [sharedStoryId, setSharedStoryId] = useState<number>();
    const [newCommentCount, setNewCommentCount] = useState(0);
    const [storyVoteOverrides, setStoryVoteOverrides] = useState<
        Record<number, StoryVoteOverride>
    >({});
    const [apiItems, setApiItems] = useState<Record<number, HnApiItem | null>>(
        {},
    );
    const [apiUser, setApiUser] = useState<HnApiUser | null>();
    const title = useMemo(
        () =>
            page.post?.title ??
            (page.profile ? `${page.profile.id} | Hacker News` : 'Hacker News'),
        [page.post?.title, page.profile],
    );
    const visibleStories = useMemo(
        () => applyStoryFilters(page.stories, filters),
        [filters, page.stories],
    );
    const enrichedStories = useMemo(
        () =>
            visibleStories.map((story) => {
                const enrichedStory = enrichStoryWithApiItem(
                    story,
                    apiItems[story.id],
                );
                const voteOverride = storyVoteOverrides[story.id];
                return voteOverride
                    ? applyOptimisticStoryVote(enrichedStory, voteOverride)
                    : enrichedStory;
            }),
        [apiItems, storyVoteOverrides, visibleStories],
    );
    const enrichedPost = page.post
        ? enrichStoryWithApiItem(page.post, apiItems[page.post.id])
        : undefined;
    const enrichedProfile = page.profile
        ? enrichProfileWithApiUser(page.profile, apiUser)
        : undefined;
    const profileOverviewItemIds = useMemo(
        () =>
            page.profile && apiUser?.submitted
                ? apiUser.submitted.slice(0, 30)
                : [],
        [apiUser?.submitted, page.profile],
    );
    const profileOverviewItems = useMemo(
        () =>
            profileOverviewItemIds
                .map((id) => apiItems[id])
                .filter(isVisibleApiItem),
        [apiItems, profileOverviewItemIds],
    );
    const profileOverviewLoading =
        apiUser === undefined ||
        profileOverviewItemIds.some((id) => !(id in apiItems));
    const hiddenStoryCount = page.stories.length - visibleStories.length;
    const pendingVoteStoryIds = useMemo(
        () =>
            new Set(
                Object.entries(storyVoteOverrides)
                    .filter(([, vote]) => vote.pending)
                    .map(([storyId]) => Number(storyId)),
            ),
        [storyVoteOverrides],
    );

    const updatePreferences = (patch: Partial<RedhnPreferences>) => {
        setPreferences((current) => {
            const next = normalizePreferences({ ...current, ...patch });
            void preferencesItem.setValue(next);
            return next;
        });
    };

    const updateFilters = (patch: Partial<RedhnFilters>) => {
        setFilters((current) => {
            const next = normalizeFilters({ ...current, ...patch });
            void filtersItem.setValue(next);
            return next;
        });
    };

    const toggleSavedStory = (storyId: number) => {
        setSavedStoryIds((current) => {
            const next = new Set(current);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            void savedStoryIdsItem.setValue(Array.from(next));
            return next;
        });
    };

    const markViewed = (storyId: number) => {
        setReadState((current) => {
            const next = markStoryViewed(current, storyId, Date.now());
            void readStateItem.setValue(next);
            return next;
        });
    };

    const shareStory = (story: ParsedStory) => {
        void navigator.clipboard?.writeText(story.hnUrl).then(() => {
            setSharedStoryId(story.id);
        });
    };

    const runHnAction = (href: string) => {
        void performHnAction(href).then((result) => {
            if (result.kind === 'navigate' || result.kind === 'failed') {
                window.location.assign(result.url);
            }
        });
    };

    const runStoryVote = (story: ParsedStory) => {
        const vote = createOptimisticStoryVote(story);
        const href = vote?.href ?? getStoryVoteHref(story);

        if (!href) {
            return;
        }

        if (!vote) {
            runHnAction(href);
            return;
        }

        setStoryVoteOverrides((current) => ({
            ...current,
            [story.id]: {
                ...vote,
                pending: true,
            },
        }));

        void performHnAction(href).then((result) => {
            if (result.kind === 'performed') {
                setStoryVoteOverrides((current) => {
                    const currentVote = current[story.id];
                    if (!currentVote || currentVote.href !== href) {
                        return current;
                    }

                    return {
                        ...current,
                        [story.id]: {
                            ...currentVote,
                            pending: false,
                        },
                    };
                });
                return;
            }

            setStoryVoteOverrides((current) => {
                if (current[story.id]?.href !== href) {
                    return current;
                }

                const next = { ...current };
                delete next[story.id];
                return next;
            });
            window.location.assign(result.url);
        });
    };

    useEffect(() => {
        onClassicToggle(enabled);
    }, [enabled, onClassicToggle]);

    useEffect(() => {
        let active = true;

        void Promise.all([
            preferencesItem.getValue(),
            filtersItem.getValue(),
            readStateItem.getValue(),
            savedStoryIdsItem.getValue(),
        ]).then(
            ([storedPreferences, storedFilters, storedReadState, savedIds]) => {
                if (!active) {
                    return;
                }

                setPreferences(normalizePreferences(storedPreferences));
                setFilters(normalizeFilters(storedFilters));
                setReadState(storedReadState);
                setSavedStoryIds(new Set(savedIds));
                setStateLoaded(true);
            },
        );

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!stateLoaded || !page.post) {
            return;
        }

        setNewCommentCount(countNewComments(readState, page));
        const next = markPageRead(readState, page, Date.now());
        setReadState(next);
        void readStateItem.setValue(next);
    }, [page, stateLoaded]);

    useEffect(() => {
        const ids = page.post
            ? [page.post.id]
            : visibleStories.slice(0, 30).map((story) => story.id);

        if (ids.length === 0) {
            return;
        }

        let active = true;
        void sendRedhnMessage({ type: 'redhn:getItems', ids }).then(
            (response) => {
                if (!active || !response.ok) {
                    return;
                }

                setApiItems((current) => ({
                    ...current,
                    ...response.data,
                }));
            },
        );

        return () => {
            active = false;
        };
    }, [page.post, visibleStories]);

    useEffect(() => {
        if (!page.profile) {
            setApiUser(undefined);
            return;
        }

        let active = true;
        setApiUser(undefined);
        void sendRedhnMessage({
            type: 'redhn:getUser',
            id: page.profile.id,
        }).then((response) => {
            if (!active) {
                return;
            }

            setApiUser(response.ok ? response.data : null);
        });

        return () => {
            active = false;
        };
    }, [page.profile]);

    useEffect(() => {
        if (profileOverviewItemIds.length === 0) {
            return;
        }

        let active = true;
        void sendRedhnMessage({
            type: 'redhn:getItems',
            ids: profileOverviewItemIds,
        }).then((response) => {
            if (!active) {
                return;
            }

            if (!response.ok) {
                setApiItems((current) => ({
                    ...current,
                    ...Object.fromEntries(
                        profileOverviewItemIds.map((id) => [id, null]),
                    ),
                }));
                return;
            }

            setApiItems((current) => ({
                ...current,
                ...response.data,
            }));
        });

        return () => {
            active = false;
        };
    }, [profileOverviewItemIds]);

    if (!enabled) {
        return <ClassicBar onEnabledChange={setEnabled} />;
    }

    if (page.kind === 'auth' && page.auth) {
        return (
            <AuthShell preferences={preferences}>
                <AuthPage auth={page.auth} />
            </AuthShell>
        );
    }

    return (
        <AppShell
            accountMenuOpen={accountMenuOpen}
            currentUser={page.currentUser}
            enabled={enabled}
            filters={filters}
            onEnabledChange={setEnabled}
            onFiltersChange={updateFilters}
            onMenuOpenChange={setAccountMenuOpen}
            onPreferencesChange={updatePreferences}
            onPreferencesToggle={() => {
                setPreferencesOpen((current) => !current);
                setAccountMenuOpen(false);
            }}
            preferences={preferences}
            preferencesOpen={preferencesOpen}
            sourceUrl={page.sourceUrl}
            title={title}
        >
            {page.kind === 'profile' && enrichedProfile ? (
                <ProfilePage
                    apiUser={apiUser}
                    comments={page.comments}
                    hiddenStoryCount={hiddenStoryCount}
                    onHnAction={runHnAction}
                    onSave={toggleSavedStory}
                    onShare={shareStory}
                    onStoryView={markViewed}
                    onVote={runStoryVote}
                    overviewItems={profileOverviewItems}
                    overviewLoading={profileOverviewLoading}
                    pendingVoteStoryIds={pendingVoteStoryIds}
                    page={page}
                    profile={enrichedProfile}
                    readState={readState}
                    savedStoryIds={savedStoryIds}
                    sharedStoryId={sharedStoryId}
                    stories={enrichedStories}
                />
            ) : (
                <SortTabs />
            )}
            {page.kind === 'profile' && enrichedProfile ? null : page.kind ===
                  'item' && enrichedPost ? (
                <PostPage
                    comments={page.comments}
                    isSaved={savedStoryIds.has(enrichedPost.id)}
                    isShared={sharedStoryId === enrichedPost.id}
                    newCommentCount={newCommentCount}
                    onHnAction={runHnAction}
                    onSave={toggleSavedStory}
                    onShare={shareStory}
                    post={enrichedPost}
                />
            ) : (
                <StoryFeed
                    hiddenStoryCount={hiddenStoryCount}
                    onHnAction={runHnAction}
                    onSave={toggleSavedStory}
                    onShare={shareStory}
                    onStoryView={markViewed}
                    onVote={runStoryVote}
                    page={page}
                    pendingVoteStoryIds={pendingVoteStoryIds}
                    readState={readState}
                    savedStoryIds={savedStoryIds}
                    sharedStoryId={sharedStoryId}
                    stories={enrichedStories}
                />
            )}
        </AppShell>
    );
}

function SortTabs() {
    return (
        <div className="redhn-tabs" role="navigation" aria-label="Sort">
            <a
                className="redhn-tabs__item redhn-tabs__item--active"
                href="https://news.ycombinator.com/news"
            >
                Best
            </a>
            <a
                className="redhn-tabs__item"
                href="https://news.ycombinator.com/newest"
            >
                New
            </a>
            <a
                className="redhn-tabs__item"
                href="https://news.ycombinator.com/best"
            >
                Top
            </a>
        </div>
    );
}
