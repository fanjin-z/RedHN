export const HN_SUBMIT_TITLE_LIMIT = 80;

export type SubmitSection = 'hn' | 'ask' | 'show';

const SECTION_PREFIXES: Partial<Record<SubmitSection, string>> = {
    ask: 'Ask HN: ',
    show: 'Show HN: ',
};

export type ParsedSubmitTitle = {
    section: SubmitSection;
    editableTitle: string;
};

export function parseSubmitTitle(title: string): ParsedSubmitTitle {
    for (const section of ['ask', 'show'] satisfies SubmitSection[]) {
        const prefix = prefixForSubmitSection(section);
        if (prefix && title.toLowerCase().startsWith(prefix.toLowerCase())) {
            return {
                section,
                editableTitle: title.slice(prefix.length).trimStart(),
            };
        }
    }

    return {
        section: 'hn',
        editableTitle: stripKnownPrefix(title).trimStart(),
    };
}

export function composeSubmitTitle(
    section: SubmitSection,
    editableTitle: string,
): string {
    return `${prefixForSubmitSection(section) ?? ''}${editableTitle}`;
}

export function prefixForSubmitSection(
    section: SubmitSection,
): string | undefined {
    return SECTION_PREFIXES[section];
}

function stripKnownPrefix(value: string): string {
    for (const prefix of Object.values(SECTION_PREFIXES)) {
        if (prefix && value.toLowerCase().startsWith(prefix.toLowerCase())) {
            return value.slice(prefix.length);
        }
    }

    return value;
}
