import type { ParsedStory } from '../hn/types';

export type RedhnFilters = {
    mutedKeywords: string[];
    mutedDomains: string[];
    mutedTopics: string[];
};

export const defaultFilters: RedhnFilters = {
    mutedKeywords: [],
    mutedDomains: [],
    mutedTopics: [],
};

export function normalizeFilters(
    filters: Partial<RedhnFilters> | undefined,
): RedhnFilters {
    return {
        mutedKeywords: normalizeTerms(filters?.mutedKeywords),
        mutedDomains: normalizeTerms(filters?.mutedDomains).map(
            normalizeDomain,
        ),
        mutedTopics: normalizeTerms(filters?.mutedTopics),
    };
}

export function applyStoryFilters(
    stories: ParsedStory[],
    filters: RedhnFilters,
): ParsedStory[] {
    const normalized = normalizeFilters(filters);

    return stories.filter((story) => {
        const title = story.title.toLowerCase();
        const domain = normalizeDomain(story.domain ?? '');
        const keywordMuted = normalized.mutedKeywords.some((keyword) =>
            title.includes(keyword),
        );
        const topicMuted = normalized.mutedTopics.some((topic) =>
            title.includes(topic),
        );
        const domainMuted =
            domain.length > 0 &&
            normalized.mutedDomains.some(
                (mutedDomain) =>
                    domain === mutedDomain ||
                    domain.endsWith(`.${mutedDomain}`),
            );

        return !keywordMuted && !topicMuted && !domainMuted;
    });
}

export function termsFromInput(value: string): string[] {
    return normalizeTerms(value.split(','));
}

export function termsToInput(values: string[]): string {
    return normalizeTerms(values).join(', ');
}

function normalizeTerms(values: string[] | undefined): string[] {
    return Array.from(
        new Set(
            (values ?? [])
                .map((value) => value.trim().toLowerCase())
                .filter((value) => value.length > 0),
        ),
    );
}

function normalizeDomain(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/^www\./, '');
}
