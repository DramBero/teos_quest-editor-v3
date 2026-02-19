import { describe, it, expect } from 'vitest';
import type {
    TES3_DialogueInfo,
    TES3_Dialogue,
    TES3_Header,
    DialogueType,
    QuestState,
    Sex,
    FilterType,
    FilterFunction,
    FilterComparison,
} from '@/types/tes3';
import type { BaseEntry, InfoEntry, DialogueEntry } from '@/types/pluginEntries';

// ---------------------------------------------------------------------------
//  Type shape validation — ensures TS types match WASM parser output
// ---------------------------------------------------------------------------

describe('TES3 type shapes', () => {
    it('DialogueInfo has all expected fields', () => {
        // Simulate a DialogueInfo record from the WASM parser
        const info: TES3_DialogueInfo = {
            id: 'test-id',
            prev_id: '',
            next_id: '',
            data: {
                dialogue_type: 'Topic',
                disposition: 0,
                speaker_rank: -1,
                speaker_sex: 'Any',
                player_rank: -1,
            },
            speaker_id: '',
            speaker_race: '',
            speaker_class: '',
            speaker_faction: '',
            speaker_cell: '',
            player_faction: '',
            text: 'Hello there',
            sound_path: '',
            quest_state: undefined,
            script_text: '',
            filters: [],
        };

        expect(info.id).toBe('test-id');
        expect(info.data.dialogue_type).toBe('Topic');
        expect(info.text).toBe('Hello there');
        expect(info.filters).toEqual([]);
    });

    it('Dialogue has required fields', () => {
        const dialogue: TES3_Dialogue = {
            id: 'combat taunt',
            dialogue_type: 'Topic',
        };

        expect(dialogue.id).toBe('combat taunt');
        expect(dialogue.dialogue_type).toBe('Topic');
    });

    it('BaseEntry includes TMP_ fields', () => {
        const entry: BaseEntry = {
            type: 'DialogueInfo',
            TMP_index: 42,
            TMP_dep: 'Morrowind.esm',
            TMP_id: 'test',
            TMP_info_id: '',
            TMP_next_id: '',
            TMP_prev_id: '',
            TMP_quest_name: '',
            TMP_speaker_cell: '',
            TMP_speaker_class: '',
            TMP_speaker_faction: '',
            TMP_speaker_id: '',
            TMP_speaker_race: '',
            TMP_topic: '',
            TMP_type: '',
        };

        expect(entry.TMP_index).toBe(42);
        expect(entry.TMP_dep).toBe('Morrowind.esm');
        expect(entry.type).toBe('DialogueInfo');
    });

    it('InfoEntry combines BaseEntry + TES3_DialogueInfo', () => {
        const info: InfoEntry = {
            // BaseEntry fields
            type: 'DialogueInfo',
            TMP_index: 1,
            TMP_dep: 'test.esp',
            TMP_id: 'id-1',
            TMP_info_id: '',
            TMP_next_id: '',
            TMP_prev_id: '',
            TMP_quest_name: '',
            TMP_speaker_cell: '',
            TMP_speaker_class: '',
            TMP_speaker_faction: '',
            TMP_speaker_id: '',
            TMP_speaker_race: '',
            TMP_topic: '',
            TMP_type: '',
            // TES3_DialogueInfo fields
            id: 'id-1',
            prev_id: '',
            next_id: '',
            data: {
                dialogue_type: 'Journal',
                disposition: 10,
                speaker_rank: -1,
                speaker_sex: 'Male',
                player_rank: -1,
            },
            speaker_id: '',
            speaker_race: '',
            speaker_class: '',
            speaker_faction: '',
            speaker_cell: '',
            player_faction: '',
            text: 'quest entry text',
            sound_path: '',
            quest_state: 'Name',
            script_text: '',
            filters: [],
        };

        expect(info.type).toBe('DialogueInfo');
        expect(info.text).toBe('quest entry text');
        expect(info.data.disposition).toBe(10);
        expect(info.quest_state).toBe('Name');
    });
});

// ---------------------------------------------------------------------------
//  Enum value tests
// ---------------------------------------------------------------------------

describe('TES3 enum values', () => {
    it('DialogueType covers all valid values', () => {
        const types: DialogueType[] = [
            'Topic', 'Voice', 'Greeting', 'Persuasion', 'Journal',
        ];
        expect(types).toHaveLength(5);
    });

    it('QuestState covers all valid values', () => {
        const states: QuestState[] = [
            'Name', 'Finished', 'Restart', undefined,
        ];
        expect(states).toHaveLength(4);
    });

    it('Sex covers all valid values', () => {
        const sexes: Sex[] = ['Male', 'Female', 'Any'];
        expect(sexes).toHaveLength(3);
    });

    it('FilterType covers all valid values', () => {
        const filterTypes: FilterType[] = [
            'Function', 'Global', 'Local', 'Journal',
            'Item', 'Dead', 'NotId', 'NotFaction',
            'NotClass', 'NotRace', 'NotCell', 'NotLocal',
        ];
        expect(filterTypes).toHaveLength(12);
    });
});
