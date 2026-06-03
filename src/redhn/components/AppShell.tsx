import {
    useCallback,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import {
    BriefcaseIcon,
    CaretDownIcon,
    CaretUpIcon,
    ChatCircleIcon,
    ChatCircleTextIcon,
    ClockIcon,
    DotsThreeIcon,
    FileTextIcon,
    FlameIcon,
    GearSixIcon,
    InfoIcon,
    ListIcon,
    MegaphoneIcon,
    MonitorIcon,
    NewspaperIcon,
    PlusSquareIcon,
    QuestionIcon,
    SignOutIcon,
    TrendUpIcon,
} from '@phosphor-icons/react';
import type { ParsedCurrentUser } from '../hn/types';
import {
    termsFromInput,
    termsToInput,
    type RedhnFilters,
} from '../state/filters';
import type { RedhnPreferences } from '../state/preferences';
import { isActivePath, redhnSortOptions } from '../view/sortOptions';
import { hnLoginUrl } from '../view/urls';
import { useCloseOnOutsidePointer } from './useCloseOnOutsidePointer';
import { UserAvatar } from './UserAvatar';

type AppShellProps = {
    children: ReactNode;
    accountMenuOpen: boolean;
    currentUser?: ParsedCurrentUser;
    filters: RedhnFilters;
    preferences: RedhnPreferences;
    preferencesOpen: boolean;
    sourceUrl: string;
    title: string;
    onFiltersChange: (patch: Partial<RedhnFilters>) => void;
    onMenuOpenChange: (open: boolean) => void;
    onPreferencesChange: (patch: Partial<RedhnPreferences>) => void;
    onPreferencesToggle: () => void;
};

type SidebarItem = {
    label: string;
    href: string;
    icon: ReactNode;
    active?: boolean;
};

type SidebarSection = {
    title?: string;
    expanded?: boolean;
    items: SidebarItem[];
};

export function AuthShell({
    children,
    preferences,
}: {
    children: ReactNode;
    preferences: RedhnPreferences;
}) {
    return (
        <div
            className={`redhn-shell redhn-shell--${preferences.theme}`}
            style={preferencesStyle(preferences)}
        >
            {children}
        </div>
    );
}

export function AppShell({
    children,
    accountMenuOpen,
    currentUser,
    filters,
    preferences,
    preferencesOpen,
    sourceUrl,
    title,
    onFiltersChange,
    onMenuOpenChange,
    onPreferencesChange,
    onPreferencesToggle,
}: AppShellProps) {
    const sidebarSections = buildSidebarSections(sourceUrl);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const closeAccountMenu = useCallback(() => {
        onMenuOpenChange(false);
    }, [onMenuOpenChange]);
    const accountMenuRef = useCloseOnOutsidePointer<HTMLDivElement>({
        open: accountMenuOpen,
        onClose: closeAccountMenu,
    });
    const shellClassName = [
        'redhn-shell',
        `redhn-shell--${preferences.theme}`,
        isSidebarCollapsed ? 'redhn-shell--sidebar-collapsed' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={shellClassName} style={preferencesStyle(preferences)}>
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
                <div className="redhn-topbar__actions" ref={accountMenuRef}>
                    <TopbarActions
                        currentUser={currentUser}
                        loginUrl={hnLoginUrl(sourceUrl, 'login')}
                        menuOpen={accountMenuOpen}
                        onMenuOpenChange={onMenuOpenChange}
                        onPreferencesToggle={onPreferencesToggle}
                        onThemeChange={(theme) => {
                            onPreferencesChange({ theme });
                        }}
                        preferencesOpen={preferencesOpen}
                        signupUrl={hnLoginUrl(sourceUrl, 'signup')}
                        theme={preferences.theme}
                    />
                </div>
            </header>
            {preferencesOpen ? (
                <PreferencesPanel
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                    onPreferencesChange={onPreferencesChange}
                    preferences={preferences}
                />
            ) : null}
            <div className="redhn-layout">
                <aside
                    className="redhn-sidebar"
                    aria-label="Hacker News navigation"
                >
                    <button
                        aria-expanded={!isSidebarCollapsed}
                        aria-label={
                            isSidebarCollapsed
                                ? 'Expand navigation'
                                : 'Collapse navigation'
                        }
                        className="redhn-sidebar-toggle"
                        onClick={() => {
                            setIsSidebarCollapsed((current) => !current);
                        }}
                        title={
                            isSidebarCollapsed
                                ? 'Expand navigation'
                                : 'Collapse navigation'
                        }
                        type="button"
                    >
                        <ListIcon aria-hidden="true" weight="bold" />
                    </button>
                    <div className="redhn-sidebar__scroll">
                        <nav className="redhn-nav" aria-label="Primary">
                            {sidebarSections.map((section, index) => (
                                <SidebarSectionNav
                                    key={section.title ?? 'main'}
                                    section={section}
                                    showDivider={index > 0}
                                />
                            ))}
                        </nav>
                    </div>
                </aside>
                <main className="redhn-main" aria-label={title}>
                    <div className="redhn-main__inner">{children}</div>
                </main>
            </div>
        </div>
    );
}

function SidebarSectionNav({
    section,
    showDivider,
}: {
    section: SidebarSection;
    showDivider: boolean;
}) {
    return (
        <section
            className={
                showDivider
                    ? 'redhn-nav__section redhn-nav__section--divided'
                    : 'redhn-nav__section'
            }
        >
            {section.title ? (
                <div className="redhn-nav__section-header">
                    <span>{section.title}</span>
                    {section.expanded === false ? (
                        <CaretDownIcon aria-hidden="true" weight="bold" />
                    ) : (
                        <CaretUpIcon aria-hidden="true" weight="bold" />
                    )}
                </div>
            ) : null}
            <div className="redhn-nav__section-items">
                {section.items.map((item) => (
                    <a
                        className={
                            item.active
                                ? 'redhn-nav__item redhn-nav__item--active'
                                : 'redhn-nav__item'
                        }
                        href={item.href}
                        key={item.href}
                        title={item.label}
                    >
                        <span className="redhn-nav__icon" aria-hidden="true">
                            {item.icon}
                        </span>
                        <span className="redhn-nav__label">{item.label}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}

function buildSidebarSections(sourceUrl: string): SidebarSection[] {
    return [
        {
            items: [
                ...redhnSortOptions.map((option) => ({
                    label: option.label,
                    href: option.href,
                    icon: sortIconForPath(option.path),
                    active: isActivePath(sourceUrl, option.path),
                })),
                {
                    label: 'Past',
                    href: 'https://news.ycombinator.com/front',
                    icon: <FlameIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/front'),
                },
                {
                    label: 'Comments',
                    href: 'https://news.ycombinator.com/newcomments',
                    icon: <ChatCircleTextIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/newcomments'),
                },
            ],
        },
        {
            title: 'HN Sections',
            expanded: true,
            items: [
                {
                    label: 'Ask HN',
                    href: 'https://news.ycombinator.com/ask',
                    icon: <QuestionIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/ask'),
                },
                {
                    label: 'Show HN',
                    href: 'https://news.ycombinator.com/show',
                    icon: <MegaphoneIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/show'),
                },
                {
                    label: 'Jobs',
                    href: 'https://news.ycombinator.com/jobs',
                    icon: <BriefcaseIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/jobs'),
                },
            ],
        },
        {
            title: 'Help',
            expanded: true,
            items: [
                {
                    label: 'Guidelines',
                    href: 'https://news.ycombinator.com/newsguidelines.html',
                    icon: <FileTextIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/newsguidelines.html'),
                },
                {
                    label: 'FAQ',
                    href: 'https://news.ycombinator.com/newsfaq.html',
                    icon: <InfoIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/newsfaq.html'),
                },
            ],
        },
    ];
}

function sortIconForPath(path: string): ReactNode {
    switch (path) {
        case '/best':
            return <TrendUpIcon weight="bold" />;
        case '/newest':
            return <ClockIcon weight="bold" />;
        default:
            return <NewspaperIcon weight="fill" />;
    }
}

type TopbarActionsProps = {
    currentUser?: ParsedCurrentUser;
    loginUrl: string;
    menuOpen: boolean;
    preferencesOpen: boolean;
    signupUrl: string;
    theme: RedhnPreferences['theme'];
    onMenuOpenChange: (open: boolean) => void;
    onPreferencesToggle: () => void;
    onThemeChange: (theme: RedhnPreferences['theme']) => void;
};

function TopbarActions({
    currentUser,
    loginUrl,
    menuOpen,
    preferencesOpen,
    signupUrl,
    theme,
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
                    id={menuId}
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
    id: string;
    preferencesOpen: boolean;
    theme: RedhnPreferences['theme'];
    onPreferencesToggle: () => void;
    onThemeChange: (theme: RedhnPreferences['theme']) => void;
};

function AccountMenu({
    currentUser,
    id,
    preferencesOpen,
    theme,
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
            <button
                className="redhn-account-menu__item"
                onClick={onPreferencesToggle}
                role="menuitem"
                type="button"
            >
                <GearSixIcon aria-hidden="true" weight="bold" />
                <span>{preferencesOpen ? 'Hide Settings' : 'Settings'}</span>
            </button>
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

function preferencesStyle(preferences: RedhnPreferences): CSSProperties {
    return {
        '--redhn-user-font-size': `${preferences.fontSize}px`,
        '--redhn-user-line-height': preferences.lineHeight,
        '--redhn-content-width': `${preferences.maxWidth}px`,
    } as CSSProperties;
}
