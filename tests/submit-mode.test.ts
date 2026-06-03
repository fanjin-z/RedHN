import { describe, expect, it } from 'vitest';
import {
    composeSubmitTitle,
    HN_SUBMIT_TITLE_LIMIT,
    parseSubmitTitle,
    prefixForSubmitSection,
} from '../src/redhn/view/submit';

describe('submit title helpers', () => {
    it('uses the Hacker News title limit', () => {
        expect(HN_SUBMIT_TITLE_LIMIT).toBe(80);
    });

    it('parses existing prefixed titles into section and editable suffix', () => {
        expect(parseSubmitTitle('Ask HN: Good question?')).toEqual({
            section: 'ask',
            editableTitle: 'Good question?',
        });
        expect(parseSubmitTitle('Show HN: My project')).toEqual({
            section: 'show',
            editableTitle: 'My project',
        });
        expect(parseSubmitTitle('A regular submission')).toEqual({
            section: 'hn',
            editableTitle: 'A regular submission',
        });
    });

    it('composes the submitted title from fixed prefix and editable suffix', () => {
        expect(composeSubmitTitle('ask', 'What should I build?')).toBe(
            'Ask HN: What should I build?',
        );
        expect(composeSubmitTitle('show', 'My project')).toBe(
            'Show HN: My project',
        );
        expect(composeSubmitTitle('hn', 'A regular submission')).toBe(
            'A regular submission',
        );
    });

    it('counts fixed prefixes as part of the submitted title', () => {
        const editableTitle = 'x'.repeat(72);
        expect(composeSubmitTitle('ask', editableTitle)).toHaveLength(80);
        expect(composeSubmitTitle('show', editableTitle)).toHaveLength(81);
    });

    it('returns fixed section prefixes for addon rendering', () => {
        expect(prefixForSubmitSection('ask')).toBe('Ask HN: ');
        expect(prefixForSubmitSection('show')).toBe('Show HN: ');
        expect(prefixForSubmitSection('hn')).toBeUndefined();
    });
});
