export type RedhnTheme = 'system' | 'light' | 'dark';

export type RedhnPreferences = {
    theme: RedhnTheme;
    fontSize: number;
    lineHeight: number;
    maxWidth: number;
};

export const defaultPreferences: RedhnPreferences = {
    theme: 'system',
    fontSize: 14,
    lineHeight: 1.45,
    maxWidth: 1280,
};

export function normalizePreferences(
    preferences: Partial<RedhnPreferences> | undefined,
): RedhnPreferences {
    return {
        fontSize: clamp(
            preferences?.fontSize,
            12,
            20,
            defaultPreferences.fontSize,
        ),
        lineHeight: clamp(
            preferences?.lineHeight,
            1.2,
            1.9,
            defaultPreferences.lineHeight,
        ),
        maxWidth: clamp(
            preferences?.maxWidth,
            720,
            1600,
            defaultPreferences.maxWidth,
        ),
        theme:
            preferences?.theme === 'dark' ||
            preferences?.theme === 'light' ||
            preferences?.theme === 'system'
                ? preferences.theme
                : defaultPreferences.theme,
    };
}

function clamp(
    value: number | undefined,
    min: number,
    max: number,
    fallback: number,
): number {
    if (value === undefined || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, value));
}
