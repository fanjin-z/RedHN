import {
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { ArrowFatUpIcon } from '@phosphor-icons/react/dist/csr/ArrowFatUp';
import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { BookmarkSimpleIcon } from '@phosphor-icons/react/dist/csr/BookmarkSimple';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { MonitorIcon } from '@phosphor-icons/react/dist/csr/Monitor';
import { PlusSquareIcon } from '@phosphor-icons/react/dist/csr/PlusSquare';
import { PowerIcon } from '@phosphor-icons/react/dist/csr/Power';
import { ShareFatIcon } from '@phosphor-icons/react/dist/csr/ShareFat';
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut';
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { sendRedhnMessage } from './api/backgroundClient';
import type { HnApiItem, HnApiUser } from './api/hnApi';
import { performHnAction } from './hn/actions';
import type {
    ParsedAuthForm,
    ParsedAuthMode,
    ParsedAuthPage,
    ParsedComment,
    ParsedCurrentUser,
    ParsedPage,
    ParsedProfile,
    ParsedStory,
} from './hn/types';
import {
    applyStoryFilters,
    defaultFilters,
    normalizeFilters,
    termsFromInput,
    termsToInput,
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

type RedhnAppProps = {
    page: ParsedPage;
    onClassicToggle: (enabled: boolean) => void;
};

const navItems = [
    { label: 'Home', href: 'https://news.ycombinator.com/news' },
    { label: 'Popular', href: 'https://news.ycombinator.com/best' },
    { label: 'Top', href: 'https://news.ycombinator.com/front' },
    { label: 'New', href: 'https://news.ycombinator.com/newest' },
    { label: 'Ask HN', href: 'https://news.ycombinator.com/ask' },
    { label: 'Show HN', href: 'https://news.ycombinator.com/show' },
    { label: 'Jobs', href: 'https://news.ycombinator.com/jobs' },
    { label: 'Saved', href: 'https://news.ycombinator.com/favorites' },
];

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
            visibleStories.map((story) =>
                enrichStoryWithApiItem(story, apiItems[story.id]),
            ),
        [apiItems, visibleStories],
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
    const shellStyle = {
        '--redhn-user-font-size': `${preferences.fontSize}px`,
        '--redhn-user-line-height': preferences.lineHeight,
        '--redhn-content-width': `${preferences.maxWidth}px`,
    } as CSSProperties;

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

    const runHnAction = (href: string) => {
        void performHnAction(href).then((result) => {
            if (result.kind === 'navigate' || result.kind === 'failed') {
                window.location.assign(result.url);
            }
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
        return (
            <div className="redhn-classic-bar">
                <strong>RedHN</strong>
                <button
                    className="redhn-button redhn-button--primary"
                    type="button"
                    onClick={() => {
                        setEnabled(true);
                    }}
                >
                    Enable
                </button>
            </div>
        );
    }

    if (page.kind === 'auth' && page.auth) {
        return (
            <div
                className={`redhn-shell redhn-shell--${preferences.theme}`}
                style={shellStyle}
            >
                <AuthPage auth={page.auth} />
            </div>
        );
    }

    return (
        <div
            className={`redhn-shell redhn-shell--${preferences.theme}`}
            style={shellStyle}
        >
            <header className="redhn-topbar">
                <a
                    aria-label="Hacker News home"
                    className="redhn-brand"
                    href="https://news.ycombinator.com/news"
                >
                    Hacker News
                </a>
                <form
                    className="redhn-search"
                    action="https://hn.algolia.com/"
                    method="get"
                >
                    <label className="redhn-sr-only" htmlFor="redhn-search">
                        Search Hacker News
                    </label>
                    <span aria-hidden="true" className="redhn-search__hn-mark">
                        Y
                    </span>
                    <input
                        id="redhn-search"
                        name="q"
                        placeholder="Find anything"
                        type="search"
                    />
                </form>
                <div className="redhn-topbar__actions">
                    <TopbarActions
                        currentUser={page.currentUser}
                        enabled={enabled}
                        loginUrl={hnLoginUrl(page.sourceUrl, 'login')}
                        menuOpen={accountMenuOpen}
                        onEnabledChange={setEnabled}
                        onMenuOpenChange={setAccountMenuOpen}
                        onPreferencesToggle={() => {
                            setPreferencesOpen((current) => !current);
                            setAccountMenuOpen(false);
                        }}
                        onThemeChange={(theme) => {
                            updatePreferences({ theme });
                        }}
                        preferencesOpen={preferencesOpen}
                        signupUrl={hnLoginUrl(page.sourceUrl, 'signup')}
                        theme={preferences.theme}
                    />
                </div>
            </header>
            {preferencesOpen ? (
                <PreferencesPanel
                    filters={filters}
                    onFiltersChange={updateFilters}
                    onPreferencesChange={updatePreferences}
                    preferences={preferences}
                />
            ) : null}
            <div className="redhn-layout">
                <aside
                    className="redhn-sidebar"
                    aria-label="Hacker News navigation"
                >
                    <nav className="redhn-nav">
                        {navItems.map((item) => (
                            <a
                                className="redhn-nav__item"
                                href={item.href}
                                key={item.href}
                            >
                                <span
                                    className="redhn-nav__icon"
                                    aria-hidden="true"
                                >
                                    {item.label.slice(0, 1)}
                                </span>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                    <div className="redhn-sidebar__footer">
                        <a href="https://news.ycombinator.com/newsguidelines.html">
                            Guidelines
                        </a>
                        <a href="https://news.ycombinator.com/newsfaq.html">
                            FAQ
                        </a>
                    </div>
                </aside>
                <main className="redhn-main" aria-label={title}>
                    <div className="redhn-main__inner">
                        {page.kind === 'profile' && enrichedProfile ? (
                            <ProfileView
                                apiUser={apiUser}
                                comments={page.comments}
                                hiddenStoryCount={hiddenStoryCount}
                                onHnAction={runHnAction}
                                onSave={toggleSavedStory}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                onStoryView={markViewed}
                                overviewItems={profileOverviewItems}
                                overviewLoading={profileOverviewLoading}
                                page={page}
                                profile={enrichedProfile}
                                readState={readState}
                                savedStoryIds={savedStoryIds}
                                sharedStoryId={sharedStoryId}
                                stories={enrichedStories}
                            />
                        ) : (
                            <div
                                className="redhn-tabs"
                                role="navigation"
                                aria-label="Sort"
                            >
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
                        )}
                        {page.kind === 'profile' &&
                        enrichedProfile ? null : page.kind === 'item' &&
                          enrichedPost ? (
                            <PostView
                                comments={page.comments}
                                isSaved={savedStoryIds.has(enrichedPost.id)}
                                isShared={sharedStoryId === enrichedPost.id}
                                newCommentCount={newCommentCount}
                                onHnAction={runHnAction}
                                onSave={toggleSavedStory}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                post={enrichedPost}
                            />
                        ) : (
                            <StoryFeed
                                hiddenStoryCount={hiddenStoryCount}
                                onSave={toggleSavedStory}
                                onShare={(story) => {
                                    void navigator.clipboard
                                        ?.writeText(story.hnUrl)
                                        .then(() => {
                                            setSharedStoryId(story.id);
                                        });
                                }}
                                page={page}
                                readState={readState}
                                savedStoryIds={savedStoryIds}
                                sharedStoryId={sharedStoryId}
                                stories={enrichedStories}
                                onStoryView={markViewed}
                                onHnAction={runHnAction}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

function AuthPage({ auth }: { auth: ParsedAuthPage }) {
    const [mode, setMode] = useState<ParsedAuthMode>(auth.initialMode);
    const activeMode = mode === 'signup' && auth.signup ? 'signup' : 'login';
    const activeForm =
        activeMode === 'signup' && auth.signup ? auth.signup : auth.login;

    return (
        <main className="redhn-auth-page" aria-label="Hacker News login">
            <a
                aria-label="Hacker News home"
                className="redhn-auth-page__brand"
                href="https://news.ycombinator.com/news"
            >
                Hacker News
            </a>
            <section className="redhn-auth-card" aria-label="Authentication">
                <a
                    aria-label="Close"
                    className="redhn-auth-card__close"
                    href={auth.gotoUrl}
                >
                    <XIcon aria-hidden="true" weight="bold" />
                </a>
                <div className="redhn-auth-card__inner">
                    <header className="redhn-auth-card__header">
                        <h1>
                            {activeMode === 'signup' ? 'Sign Up' : 'Log In'}
                        </h1>
                        <p>Continue with your Hacker News account.</p>
                    </header>
                    {auth.signup ? (
                        <div
                            className="redhn-auth-tabs"
                            role="tablist"
                            aria-label="Authentication mode"
                        >
                            <button
                                aria-selected={activeMode === 'login'}
                                className={
                                    activeMode === 'login'
                                        ? 'redhn-auth-tabs__item redhn-auth-tabs__item--active'
                                        : 'redhn-auth-tabs__item'
                                }
                                onClick={() => {
                                    setMode('login');
                                }}
                                role="tab"
                                type="button"
                            >
                                Log In
                            </button>
                            <button
                                aria-selected={activeMode === 'signup'}
                                className={
                                    activeMode === 'signup'
                                        ? 'redhn-auth-tabs__item redhn-auth-tabs__item--active'
                                        : 'redhn-auth-tabs__item'
                                }
                                onClick={() => {
                                    setMode('signup');
                                }}
                                role="tab"
                                type="button"
                            >
                                Sign Up
                            </button>
                        </div>
                    ) : null}
                    <AuthForm
                        forgotUrl={auth.forgotUrl}
                        form={activeForm}
                        mode={activeMode}
                        onModeChange={setMode}
                        signupAvailable={auth.signup !== undefined}
                    />
                </div>
            </section>
        </main>
    );
}

type AuthFormProps = {
    forgotUrl?: string;
    form: ParsedAuthForm;
    mode: ParsedAuthMode;
    signupAvailable: boolean;
    onModeChange: (mode: ParsedAuthMode) => void;
};

function AuthForm({
    forgotUrl,
    form,
    mode,
    signupAvailable,
    onModeChange,
}: AuthFormProps) {
    return (
        <form
            action={form.action}
            className="redhn-auth-form"
            method={form.method}
        >
            {Object.entries(form.hiddenFields).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
            ))}
            <label className="redhn-auth-field">
                <span>Username</span>
                <input
                    autoCapitalize="off"
                    autoComplete="username"
                    autoCorrect="off"
                    autoFocus
                    name={form.usernameName}
                    placeholder="Username *"
                    required
                    spellCheck={false}
                    type="text"
                />
            </label>
            <label className="redhn-auth-field">
                <span>Password</span>
                <input
                    autoComplete={
                        mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    name={form.passwordName}
                    placeholder="Password *"
                    required
                    type="password"
                />
            </label>
            {mode === 'login' && forgotUrl ? (
                <a className="redhn-auth-form__link" href={forgotUrl}>
                    Forgot password?
                </a>
            ) : null}
            <button className="redhn-auth-submit" type="submit">
                {mode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
            {signupAvailable ? (
                <p className="redhn-auth-switch">
                    {mode === 'signup'
                        ? 'Already have an account?'
                        : 'New to Hacker News?'}
                    <button
                        onClick={() => {
                            onModeChange(
                                mode === 'signup' ? 'login' : 'signup',
                            );
                        }}
                        type="button"
                    >
                        {mode === 'signup' ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            ) : null}
        </form>
    );
}

type TopbarActionsProps = {
    currentUser?: ParsedCurrentUser;
    enabled: boolean;
    loginUrl: string;
    menuOpen: boolean;
    preferencesOpen: boolean;
    signupUrl: string;
    theme: RedhnPreferences['theme'];
    onEnabledChange: (enabled: boolean) => void;
    onMenuOpenChange: (open: boolean) => void;
    onPreferencesToggle: () => void;
    onThemeChange: (theme: RedhnPreferences['theme']) => void;
};

function TopbarActions({
    currentUser,
    enabled,
    loginUrl,
    menuOpen,
    preferencesOpen,
    signupUrl,
    theme,
    onEnabledChange,
    onMenuOpenChange,
    onPreferencesToggle,
    onThemeChange,
}: TopbarActionsProps) {
    const menuId = 'redhn-account-menu';
    const userThreadsUrl = currentUser
        ? `https://news.ycombinator.com/threads?id=${encodeURIComponent(
              currentUser.id,
          )}`
        : undefined;

    return (
        <>
            {currentUser ? (
                <>
                    <a
                        aria-label="Open discussion threads"
                        className="redhn-icon-button"
                        href={userThreadsUrl}
                        title="Threads"
                    >
                        <ChatCircleIcon aria-hidden="true" weight="bold" />
                    </a>
                    <a
                        className="redhn-create-button"
                        href="https://news.ycombinator.com/submit"
                    >
                        <PlusSquareIcon aria-hidden="true" weight="bold" />
                        <span>Create</span>
                    </a>
                    <button
                        aria-label="Notifications"
                        className="redhn-icon-button"
                        title="Notifications"
                        type="button"
                    >
                        <BellIcon aria-hidden="true" weight="bold" />
                    </button>
                    <button
                        aria-controls={menuId}
                        aria-expanded={menuOpen}
                        aria-label="Open profile menu"
                        className="redhn-avatar-button"
                        onClick={() => {
                            onMenuOpenChange(!menuOpen);
                        }}
                        type="button"
                    >
                        <UserAvatar userId={currentUser.id} />
                    </button>
                </>
            ) : (
                <>
                    <a className="redhn-auth-button" href={signupUrl}>
                        Sign Up
                    </a>
                    <a
                        className="redhn-auth-button redhn-auth-button--primary"
                        href={loginUrl}
                    >
                        Log In
                    </a>
                    <button
                        aria-controls={menuId}
                        aria-expanded={menuOpen}
                        aria-label="Open RedHN menu"
                        className="redhn-icon-button"
                        onClick={() => {
                            onMenuOpenChange(!menuOpen);
                        }}
                        type="button"
                    >
                        <DotsThreeIcon aria-hidden="true" weight="bold" />
                    </button>
                </>
            )}
            {menuOpen ? (
                <AccountMenu
                    currentUser={currentUser}
                    enabled={enabled}
                    id={menuId}
                    onEnabledChange={onEnabledChange}
                    onPreferencesToggle={onPreferencesToggle}
                    onThemeChange={onThemeChange}
                    preferencesOpen={preferencesOpen}
                    theme={theme}
                />
            ) : null}
        </>
    );
}

type AccountMenuProps = {
    currentUser?: ParsedCurrentUser;
    enabled: boolean;
    id: string;
    preferencesOpen: boolean;
    theme: RedhnPreferences['theme'];
    onEnabledChange: (enabled: boolean) => void;
    onPreferencesToggle: () => void;
    onThemeChange: (theme: RedhnPreferences['theme']) => void;
};

function AccountMenu({
    currentUser,
    enabled,
    id,
    preferencesOpen,
    theme,
    onEnabledChange,
    onPreferencesToggle,
    onThemeChange,
}: AccountMenuProps) {
    return (
        <div
            aria-label={currentUser ? 'Profile menu' : 'RedHN menu'}
            className="redhn-account-menu"
            id={id}
            role="menu"
        >
            {currentUser ? (
                <a
                    className="redhn-account-menu__profile"
                    href={currentUser.profileUrl}
                    role="menuitem"
                >
                    <UserAvatar userId={currentUser.id} />
                    <span>
                        <strong>View Profile</strong>
                        <span>u/{currentUser.id}</span>
                    </span>
                </a>
            ) : null}
            <MenuRow icon={<MonitorIcon weight="bold" />} label="Display Mode">
                <select
                    aria-label="Display mode"
                    value={theme}
                    onChange={(event) => {
                        onThemeChange(
                            event.currentTarget
                                .value as RedhnPreferences['theme'],
                        );
                    }}
                >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </MenuRow>
            <MenuRow icon={<PowerIcon weight="bold" />} label="RedHN View">
                <label className="redhn-menu-switch">
                    <input
                        checked={enabled}
                        onChange={(event) => {
                            onEnabledChange(event.currentTarget.checked);
                        }}
                        type="checkbox"
                    />
                    <span aria-hidden="true" />
                </label>
            </MenuRow>
            <button
                className="redhn-account-menu__item"
                onClick={onPreferencesToggle}
                role="menuitem"
                type="button"
            >
                <GearSixIcon aria-hidden="true" weight="bold" />
                <span>{preferencesOpen ? 'Hide Settings' : 'Settings'}</span>
            </button>
            <div className="redhn-account-menu__separator" role="separator" />
            <a
                className="redhn-account-menu__item"
                href="https://news.ycombinator.com/newsguidelines.html"
                role="menuitem"
            >
                <span className="redhn-menu-letter" aria-hidden="true">
                    G
                </span>
                <span>Guidelines</span>
            </a>
            <a
                className="redhn-account-menu__item"
                href="https://news.ycombinator.com/newsfaq.html"
                role="menuitem"
            >
                <span className="redhn-menu-letter" aria-hidden="true">
                    ?
                </span>
                <span>FAQ</span>
            </a>
            {currentUser?.logoutUrl ? (
                <>
                    <div
                        className="redhn-account-menu__separator"
                        role="separator"
                    />
                    <a
                        className="redhn-account-menu__item"
                        href={currentUser.logoutUrl}
                        role="menuitem"
                    >
                        <SignOutIcon aria-hidden="true" weight="bold" />
                        <span>Log Out</span>
                    </a>
                </>
            ) : null}
        </div>
    );
}

type MenuRowProps = {
    children: ReactNode;
    icon: ReactNode;
    label: string;
};

function MenuRow({ children, icon, label }: MenuRowProps) {
    return (
        <div className="redhn-account-menu__item redhn-account-menu__item--control">
            <span className="redhn-account-menu__icon" aria-hidden="true">
                {icon}
            </span>
            <span>{label}</span>
            {children}
        </div>
    );
}

function UserAvatar({ userId }: { userId: string }) {
    return (
        <span className="redhn-avatar" aria-hidden="true">
            <UserCircleIcon weight="fill" />
            <span>{userInitials(userId)}</span>
        </span>
    );
}

type PreferencesPanelProps = {
    preferences: RedhnPreferences;
    filters: RedhnFilters;
    onPreferencesChange: (patch: Partial<RedhnPreferences>) => void;
    onFiltersChange: (patch: Partial<RedhnFilters>) => void;
};

function PreferencesPanel({
    preferences,
    filters,
    onPreferencesChange,
    onFiltersChange,
}: PreferencesPanelProps) {
    return (
        <section className="redhn-preferences" aria-label="Preferences">
            <label className="redhn-field">
                <span>Font</span>
                <input
                    max="20"
                    min="12"
                    onChange={(event) => {
                        onPreferencesChange({
                            fontSize: event.currentTarget.valueAsNumber,
                        });
                    }}
                    type="range"
                    value={preferences.fontSize}
                />
            </label>
            <label className="redhn-field">
                <span>Line</span>
                <input
                    max="1.9"
                    min="1.2"
                    onChange={(event) => {
                        onPreferencesChange({
                            lineHeight: event.currentTarget.valueAsNumber,
                        });
                    }}
                    step="0.05"
                    type="range"
                    value={preferences.lineHeight}
                />
            </label>
            <label className="redhn-field">
                <span>Width</span>
                <input
                    max="1600"
                    min="720"
                    onChange={(event) => {
                        onPreferencesChange({
                            maxWidth: event.currentTarget.valueAsNumber,
                        });
                    }}
                    step="40"
                    type="range"
                    value={preferences.maxWidth}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Keywords</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedKeywords: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="ai, crypto, launch"
                    type="text"
                    value={termsToInput(filters.mutedKeywords)}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Domains</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedDomains: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="example.com"
                    type="text"
                    value={termsToInput(filters.mutedDomains)}
                />
            </label>
            <label className="redhn-field redhn-field--wide">
                <span>Topics</span>
                <input
                    onChange={(event) => {
                        onFiltersChange({
                            mutedTopics: termsFromInput(
                                event.currentTarget.value,
                            ),
                        });
                    }}
                    placeholder="ask hn, show hn"
                    type="text"
                    value={termsToInput(filters.mutedTopics)}
                />
            </label>
        </section>
    );
}

type ProfileViewProps = {
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

function ProfileView({
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
}: ProfileViewProps) {
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

type PostViewProps = {
    post: ParsedStory;
    comments: ParsedComment[];
    isSaved: boolean;
    isShared: boolean;
    newCommentCount: number;
    onHnAction: (href: string) => void;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
};

function PostView({
    post,
    comments,
    isSaved,
    isShared,
    newCommentCount,
    onHnAction,
    onSave,
    onShare,
}: PostViewProps) {
    const [collapsedCommentIds, setCollapsedCommentIds] = useState(
        () => new Set<number>(),
    );
    const [collapseDepth, setCollapseDepth] = useState<number>();
    const totalComments = countComments(comments);

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

    return (
        <article className="redhn-post">
            <header className="redhn-post__header">
                <div className="redhn-story__meta">
                    <a className="redhn-story__source" href={post.url}>
                        {post.domain ?? 'news.ycombinator.com'}
                    </a>
                    {post.author ? <span>Posted by {post.author}</span> : null}
                    {post.age ? <span>{post.age}</span> : null}
                </div>
                <h1 className="redhn-post__title">{post.title}</h1>
                {post.textHtml ? (
                    <div
                        className="redhn-post__text"
                        dangerouslySetInnerHTML={{
                            __html: sanitizeHnHtml(post.textHtml),
                        }}
                    />
                ) : null}
                <div className="redhn-story__actions">
                    {post.actions.upvote ? (
                        <HnActionLink
                            className="redhn-action"
                            href={post.actions.upvote}
                            onHnAction={onHnAction}
                        >
                            <span aria-hidden="true">^</span>
                            <span>{formatNumber(post.score)}</span>
                        </HnActionLink>
                    ) : (
                        <span className="redhn-action">
                            <span aria-hidden="true">^</span>
                            <span>{formatNumber(post.score)}</span>
                        </span>
                    )}
                    <a
                        className="redhn-action"
                        href={post.actions.comments ?? post.hnUrl}
                    >
                        <span aria-hidden="true">[]</span>
                        <span>{formatNumber(post.commentCount)}</span>
                    </a>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(post);
                        }}
                        type="button"
                    >
                        <span aria-hidden="true">/</span>
                        <span>{isShared ? 'Copied' : 'Share'}</span>
                    </button>
                    <button
                        className={
                            isSaved
                                ? 'redhn-action redhn-action--active'
                                : 'redhn-action'
                        }
                        onClick={() => {
                            onSave(post.id);
                        }}
                        type="button"
                    >
                        <span aria-hidden="true">#</span>
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    {post.actions.reply ? (
                        <HnActionLink
                            className="redhn-action"
                            href={post.actions.reply}
                            onHnAction={onHnAction}
                        >
                            Reply
                        </HnActionLink>
                    ) : null}
                </div>
            </header>
            <div className="redhn-comment-tools">
                <span>
                    {formatNumber(totalComments)} comments
                    {newCommentCount > 0
                        ? ` / ${formatNumber(newCommentCount)} new`
                        : ''}
                </span>
                <div className="redhn-comment-tools__buttons">
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(2);
                        }}
                        type="button"
                    >
                        Depth 2
                    </button>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(4);
                        }}
                        type="button"
                    >
                        Depth 4
                    </button>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            setCollapseDepth(undefined);
                            setCollapsedCommentIds(new Set());
                        }}
                        type="button"
                    >
                        Expand
                    </button>
                </div>
            </div>
            <section className="redhn-comments" aria-label="Comments">
                {comments.map((comment) => (
                    <CommentThread
                        collapseDepth={collapseDepth}
                        collapsedCommentIds={collapsedCommentIds}
                        comment={comment}
                        key={comment.id}
                        onHnAction={onHnAction}
                        onToggle={toggleComment}
                    />
                ))}
            </section>
        </article>
    );
}

type CommentThreadProps = {
    comment: ParsedComment;
    collapsedCommentIds: Set<number>;
    collapseDepth?: number;
    onHnAction: (href: string) => void;
    onToggle: (commentId: number) => void;
};

function CommentThread({
    comment,
    collapsedCommentIds,
    collapseDepth,
    onHnAction,
    onToggle,
}: CommentThreadProps) {
    const collapsed =
        collapsedCommentIds.has(comment.id) ||
        (collapseDepth !== undefined && comment.depth >= collapseDepth);
    const replies = countComments(comment.children);

    return (
        <article
            className={
                collapsed
                    ? 'redhn-comment redhn-comment--collapsed'
                    : 'redhn-comment'
            }
            style={
                {
                    '--redhn-comment-depth': comment.depth,
                    '--redhn-comment-guide': commentGuideColor(comment.depth),
                } as CSSProperties
            }
        >
            <button
                aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
                className="redhn-comment__guide"
                onClick={() => {
                    onToggle(comment.id);
                }}
                type="button"
            />
            <div className="redhn-comment__body">
                <header className="redhn-comment__header">
                    <span className="redhn-comment__avatar" aria-hidden="true">
                        {(comment.author ?? '?').slice(0, 1)}
                    </span>
                    {comment.author ? (
                        <a
                            className="redhn-comment__author"
                            href={`https://news.ycombinator.com/user?id=${comment.author}`}
                        >
                            {comment.author}
                        </a>
                    ) : (
                        <span className="redhn-comment__author">unknown</span>
                    )}
                    {comment.age ? <span>{comment.age}</span> : null}
                    {replies > 0 ? (
                        <span>{formatNumber(replies)} replies</span>
                    ) : null}
                    <button
                        className="redhn-comment__collapse"
                        onClick={() => {
                            onToggle(comment.id);
                        }}
                        type="button"
                    >
                        {collapsed ? '+' : '-'}
                    </button>
                </header>
                {collapsed ? (
                    <p className="redhn-comment__summary">{comment.text}</p>
                ) : (
                    <>
                        <div
                            className="redhn-comment__text"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeHnHtml(comment.html),
                            }}
                        />
                        <div className="redhn-comment__actions">
                            {comment.actions.upvote ? (
                                <HnActionLink
                                    className="redhn-action"
                                    href={comment.actions.upvote}
                                    onHnAction={onHnAction}
                                >
                                    ^
                                </HnActionLink>
                            ) : null}
                            {comment.actions.reply ? (
                                <HnActionLink
                                    className="redhn-action"
                                    href={comment.actions.reply}
                                    onHnAction={onHnAction}
                                >
                                    Reply
                                </HnActionLink>
                            ) : null}
                            {comment.actions.parent ? (
                                <a
                                    className="redhn-action"
                                    href={comment.actions.parent}
                                >
                                    Parent
                                </a>
                            ) : null}
                        </div>
                        {comment.children.length > 0 ? (
                            <div className="redhn-comment__children">
                                {comment.children.map((child) => (
                                    <CommentThread
                                        collapseDepth={collapseDepth}
                                        collapsedCommentIds={
                                            collapsedCommentIds
                                        }
                                        comment={child}
                                        key={child.id}
                                        onHnAction={onHnAction}
                                        onToggle={onToggle}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </article>
    );
}

type StoryFeedProps = {
    page: ParsedPage;
    stories: ParsedStory[];
    hiddenStoryCount: number;
    readState: RedhnReadState;
    savedStoryIds: Set<number>;
    sharedStoryId?: number;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
};

function StoryFeed({
    page,
    stories,
    hiddenStoryCount,
    readState,
    savedStoryIds,
    sharedStoryId,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
}: StoryFeedProps) {
    return (
        <section className="redhn-feed" aria-label="Hacker News stories">
            {hiddenStoryCount > 0 ? (
                <p className="redhn-feed__muted">
                    {formatNumber(hiddenStoryCount)} muted
                </p>
            ) : null}
            {stories.map((story) => (
                <StoryCard
                    isSaved={savedStoryIds.has(story.id)}
                    isShared={sharedStoryId === story.id}
                    isViewed={readState.viewedStoryIds[story.id] !== undefined}
                    key={story.id}
                    onSave={onSave}
                    onShare={onShare}
                    onStoryView={onStoryView}
                    onHnAction={onHnAction}
                    story={story}
                />
            ))}
            {page.pagination.more ? (
                <div className="redhn-feed__more">
                    <a
                        className="redhn-button redhn-button--primary"
                        href={page.pagination.more}
                    >
                        View More
                    </a>
                </div>
            ) : null}
        </section>
    );
}

type StoryCardProps = {
    story: ParsedStory;
    isSaved: boolean;
    isShared: boolean;
    isViewed: boolean;
    onSave: (storyId: number) => void;
    onShare: (story: ParsedStory) => void;
    onStoryView: (storyId: number) => void;
    onHnAction: (href: string) => void;
};

function StoryCard({
    story,
    isSaved,
    isShared,
    isViewed,
    onSave,
    onShare,
    onStoryView,
    onHnAction,
}: StoryCardProps) {
    const sourceLabel = story.domain ?? 'news.ycombinator.com';
    const commentsHref = story.actions.comments ?? story.hnUrl;
    const creditAuthor = story.author ?? 'unknown';

    return (
        <article
            className={
                isViewed ? 'redhn-story redhn-story--viewed' : 'redhn-story'
            }
        >
            <a
                aria-label={`Open comments for ${story.title}`}
                className="redhn-story__card-link"
                href={commentsHref}
                onClick={() => {
                    onStoryView(story.id);
                }}
            />
            <div className="redhn-story__content">
                <header className="redhn-story__header">
                    <div className="redhn-story__credit">
                        <span
                            className="redhn-story__avatar"
                            aria-hidden="true"
                        >
                            {userInitials(creditAuthor)}
                        </span>
                        {story.author ? (
                            <a
                                className="redhn-story__author"
                                href={`https://news.ycombinator.com/user?id=${encodeURIComponent(
                                    story.author,
                                )}`}
                            >
                                u/{story.author}
                            </a>
                        ) : (
                            <span className="redhn-story__author">
                                u/{creditAuthor}
                            </span>
                        )}
                        {story.age ? (
                            <>
                                <span
                                    className="redhn-story__credit-dot"
                                    aria-hidden="true"
                                >
                                    •
                                </span>
                                <span>{story.age}</span>
                            </>
                        ) : null}
                    </div>
                    <details className="redhn-story__menu">
                        <summary aria-label="More story actions">
                            <DotsThreeIcon
                                aria-hidden="true"
                                className="redhn-story__menu-icon"
                                weight="bold"
                            />
                        </summary>
                        <div className="redhn-story__menu-panel">
                            <button
                                className="redhn-story__menu-item"
                                onClick={() => {
                                    onSave(story.id);
                                }}
                                type="button"
                            >
                                <BookmarkSimpleIcon
                                    aria-hidden="true"
                                    className="redhn-story__menu-item-icon"
                                    weight={isSaved ? 'fill' : 'bold'}
                                />
                                {isSaved ? 'Saved' : 'Save'}
                            </button>
                            {story.actions.hide ? (
                                <HnActionLink
                                    className="redhn-story__menu-item"
                                    href={story.actions.hide}
                                    onHnAction={onHnAction}
                                >
                                    Hide
                                </HnActionLink>
                            ) : null}
                        </div>
                    </details>
                </header>
                <h2 className="redhn-story__title">{story.title}</h2>
                <a
                    className="redhn-story__source-link"
                    href={story.url}
                    title={story.url}
                >
                    {story.url || sourceLabel}
                </a>
                <div className="redhn-story__actions redhn-story__actions--card">
                    {story.actions.upvote ? (
                        <HnActionLink
                            aria-label="Upvote"
                            className="redhn-action redhn-action--vote"
                            href={story.actions.upvote}
                            onHnAction={onHnAction}
                        >
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(story.score)}</span>
                        </HnActionLink>
                    ) : (
                        <span className="redhn-action redhn-action--vote redhn-action--disabled">
                            <ArrowFatUpIcon
                                aria-hidden="true"
                                className="redhn-action__icon"
                                weight="bold"
                            />
                            <span>{formatNumber(story.score)}</span>
                        </span>
                    )}
                    <a
                        className="redhn-action"
                        href={commentsHref}
                        onClick={() => {
                            onStoryView(story.id);
                        }}
                    >
                        <ChatCircleIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight="bold"
                        />
                        <span>{formatNumber(story.commentCount)}</span>
                    </a>
                    <button
                        className="redhn-action"
                        onClick={() => {
                            onShare(story);
                        }}
                        type="button"
                    >
                        <ShareFatIcon
                            aria-hidden="true"
                            className="redhn-action__icon"
                            weight="bold"
                        />
                        <span>{isShared ? 'Copied' : 'Share'}</span>
                    </button>
                </div>
            </div>
        </article>
    );
}

type HnActionLinkProps = {
    href: string;
    className: string;
    children: ReactNode;
    onHnAction: (href: string) => void;
    'aria-label'?: string;
};

function HnActionLink({
    href,
    className,
    children,
    onHnAction,
    'aria-label': ariaLabel,
}: HnActionLinkProps) {
    return (
        <a
            aria-label={ariaLabel}
            className={className}
            href={href}
            onClick={(event) => {
                event.preventDefault();
                onHnAction(href);
            }}
        >
            {children}
        </a>
    );
}

function countComments(comments: ParsedComment[]): number {
    return comments.reduce(
        (total, comment) => total + 1 + countComments(comment.children),
        0,
    );
}

function hnLoginUrl(sourceUrl: string, mode: ParsedAuthMode): string {
    let goto = 'news';

    try {
        const url = new URL(sourceUrl);
        const path = url.pathname.replace(/^\/+/, '');
        goto = `${path || 'news'}${url.search}`;
    } catch {
        goto = sourceUrl.replace(/^https:\/\/news\.ycombinator\.com\/?/, '');
    }

    return `https://news.ycombinator.com/login?goto=${encodeURIComponent(
        goto || 'news',
    )}#${mode}`;
}

function userInitials(userId: string): string {
    const parts = userId
        .split(/[^a-z0-9]+/i)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function enrichStoryWithApiItem(
    story: ParsedStory,
    item: HnApiItem | null | undefined,
): ParsedStory {
    if (!item) {
        return story;
    }

    return {
        ...story,
        title: item.title ?? story.title,
        url: item.url ?? story.url,
        author: item.by ?? story.author,
        score: item.score ?? story.score,
        commentCount: item.descendants ?? story.commentCount,
    };
}

function enrichProfileWithApiUser(
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

function isVisibleApiItem(
    item: HnApiItem | null | undefined,
): item is HnApiItem {
    return item !== null && item !== undefined && !item.deleted && !item.dead;
}

function commentGuideColor(depth: number): string {
    const colors = ['#926f66', '#4d7788', '#ad2c00', '#617152', '#6d5b8a'];
    return colors[depth % colors.length];
}

function sanitizeHnHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    for (const element of template.content.querySelectorAll('*')) {
        if (
            [
                'script',
                'style',
                'iframe',
                'object',
                'embed',
                'link',
                'meta',
            ].includes(element.tagName.toLowerCase())
        ) {
            element.remove();
            continue;
        }

        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (
                name.startsWith('on') ||
                ((name === 'href' || name === 'src') &&
                    value.startsWith('javascript:'))
            ) {
                element.removeAttribute(attribute.name);
            }
        }

        if (element.tagName.toLowerCase() === 'a') {
            element.setAttribute('rel', 'nofollow noopener noreferrer');
        }
    }

    return template.innerHTML;
}

function formatNumber(value: number | undefined): string {
    return value === undefined
        ? '-'
        : new Intl.NumberFormat('en-US').format(value);
}

function formatProfileDate(profile: ParsedProfile): string {
    return profile.createdAt
        ? formatUnixDate(profile.createdAt)
        : (profile.created ?? '-');
}

function formatUnixDate(value: number): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value * 1000));
}

function hnItemUrl(id: number): string {
    return `https://news.ycombinator.com/item?id=${id}`;
}

function textFromHtml(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
