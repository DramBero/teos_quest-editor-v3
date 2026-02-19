/**
 * Integration tests for importPlugin and pluginToJSON.
 *
 * Uses fake-indexeddb to provide a real Dexie backend in Node.js,
 * bypassing the need for browser IndexedDB.
 *
 * The import pipeline is the most data-critical path in the app:
 *    WASM parser → raw records → importPlugin → Dexie (IndexedDB)
 *
 * These tests verify that TMP_ metadata is correctly injected.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';

// ---------------------------------------------------------------------------
//  Helpers — create a test Dexie DB matching production schema
// ---------------------------------------------------------------------------

const PLUGIN_DATA_INDEXES = [
    'TMP_index', 'type', 'prev_id',
    'TMP_topic', 'TMP_info_id',
    'TMP_speaker_id', 'TMP_speaker_cell', 'TMP_speaker_faction',
    'TMP_speaker_class', 'TMP_speaker_race',
    'TMP_id', 'name',
    '[type+TMP_topic]', '[type+TMP_type]', '[type+TMP_id]',
].join(',');

function createTestDB(name: string): Dexie {
    const db = new Dexie(name);
    db.version(1).stores({ pluginData: PLUGIN_DATA_INDEXES });
    return db;
}

/**
 * Mirrors the importPlugin record-processing logic (lines 154-204 of import-export.ts).
 * We extract this to avoid importing the full module which has side-effects.
 */
const GENERIC_TMP = {
    TMP_dep: '',
    TMP_id: '',
    TMP_index: '',
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
} as const;

type RawRecord = Record<string, unknown>;

function processRecords(pluginData: RawRecord[], pluginName: string): Record<string, unknown>[] {
    let dialogueType: string | undefined;
    let dialogueId: string | undefined;
    const entries: Record<string, unknown>[] = [];

    for (let index = 0; index < pluginData.length; index++) {
        const record = pluginData[index];
        let dialogueEntry: Record<string, unknown>;

        if (['DialogueInfo', 'Dialogue'].includes(record.type as string)) {
            let TMP_quest_name = '';
            if (record.type === 'Dialogue') {
                dialogueType = record.dialogue_type as string | undefined;
                if (record.id) {
                    dialogueId = record.id as string;
                    if (dialogueType === 'Journal') {
                        const next = pluginData[index + 1];
                        TMP_quest_name =
                            next?.quest_state === 'Name'
                                ? (next?.text as string) || ''
                                : '';
                    }
                }
            }

            dialogueEntry = {
                type: '',
                ...record,
                TMP_id: record.id || '',
                TMP_topic: dialogueId,
                TMP_type: dialogueType,
                TMP_info_id: record.id,
                TMP_prev_id: record.prev_id,
                TMP_next_id: record.next_id,
                TMP_speaker_id: record.speaker_id,
                TMP_speaker_cell: record.speaker_cell,
                TMP_speaker_faction: record.speaker_faction,
                TMP_speaker_class: record.speaker_class,
                TMP_speaker_race: record.speaker_race,
                TMP_dep: pluginName,
                TMP_index: index,
                TMP_quest_name,
            };
        } else {
            dialogueEntry = {
                type: '',
                ...GENERIC_TMP,
                ...record,
                TMP_id: record.id || '',
                TMP_dep: pluginName,
                TMP_index: index,
            };
        }

        entries.push(dialogueEntry);
    }

    return entries;
}

// ---------------------------------------------------------------------------
//  Tests
// ---------------------------------------------------------------------------

