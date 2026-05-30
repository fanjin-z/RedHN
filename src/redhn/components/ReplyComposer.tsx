import { forwardRef, useState, type FormEvent } from 'react';
import { PaperPlaneTiltIcon, XIcon } from '@phosphor-icons/react';
import type { HnReplyResult } from '../hn/actions';

type ReplyComposerProps = {
    label: string;
    placeholder: string;
    submitLabel?: string;
    autoFocus?: boolean;
    compact?: boolean;
    onCancel?: () => void;
    onSubmit: (text: string) => Promise<HnReplyResult>;
};

export const ReplyComposer = forwardRef<
    HTMLTextAreaElement,
    ReplyComposerProps
>(function ReplyComposer(
    {
        label,
        placeholder,
        submitLabel = 'Comment',
        autoFocus = false,
        compact = false,
        onCancel,
        onSubmit,
    },
    ref,
) {
    const [text, setText] = useState('');
    const [expanded, setExpanded] = useState(autoFocus);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>();
    const [loginUrl, setLoginUrl] = useState<string>();
    const canSubmit = text.trim().length > 0 && !submitting;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setError(undefined);
        setLoginUrl(undefined);

        void onSubmit(text.trim()).then((result) => {
            setSubmitting(false);

            if (result.kind === 'loginRequired') {
                setLoginUrl(result.url);
                return;
            }

            if (result.kind === 'failed') {
                setError(result.error);
            }
        });
    };

    return (
        <form
            className={
                compact
                    ? 'redhn-reply-composer redhn-reply-composer--compact'
                    : 'redhn-reply-composer'
            }
            onSubmit={submit}
        >
            <label className="redhn-sr-only">{label}</label>
            <textarea
                autoFocus={autoFocus}
                className="auto-grow"
                onChange={(event) => {
                    setText(event.target.value);
                    setError(undefined);
                    setLoginUrl(undefined);
                }}
                onFocus={() => {
                    setExpanded(true);
                }}
                placeholder={placeholder}
                ref={ref}
                rows={expanded ? 2 : 1}
                value={text}
            />
            {expanded ? (
                <div className="redhn-reply-composer__footer">
                    <div className="redhn-reply-composer__status">
                        {loginUrl ? (
                            <span>
                                Log in on Hacker News to reply. Your draft will
                                stay here.
                            </span>
                        ) : null}
                        {error ? <span>{error}</span> : null}
                    </div>
                    <div className="redhn-reply-composer__actions">
                        {loginUrl ? (
                            <a className="redhn-button" href={loginUrl}>
                                Log in
                            </a>
                        ) : null}
                        {onCancel ? (
                            <button
                                aria-label="Cancel reply"
                                className="redhn-icon-action"
                                onClick={onCancel}
                                type="button"
                            >
                                <XIcon aria-hidden="true" weight="bold" />
                            </button>
                        ) : null}
                        <button
                            className="redhn-button redhn-button--primary"
                            disabled={!canSubmit}
                            type="submit"
                        >
                            <PaperPlaneTiltIcon
                                aria-hidden="true"
                                weight="bold"
                            />
                            <span>{submitting ? 'Posting' : submitLabel}</span>
                        </button>
                    </div>
                </div>
            ) : null}
        </form>
    );
});
