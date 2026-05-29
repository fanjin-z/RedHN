import type { ParsedProfile } from '../hn/types';

export function formatNumber(value: number | undefined): string {
    return value === undefined
        ? '-'
        : new Intl.NumberFormat('en-US').format(value);
}

export function formatProfileDate(profile: ParsedProfile): string {
    return profile.createdAt
        ? formatUnixDate(profile.createdAt)
        : (profile.created ?? '-');
}

export function formatUnixDate(value: number): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value * 1000));
}
