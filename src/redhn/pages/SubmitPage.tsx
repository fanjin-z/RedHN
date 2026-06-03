import { useMemo, useState, type ReactNode } from 'react';
import {
    CaretDownIcon,
    CaretUpIcon,
    MegaphoneIcon,
    NewspaperIcon,
    QuestionIcon,
} from '@phosphor-icons/react';
import type { ParsedSubmitPage } from '../hn/types';
import {
    composeSubmitTitle,
    HN_SUBMIT_TITLE_LIMIT,
    parseSubmitTitle,
    prefixForSubmitSection,
    type SubmitSection,
} from '../view/submit';

type SubmitPageProps = {
    submit: ParsedSubmitPage;
};

type SubmitSectionConfig = {
    id: SubmitSection;
    label: string;
    helper: string;
    icon: ReactNode;
};

const SUBMIT_SECTIONS: SubmitSectionConfig[] = [
    {
        id: 'hn',
        label: 'Hacker News',
        helper: 'Add a URL for a link submission, or leave URL blank for a text discussion.',
        icon: <NewspaperIcon weight="fill" />,
    },
    {
        id: 'ask',
        label: 'Ask HN',
        helper: 'Ask a focused question for community discussion.',
        icon: <QuestionIcon weight="bold" />,
    },
    {
        id: 'show',
        label: 'Show HN',
        helper: 'Share something you personally made that other people can try.',
        icon: <MegaphoneIcon weight="bold" />,
    },
];

export function SubmitPage({ submit }: SubmitPageProps) {
    const { form } = submit;
    const initialTitle = useMemo(
        () => parseSubmitTitle(form.titleValue),
        [form.titleValue],
    );
    const [section, setSection] = useState<SubmitSection>(initialTitle.section);
    const [editableTitle, setEditableTitle] = useState(
        initialTitle.editableTitle,
    );
    const [url, setUrl] = useState(form.urlValue);
    const [text, setText] = useState(form.textValue);
    const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
    const activeSection = configForSection(section);
    const prefix = prefixForSubmitSection(section);
    const title = composeSubmitTitle(section, editableTitle);
    const titleCount = title.length;
    const titleTooLong = titleCount > HN_SUBMIT_TITLE_LIMIT;
    const hidesUrl = section === 'ask';
    const canSubmit = editableTitle.trim().length > 0;
    const rules = useMemo(() => rulesForSection(section), [section]);

    return (
        <div className="redhn-submit-page">
            <div className="redhn-submit-page__main">
                <header className="redhn-submit-page__header">
                    <h1>Create post</h1>
                </header>
                <div className="redhn-submit-section">
                    <button
                        aria-expanded={sectionMenuOpen}
                        aria-haspopup="listbox"
                        className="redhn-submit-section__button"
                        onClick={() => {
                            setSectionMenuOpen((current) => !current);
                        }}
                        type="button"
                    >
                        <span>{activeSection.label}</span>
                        {sectionMenuOpen ? (
                            <CaretUpIcon aria-hidden="true" weight="bold" />
                        ) : (
                            <CaretDownIcon aria-hidden="true" weight="bold" />
                        )}
                    </button>
                    {sectionMenuOpen ? (
                        <div
                            aria-label="HN section"
                            className="redhn-submit-section__menu"
                            role="listbox"
                        >
                            {SUBMIT_SECTIONS.map((submitSection) => (
                                <button
                                    aria-selected={section === submitSection.id}
                                    className={
                                        section === submitSection.id
                                            ? 'redhn-submit-section__option redhn-submit-section__option--active'
                                            : 'redhn-submit-section__option'
                                    }
                                    key={submitSection.id}
                                    onClick={() => {
                                        setSection(submitSection.id);
                                        setSectionMenuOpen(false);
                                    }}
                                    role="option"
                                    type="button"
                                >
                                    <span
                                        className="redhn-submit-section__option-icon"
                                        aria-hidden="true"
                                    >
                                        {submitSection.icon}
                                    </span>
                                    <span>{submitSection.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
                <form
                    action={form.action}
                    className="redhn-submit-form"
                    method={form.method}
                >
                    {Object.entries(form.hiddenFields).map(([name, value]) => (
                        <input
                            key={name}
                            name={name}
                            type="hidden"
                            value={value}
                        />
                    ))}
                    {prefix ? (
                        <input
                            name={form.titleName}
                            type="hidden"
                            value={title}
                        />
                    ) : null}
                    <label
                        className={
                            prefix
                                ? 'redhn-submit-field redhn-submit-field--prefixed'
                                : 'redhn-submit-field'
                        }
                    >
                        <span className="redhn-sr-only">Title</span>
                        {prefix ? (
                            <span
                                className="redhn-submit-field__prefix"
                                aria-hidden="true"
                            >
                                {prefix.trim()}
                            </span>
                        ) : null}
                        <input
                            autoFocus
                            name={prefix ? undefined : form.titleName}
                            onChange={(event) => {
                                setEditableTitle(event.currentTarget.value);
                            }}
                            placeholder="Title"
                            type="text"
                            value={editableTitle}
                        />
                    </label>
                    <div
                        className={
                            titleTooLong
                                ? 'redhn-submit-counter redhn-submit-counter--warning'
                                : 'redhn-submit-counter'
                        }
                    >
                        {titleCount}/{HN_SUBMIT_TITLE_LIMIT}
                    </div>
                    {hidesUrl ? (
                        <input name={form.urlName} type="hidden" value="" />
                    ) : (
                        <label className="redhn-submit-field">
                            <span className="redhn-sr-only">URL</span>
                            <input
                                name={form.urlName}
                                onChange={(event) => {
                                    setUrl(event.currentTarget.value);
                                }}
                                placeholder="URL (optional)"
                                type="url"
                                value={url}
                            />
                        </label>
                    )}
                    <label className="redhn-submit-body">
                        <span className="redhn-sr-only">Text</span>
                        <textarea
                            name={form.textName}
                            onChange={(event) => {
                                setText(event.currentTarget.value);
                            }}
                            placeholder="Body text (optional)"
                            rows={8}
                            value={text}
                        />
                    </label>
                    <div className="redhn-submit-form__footer">
                        <p>{activeSection.helper}</p>
                        <button
                            className="redhn-submit-post-button"
                            disabled={!canSubmit}
                            type="submit"
                        >
                            Post
                        </button>
                    </div>
                </form>
            </div>
            <aside className="redhn-submit-rules" aria-label="Posting rules">
                <div className="redhn-submit-rules__section">
                    <span className="redhn-submit-rules__eyebrow">
                        {activeSection.label}
                    </span>
                    <h2>Posting rules</h2>
                    <ul>
                        {rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}

function configForSection(section: SubmitSection): SubmitSectionConfig {
    return SUBMIT_SECTIONS.find(
        (submitSection) => submitSection.id === section,
    )!;
}

function rulesForSection(section: SubmitSection): string[] {
    switch (section) {
        case 'ask':
            return [
                'Ask a focused question for community discussion.',
                'Do not use HN to send messages to HN staff.',
            ];
        case 'show':
            return [
                'Share something you personally made and are around to discuss.',
                'Make it easy to try, ideally without signup or email barriers.',
                'Do not use Show HN for blog posts, lists, newsletters, landing pages, or fundraisers.',
            ];
        default:
            return [
                'Submit the original source whenever possible.',
                'Use the original title unless it is misleading or linkbait.',
                'Avoid uppercase, exclamation points, and promotional wording.',
            ];
    }
}
