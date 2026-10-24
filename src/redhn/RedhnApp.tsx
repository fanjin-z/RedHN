import { useEffect, useMemo, useRef, useState } from 'react';
import { sendRedhnMessage } from './api/backgroundClient';
import type { HnApiItem, HnApiUser } from './api/hnApi';
import { AppShell, AuthShell } from './components/AppShell';
import { StoryFeed } from './components/StoryFeed';
import { useStoryFeed } from './components/useStoryFeed';
import { performHnAction } from './hn/actions';
import {
    applyOptimisticStoryFavorite,
    createOptimisticStoryFavorite,
    getStoryFavoriteHref,
    type OptimisticStoryFavorite,
} from './hn/favorites';
import type { ParsedComment, ParsedPage, ParsedStory } from './hn/types';
import {
    applyOptimisticCommentVote,
    applyOptimisticStoryVote,
    createOptimisticCommentVote,
    createOptimisticStoryVote,
    getCommentVoteHref,
    getStoryVoteHref,
    type OptimisticCommentVote,
    type OptimisticStoryVote,
} from './hn/votes';
import { AuthPage } from './pages/AuthPage';
import { PostPage } from './pages/PostPage';
import { ProfilePage } from './pages/ProfilePage';
import { SubmitPage } from './pages/SubmitPage';
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
    defaultReadState,
    markPageRead,
    markStoryViewed,
    type RedhnReadState,
} from './state/readState';
import {
    currentUserItem,
    filtersItem,
    preferencesItem,
    readStateItem,
} from './state/storage';
import {
    resolveCurrentUserForPage,
    shouldClearCachedCurrentUser,
    toCachedCurrentUser,
    type CachedCurrentUser,
} from './state/currentUser';
import {
    enrichProfileWithApiUser,
    enrichStoryWithApiItem,
    isVisibleApiItem,
} from './view/enrichment';

type RedhnAppProps = {
    page: ParsedPage;
};

type StoryVoteOverride = OptimisticStoryVote & {
    pending: boolean;
};

type CommentVoteOverride = OptimisticCommentVote & {
    pending: boolean;
};

type StoryFavoriteOverride = OptimisticStoryFavorite & {
    pending: boolean;
};

