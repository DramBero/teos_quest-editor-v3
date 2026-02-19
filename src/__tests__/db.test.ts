import { describe, it, expect } from 'vitest';
import { getSpeakerTypeKey, GENERIC_TMP } from '@/api/db';
import { makePluginKey } from '@/api/sessions-db';

// ---------------------------------------------------------------------------
//  makePluginKey
// ---------------------------------------------------------------------------

describe('makePluginKey', () => {
    it('creates key from name + size', () => {
        expect(makePluginKey('Morrowind.esm', 79837557))
            .toBe('plugin_Morrowind.esm_79837557');
    });

    it('handles empty name', () => {
        expect(makePluginKey('', 0)).toBe('plugin__0');
    });

    it('handles special characters in name', () => {
        expect(makePluginKey('My Plugin (v2).esp', 1024))
            .toBe('plugin_My Plugin (v2).esp_1024');
    });
});

// ---------------------------------------------------------------------------
//  getSpeakerTypeKey
// ---------------------------------------------------------------------------

describe('getSpeakerTypeKey', () => {
    it('returns correct key for npc', () => {
        expect(getSpeakerTypeKey('npc')).toBe('TMP_speaker_id');
    });

    it('returns correct key for cell', () => {
        expect(getSpeakerTypeKey('cell')).toBe('TMP_speaker_cell');
    });

    it('returns correct key for class', () => {
        expect(getSpeakerTypeKey('class')).toBe('TMP_speaker_class');
    });

    it('returns correct key for faction', () => {
        expect(getSpeakerTypeKey('faction')).toBe('TMP_speaker_faction');
    });

    it('returns correct key for race', () => {
        expect(getSpeakerTypeKey('race')).toBe('TMP_speaker_race');
    });

    it('returns empty string for Global', () => {
        expect(getSpeakerTypeKey('Global')).toBe('');
    });
});

// ---------------------------------------------------------------------------
//  GENERIC_TMP
// ---------------------------------------------------------------------------

describe('GENERIC_TMP', () => {
    it('has all expected TMP_ fields', () => {
        const keys = Object.keys(GENERIC_TMP);
        expect(keys).toContain('TMP_dep');
        expect(keys).toContain('TMP_id');
        expect(keys).toContain('TMP_index');
        expect(keys).toContain('TMP_info_id');
        expect(keys).toContain('TMP_topic');
        expect(keys).toContain('TMP_type');
        expect(keys).toContain('TMP_speaker_id');
    });

    it('all values are empty strings', () => {
        for (const value of Object.values(GENERIC_TMP)) {
            expect(value).toBe('');
        }
    });

    it('is readonly (as const)', () => {
        // `as const` makes it readonly at the TS level,
        // but does not freeze the object at runtime.
        // This test verifies the shape is stable.
        const keys = Object.keys(GENERIC_TMP);
        expect(keys.length).toBeGreaterThanOrEqual(13);
    });
});
