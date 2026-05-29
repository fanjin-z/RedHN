import type { CSSProperties, ReactNode } from 'react';
import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { ChatCircleTextIcon } from '@phosphor-icons/react/dist/csr/ChatCircleText';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree';
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { FlameIcon } from '@phosphor-icons/react/dist/csr/Flame';
import { GearSixIcon } from '@phosphor-icons/react/dist/csr/GearSix';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/csr/Megaphone';
import { MonitorIcon } from '@phosphor-icons/react/dist/csr/Monitor';
import { NewspaperIcon } from '@phosphor-icons/react/dist/csr/Newspaper';
import { PlusSquareIcon } from '@phosphor-icons/react/dist/csr/PlusSquare';
import { PowerIcon } from '@phosphor-icons/react/dist/csr/Power';
import { QuestionIcon } from '@phosphor-icons/react/dist/csr/Question';
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut';
import { TrendUpIcon } from '@phosphor-icons/react/dist/csr/TrendUp';
import type { ParsedCurrentUser } from '../hn/types';
import {
    termsFromInput,
    termsToInput,
    type RedhnFilters,
} from '../state/filters';
import type { RedhnPreferences } from '../state/preferences';
import { hnLoginUrl } from '../view/urls';
import { UserAvatar } from './UserAvatar';

type AppShellProps = {
    children: ReactNode;
    accountMenuOpen: boolean;
    currentUser?: ParsedCurrentUser;
    enabled: boolean;
    filters: RedhnFilters;
    preferences: RedhnPreferences;
    preferencesOpen: boolean;
    sourceUrl: string;
    title: string;
    onEnabledChange: (enabled: boolean) => void;
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

export function ClassicBar({
    onEnabledChange,
}: {
    onEnabledChange: (enabled: boolean) => void;
}) {
    return (
        <div className="redhn-classic-bar">
            <strong>RedHN</strong>
            <button
                className="redhn-button redhn-button--primary"
                type="button"
                onClick={() => {
                    onEnabledChange(true);
                }}
            >
                Enable
            </button>
        </div>
    );
}

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
    enabled,
    filters,
    preferences,
    preferencesOpen,
    sourceUrl,
    title,
    onEnabledChange,
    onFiltersChange,
    onMenuOpenChange,
    onPreferencesChange,
    onPreferencesToggle,
}: AppShellProps) {
    const sidebarSections = buildSidebarSections(sourceUrl);

    return (
        <div
            className={`redhn-shell redhn-shell--${preferences.theme}`}
            style={preferencesStyle(preferences)}
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
                        currentUser={currentUser}
                        enabled={enabled}
                        loginUrl={hnLoginUrl(sourceUrl, 'login')}
                        menuOpen={accountMenuOpen}
                        onEnabledChange={onEnabledChange}
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
                    <nav className="redhn-nav" aria-label="Primary">
                        {sidebarSections.map((section, index) => (
                            <SidebarSectionNav
                                key={section.title ?? 'main'}
                                section={section}
                                showDivider={index > 0}
                            />
                        ))}
                    </nav>
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
                {
                    label: 'Top Stories',
                    href: 'https://news.ycombinator.com/news',
                    icon: <NewspaperIcon weight="fill" />,
                    active: isActivePath(sourceUrl, '/news'),
                },
                {
                    label: 'Best',
                    href: 'https://news.ycombinator.com/best',
                    icon: <TrendUpIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/best'),
                },
                {
                    label: 'New',
                    href: 'https://news.ycombinator.com/newest',
                    icon: <ClockIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/newest'),
                },
                {
                    label: 'Front Page',
                    href: 'https://news.ycombinator.com/front',
                    icon: <FlameIcon weight="bold" />,
                    active: isActivePath(sourceUrl, '/front'),
                },
                {
                    label: 'New Comments',
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

function isActivePath(sourceUrl: string, path: string): boolean {
    try {
        return new URL(sourceUrl).pathname === path;
    } catch {
        return false;
    }
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