export default function RedhnApp({ page }: RedhnAppProps) {
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [preferences, setPreferences] =
        useState<RedhnPreferences>(defaultPreferences);
    const [filters, setFilters] = useState<RedhnFilters>(defaultFilters);
    const [readState, setReadState] =
        useState<RedhnReadState>(defaultReadState);
    const [stateLoaded, setStateLoaded] = useState(false);
    const [sharedStoryId, setSharedStoryId] = useState<number>();
    const [storyVoteOverrides, setStoryVoteOverrides] = useState<
        Record<number, StoryVoteOverride>
    >({});
    const [commentVoteOverrides, setCommentVoteOverrides] = useState<
        Record<number, CommentVoteOverride>
    >({});
    const [storyFavoriteOverrides, setStoryFavoriteOverrides] = useState<
        Record<number, StoryFavoriteOverride>
    >({});
    const [apiItems, setApiItems] = useState<Record<number, HnApiItem | null>>(
        {},
    );
    const [apiUser, setApiUser] = useState<HnApiUser | null>();
    const [cachedCurrentUser, setCachedCurrentUser] =
        useState<CachedCurrentUser | null>();
    const feed = useStoryFeed(page, stateLoaded);
    const apiRequestPending = useRef(false);
    const apiActive = useRef(true);
    const title = useMemo(
        () =>
            page.post?.title ??
            (page.profile
                ? `${page.profile.id} | Hacker News`
                : page.submit
                  ? 'Create post | Hacker News'
                  : 'Hacker News'),
        [page.post?.title, page.profile, page.submit],
    );
    const visibleStories = useMemo(
        () => applyStoryFilters(feed.data.stories, filters),
        [filters, feed.data.stories],
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
        ? (() => {
              const enrichedStory = enrichStoryWithApiItem(
                  page.post,
                  apiItems[page.post.id],
              );
              const voteOverride = storyVoteOverrides[page.post.id];
              const favoriteOverride = storyFavoriteOverrides[page.post.id];
              const votedStory = voteOverride
                  ? applyOptimisticStoryVote(enrichedStory, voteOverride)
                  : enrichedStory;
              return favoriteOverride
                  ? applyOptimisticStoryFavorite(votedStory, favoriteOverride)
                  : votedStory;
          })()
        : undefined;
    const enrichedComments = useMemo(
        () => applyCommentVoteOverrides(page.comments, commentVoteOverrides),
        [commentVoteOverrides, page.comments],
    );
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
    const hiddenStoryCount = feed.data.stories.length - visibleStories.length;
    const pendingVoteStoryIds = useMemo(
        () =>
            new Set(
                Object.entries(storyVoteOverrides)
                    .filter(([, vote]) => vote.pending)
                    .map(([storyId]) => Number(storyId)),
            ),
        [storyVoteOverrides],
    );
    const pendingVoteCommentIds = useMemo(
        () =>
            new Set(
                Object.entries(commentVoteOverrides)
                    .filter(([, vote]) => vote.pending)
                    .map(([commentId]) => Number(commentId)),
            ),
        [commentVoteOverrides],
    );
    const pendingFavoriteStoryIds = useMemo(
        () =>
            new Set(
                Object.entries(storyFavoriteOverrides)
                    .filter(([, favorite]) => favorite.pending)
                    .map(([storyId]) => Number(storyId)),
            ),
        [storyFavoriteOverrides],
    );
    const currentUser = useMemo(
        () => resolveCurrentUserForPage(page, cachedCurrentUser),
        [cachedCurrentUser, page],
    );

    const updatePreferences = (patch: Partial<RedhnPreferences>) => {
        setPreferences((current) => {
            const next = normalizePreferences({ ...current, ...patch });
            void preferencesItem.setValue(next);
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

    const performAction = (href: string) =>
        performHnAction(href, { isLoggedIn: Boolean(page.currentUser) });

    const runHnAction = (href: string) => {
        void performAction(href).then((result) => {
            if (result.kind === 'navigate' || result.kind === 'failed') {
                window.location.assign(result.url);
            }
        });
    };

    const runStoryVote = (story: ParsedStory) => {
        const vote = page.currentUser
            ? createOptimisticStoryVote(story)
            : undefined;
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

        void performAction(href).then((result) => {
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

    const runCommentVote = (comment: ParsedComment) => {
        const vote = page.currentUser
            ? createOptimisticCommentVote(comment)
            : undefined;
        const href = vote?.href ?? getCommentVoteHref(comment);

        if (!href) {
            return;
        }

        if (!vote) {
            runHnAction(href);
            return;
        }

        setCommentVoteOverrides((current) => ({
            ...current,
            [comment.id]: {
                ...vote,
                pending: true,
            },
        }));

        void performAction(href).then((result) => {
            if (result.kind === 'performed') {
                setCommentVoteOverrides((current) => {
                    const currentVote = current[comment.id];
                    if (!currentVote || currentVote.href !== href) {
                        return current;
                    }

                    return {
                        ...current,
                        [comment.id]: {
                            ...currentVote,
                            pending: false,
                        },
                    };
                });
                return;
            }

            setCommentVoteOverrides((current) => {
                if (current[comment.id]?.href !== href) {
                    return current;
                }

                const next = { ...current };
                delete next[comment.id];
                return next;
            });
            window.location.assign(result.url);
        });
    };

    const runStoryFavorite = (story: ParsedStory) => {
        const favorite = page.currentUser
            ? createOptimisticStoryFavorite(story)
            : undefined;
        const href = favorite?.href ?? getStoryFavoriteHref(story);

        if (!href) {
            return;
        }

        if (!favorite) {
            runHnAction(href);
            return;
        }

        setStoryFavoriteOverrides((current) => ({
            ...current,
            [story.id]: {
                ...favorite,
                pending: true,
            },
        }));

        void performAction(href).then((result) => {
            if (result.kind === 'performed') {
                setStoryFavoriteOverrides((current) => {
                    const currentFavorite = current[story.id];
                    if (!currentFavorite || currentFavorite.href !== href) {
                        return current;
                    }

                    return {
                        ...current,
                        [story.id]: {
                            ...currentFavorite,
                            pending: false,
                        },
                    };
                });
                return;
            }

            setStoryFavoriteOverrides((current) => {
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
        let active = true;

        void Promise.all([
            preferencesItem.getValue(),
            filtersItem.getValue(),
            readStateItem.getValue(),
        ]).then(([storedPreferences, storedFilters, storedReadState]) => {
            if (!active) {
                return;
            }

            setPreferences(normalizePreferences(storedPreferences));
            setFilters(normalizeFilters(storedFilters));
            setReadState(storedReadState);
            setStateLoaded(true);
        });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (page.currentUser) {
            const next = toCachedCurrentUser(page.currentUser);
            setCachedCurrentUser(next);
            void currentUserItem.setValue(next);
            return;
        }

        if (shouldClearCachedCurrentUser(page)) {
            setCachedCurrentUser(null);
            void currentUserItem.setValue(null);
        }

        if (page.kind === 'submit') {
            let active = true;

            void currentUserItem.getValue().then((storedCurrentUser) => {
                if (active) {
                    setCachedCurrentUser(storedCurrentUser);
                }
            });

            return () => {
                active = false;
            };
        }
    }, [page]);

    useEffect(() => {
        if (!stateLoaded || !page.post) {
            return;
        }

        const next = markPageRead(readState, page, Date.now());
        setReadState(next);
        void readStateItem.setValue(next);
    }, [page, stateLoaded]);

    useEffect(() => {
        // Preserve confirmed votes and API enrichment when returning to the feed.
        feed.rememberStories(
            feed.data.stories.map((story) => {
                const enriched = enrichStoryWithApiItem(
                    story,
                    apiItems[story.id],
                );
                const vote = storyVoteOverrides[story.id];
                return vote && !vote.pending
                    ? applyOptimisticStoryVote(enriched, vote)
                    : enriched;
            }),
        );
    }, [apiItems, feed.data.stories, feed.rememberStories, storyVoteOverrides]);

    useEffect(() => {
        apiActive.current = true;
        return () => {
            apiActive.current = false;
        };
    }, []);

    useEffect(() => {
        if (apiRequestPending.current) return;
        const candidates = page.post
            ? [page.post.id]
            : visibleStories.map((story) => story.id);
        const ids = candidates.filter((id) => !(id in apiItems)).slice(0, 30);

        if (ids.length === 0) {
            return;
        }

        apiRequestPending.current = true;
        void sendRedhnMessage({ type: 'redhn:getItems', ids })
            .then((response) => {
                apiRequestPending.current = false;
                if (!apiActive.current || !response.ok) {
                    return;
                }

                setApiItems((current) => ({
                    ...current,
                    ...response.data,
                }));
            })
            .catch(() => {
                apiRequestPending.current = false;
            });
    }, [apiItems, page.post, visibleStories]);

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
            currentUser={currentUser}
            onMenuOpenChange={setAccountMenuOpen}
            onPreferencesChange={updatePreferences}
            preferences={preferences}
            sourceUrl={page.sourceUrl}
            title={title}
        >
            {page.kind === 'profile' && enrichedProfile ? (
                <ProfilePage
                    apiUser={apiUser}
                    comments={enrichedComments}
                    hiddenStoryCount={hiddenStoryCount}
                    onCommentVote={runCommentVote}
                    onHnAction={runHnAction}
                    onShare={shareStory}
                    onStoryView={markViewed}
                    onVote={runStoryVote}
                    overviewItems={profileOverviewItems}
                    overviewLoading={profileOverviewLoading}
                    pendingVoteCommentIds={pendingVoteCommentIds}
                    pendingVoteStoryIds={pendingVoteStoryIds}
                    page={page}
                    profile={enrichedProfile}
                    readState={readState}
                    sharedStoryId={sharedStoryId}
                    stories={enrichedStories}
                />
            ) : null}
            {page.kind === 'profile' && enrichedProfile ? null : page.kind ===
                  'submit' && page.submit ? (
                <SubmitPage submit={page.submit} />
            ) : page.kind === 'item' && enrichedPost ? (
                <PostPage
                    comments={enrichedComments}
                    isFavoritePending={pendingFavoriteStoryIds.has(
                        enrichedPost.id,
                    )}
                    isShared={sharedStoryId === enrichedPost.id}
                    isVotePending={pendingVoteStoryIds.has(enrichedPost.id)}
                    onCommentVote={runCommentVote}
                    onFavorite={runStoryFavorite}
                    onHnAction={runHnAction}
                    onShare={shareStory}
                    onVote={runStoryVote}
                    pendingVoteCommentIds={pendingVoteCommentIds}
                    post={enrichedPost}
                />
            ) : (
                <StoryFeed
                    feedRef={feed.feedRef}
                    hiddenStoryCount={hiddenStoryCount}
                    loadError={feed.error}
                    loading={feed.loading}
                    more={feed.data.more}
                    onLoadMore={feed.loadMore}
                    onHnAction={runHnAction}
                    onShare={shareStory}
                    onStoryView={markViewed}
                    onVote={runStoryVote}
                    page={page}
                    pendingVoteStoryIds={pendingVoteStoryIds}
                    readState={readState}
                    ready={stateLoaded && !feed.restoring}
                    sharedStoryId={sharedStoryId}
                    stories={enrichedStories}
                />
            )}
        </AppShell>
    );
}

function applyCommentVoteOverrides(
    comments: ParsedComment[],
    overrides: Record<number, CommentVoteOverride>,
): ParsedComment[] {
    return comments.map((comment) => {
        const override = overrides[comment.id];
        const votedComment = override
            ? applyOptimisticCommentVote(comment, override)
            : comment;

        return {
            ...votedComment,
            children: applyCommentVoteOverrides(comment.children, overrides),
        };
    });
}
