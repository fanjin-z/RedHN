import { describe, expect, it } from 'vitest';
import {
    composeSubmitTitle,
    parseSubmitTitle,
    prefixForSubmitSection,
    type SubmitSection,
} from '../src/redhn/view/submit';

describe('submit title helpers', () => {
    it('round-trips titles and prefixes for each submit section', () => {
        const cases: Array<{
            section: SubmitSection;
            editableTitle: string;
            submittedTitle: string;
            prefix?: string;
        }> = [
            {
                section: 'ask',
                editableTitle: 'A focused question?',
                submittedTitle: 'Ask HN: A focused question?',
                prefix: 'Ask HN: ',
            },
            {
                section: 'show',
                editableTitle: 'A sample project',
                submittedTitle: 'Show HN: A sample project',
                prefix: 'Show HN: ',
            },
            {
                section: 'hn',
                editableTitle: 'A regular submission',
                submittedTitle: 'A regular submission',
            },
        ];

        for (const testCase of cases) {
            expect(parseSubmitTitle(testCase.submittedTitle)).toEqual({
                section: testCase.section,
                editableTitle: testCase.editableTitle,
            });
            expect(
                composeSubmitTitle(testCase.section, testCase.editableTitle),
            ).toBe(testCase.submittedTitle);
            expect(prefixForSubmitSection(testCase.section)).toBe(
                testCase.prefix,
            );
        }
    });
});
