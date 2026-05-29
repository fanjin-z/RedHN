import { useState } from 'react';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import type {
    ParsedAuthForm,
    ParsedAuthMode,
    ParsedAuthPage,
} from '../hn/types';

type AuthPageProps = {
    auth: ParsedAuthPage;
};

export function AuthPage({ auth }: AuthPageProps) {
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