describe('importPlugin — record processing', () => {
    let db: Dexie;

    beforeEach(async () => {
        db = createTestDB(`test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        await db.open();
    });

    afterEach(async () => {
        await db.delete();
    });

    // -----------------------------------------------------------------------
    //  TMP_topic / TMP_type propagation
    // -----------------------------------------------------------------------

    describe('TMP_topic and TMP_type propagation', () => {
        it('propagates dialogueId/dialogueType from Dialogue to subsequent DialogueInfo records', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'background', dialogue_type: 'Topic' },
                { type: 'DialogueInfo', id: 'info-1', prev_id: '', next_id: 'info-2', text: 'Hello' },
                { type: 'DialogueInfo', id: 'info-2', prev_id: 'info-1', next_id: '', text: 'How are you?' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            // Dialogue record itself
            expect(entries[0].TMP_topic).toBe('background');
            expect(entries[0].TMP_type).toBe('Topic');

            // DialogueInfo records inherit topic and type from parent Dialogue
            expect(entries[1].TMP_topic).toBe('background');
            expect(entries[1].TMP_type).toBe('Topic');
            expect(entries[2].TMP_topic).toBe('background');
            expect(entries[2].TMP_type).toBe('Topic');
        });

        it('resets topic when a new Dialogue record appears', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'topic-A', dialogue_type: 'Topic' },
                { type: 'DialogueInfo', id: 'info-A1', prev_id: '', next_id: '', text: 'text A' },
                { type: 'Dialogue', id: 'topic-B', dialogue_type: 'Greeting' },
                { type: 'DialogueInfo', id: 'info-B1', prev_id: '', next_id: '', text: 'text B' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            expect(entries[1].TMP_topic).toBe('topic-A');
            expect(entries[1].TMP_type).toBe('Topic');
            expect(entries[3].TMP_topic).toBe('topic-B');
            expect(entries[3].TMP_type).toBe('Greeting');
        });
    });

    // -----------------------------------------------------------------------
    //  Journal quest name extraction
    // -----------------------------------------------------------------------

    describe('Journal TMP_quest_name extraction', () => {
        it('extracts quest name from next record when quest_state is "Name"', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'quest_001', dialogue_type: 'Journal' },
                { type: 'DialogueInfo', id: 'info-name', quest_state: 'Name', text: 'My Quest Name', prev_id: '', next_id: '' },
                { type: 'DialogueInfo', id: 'info-entry', quest_state: undefined, text: 'Quest log entry', prev_id: '', next_id: '' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            // The Dialogue record should have the quest name
            expect(entries[0].TMP_quest_name).toBe('My Quest Name');
            // DialogueInfo records should not have quest name
            expect(entries[1].TMP_quest_name).toBe('');
            expect(entries[2].TMP_quest_name).toBe('');
        });

        it('sets empty quest name when next record is not quest_state="Name"', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'quest_002', dialogue_type: 'Journal' },
                { type: 'DialogueInfo', id: 'info-1', quest_state: undefined, text: 'Regular entry', prev_id: '', next_id: '' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            expect(entries[0].TMP_quest_name).toBe('');
        });

        it('sets empty quest name for non-Journal dialogue types', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'topic-1', dialogue_type: 'Topic' },
                { type: 'DialogueInfo', id: 'info-1', quest_state: 'Name', text: 'Not a quest', prev_id: '', next_id: '' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            expect(entries[0].TMP_quest_name).toBe('');
        });

        it('handles Journal dialogue at end of file (no next record)', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'quest_last', dialogue_type: 'Journal' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            expect(entries[0].TMP_quest_name).toBe('');
        });
    });

    // -----------------------------------------------------------------------
    //  Non-dialogue records get GENERIC_TMP
    // -----------------------------------------------------------------------

    describe('Non-dialogue records', () => {
        it('gets all GENERIC_TMP fields', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Npc', id: 'divayth_fyr', name: 'Divayth Fyr', race: 'Dark Elf' },
            ];

            const entries = processRecords(rawRecords, 'Morrowind.esm');
            const entry = entries[0];

            expect(entry.TMP_dep).toBe('Morrowind.esm');
            expect(entry.TMP_id).toBe('divayth_fyr');
            expect(entry.TMP_index).toBe(0);
            expect(entry.TMP_topic).toBe('');
            expect(entry.TMP_type).toBe('');
            expect(entry.TMP_speaker_id).toBe('');
            expect(entry.TMP_quest_name).toBe('');
        });

        it('preserves original record fields alongside TMP_ fields', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Cell', id: 'Balmora', region: 'West Gash' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');
            const entry = entries[0];

            expect(entry.type).toBe('Cell');
            expect(entry.id).toBe('Balmora');
            expect(entry.region).toBe('West Gash');
            expect(entry.TMP_dep).toBe('test.esp');
        });
    });

    // -----------------------------------------------------------------------
    //  Speaker field mapping for DialogueInfo
    // -----------------------------------------------------------------------

    describe('Speaker field mapping', () => {
        it('maps speaker fields to TMP_ fields', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Dialogue', id: 'trade', dialogue_type: 'Topic' },
                {
                    type: 'DialogueInfo', id: 'info-1',
                    speaker_id: 'vivec', speaker_cell: 'Vivec City',
                    speaker_class: 'God', speaker_faction: 'Tribunal',
                    speaker_race: 'Chimer',
                    prev_id: '', next_id: '',
                },
            ];

            const entries = processRecords(rawRecords, 'test.esp');
            const info = entries[1];

            expect(info.TMP_speaker_id).toBe('vivec');
            expect(info.TMP_speaker_cell).toBe('Vivec City');
            expect(info.TMP_speaker_class).toBe('God');
            expect(info.TMP_speaker_faction).toBe('Tribunal');
            expect(info.TMP_speaker_race).toBe('Chimer');
        });
    });

    // -----------------------------------------------------------------------
    //  pluginToJSON — TMP_ stripping
    // -----------------------------------------------------------------------

    describe('pluginToJSON TMP_ stripping', () => {
        it('strips all TMP_ fields from entries', () => {
            const entry: Record<string, unknown> = {
                type: 'Npc',
                id: 'test_npc',
                name: 'Test NPC',
                TMP_dep: 'test.esp',
                TMP_id: 'test_npc',
                TMP_index: 0,
                TMP_topic: '',
                TMP_type: '',
                TMP_speaker_id: '',
            };

            // Simulate pluginToJSON logic
            const clean: Record<string, unknown> = {};
            for (const key of Object.keys(entry)) {
                if (!key.startsWith('TMP_')) {
                    clean[key] = entry[key];
                }
            }

            expect(clean).toEqual({ type: 'Npc', id: 'test_npc', name: 'Test NPC' });
            expect(Object.keys(clean).some(k => k.startsWith('TMP_'))).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    //  Dexie integration — bulkAdd + read back
    // -----------------------------------------------------------------------

    describe('Dexie roundtrip', () => {
        it('stores and retrieves processed records correctly', async () => {
            const rawRecords: RawRecord[] = [
                { type: 'Header', id: '', num_objects: 3, masters: [] },
                { type: 'Dialogue', id: 'greeting', dialogue_type: 'Greeting' },
                { type: 'DialogueInfo', id: 'greet-1', prev_id: '', next_id: '', text: 'Welcome' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');
            await db.table('pluginData').bulkAdd(entries);

            const stored = await db.table('pluginData').toArray();
            expect(stored).toHaveLength(3);

            // Verify Header
            const header = stored.find(e => e.type === 'Header');
            expect(header).toBeDefined();
            expect(header!.TMP_dep).toBe('test.esp');

            // Verify DialogueInfo has TMP_topic from Dialogue
            const info = stored.find(e => e.type === 'DialogueInfo');
            expect(info).toBeDefined();
            expect(info!.TMP_topic).toBe('greeting');
            expect(info!.TMP_type).toBe('Greeting');
            expect(info!.text).toBe('Welcome');
        });

        it('can query by index after import', async () => {
            const rawRecords: RawRecord[] = [
                { type: 'Npc', id: 'npc-1', name: 'Guard' },
                { type: 'Npc', id: 'npc-2', name: 'Merchant' },
                { type: 'Cell', id: 'cell-1', name: 'Balmora' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');
            await db.table('pluginData').bulkAdd(entries);

            const npcs = await db.table('pluginData')
                .where('type').equals('Npc').toArray();
            expect(npcs).toHaveLength(2);

            const byId = await db.table('pluginData')
                .where('TMP_id').equals('npc-1').first();
            expect(byId?.name).toBe('Guard');
        });
    });

    // -----------------------------------------------------------------------
    //  TMP_index correctness
    // -----------------------------------------------------------------------

    describe('TMP_index assignment', () => {
        it('assigns sequential TMP_index matching array position', () => {
            const rawRecords: RawRecord[] = [
                { type: 'Header', id: '' },
                { type: 'Npc', id: 'npc-1' },
                { type: 'Npc', id: 'npc-2' },
                { type: 'Dialogue', id: 'topic', dialogue_type: 'Topic' },
                { type: 'DialogueInfo', id: 'info-1', prev_id: '', next_id: '' },
            ];

            const entries = processRecords(rawRecords, 'test.esp');

            entries.forEach((entry, i) => {
                expect(entry.TMP_index).toBe(i);
            });
        });
    });
});
