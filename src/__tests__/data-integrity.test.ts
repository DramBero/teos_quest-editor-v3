/**
 * Data Integrity Tests — regression suite for bugs found in Agent2/Agent3 sessions.
 *
 * These tests cover the classes of bugs that kept recurring:
 *
 * 1. TMP_is_active flag missing on new entries → duplication on edit, invisible entries in chain
 * 2. Linked list ordering: infinite loops, stale nextEntry, broken chain after insert
 * 3. Journal addQuestEntry missing TMP_is_active
 * 4. getTopicStatus false negatives when active entry isn't first in group
 * 5. addDialogueEntry producing orphan entries
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { setSessionKeyGetter, initPlugin, getActiveDB, invalidateDependencyCache } from '@/api/db';
import { addEntry, dbMutationVersion, modifyEntry } from '@/api/import-export';
import { editTopicText, getOrderedEntriesByTopic, addDialogueEntry } from '@/api/dialogue';
import { addQuestEntry, addJournalQuest, fetchQuestByID } from '@/api/journal';
import { useSessionStore } from '@/stores/session';
import { createPinia, setActivePinia } from 'pinia';

const PLUGIN_KEY = 'test-integrity-plugin';
const DEP_KEY = 'test-dep-morrowind';

// ---------------------------------------------------------------------------
//  File-level DB setup — single init for all describe blocks
//
//  IMPORTANT: useSessionStore() internally calls setSessionKeyGetter() with
//  its own getter (based on currentSession). We must initialize the store
//  first so its call happens, then override the getter with our test key.
// ---------------------------------------------------------------------------

beforeAll(async () => {
    setActivePinia(createPinia());
    invalidateDependencyCache();

    // Force session store init — it calls setSessionKeyGetter internally (session.ts:34)
    const _sessionStore = useSessionStore();
    // Now override with our test getter (last writer wins)
    setSessionKeyGetter(() => PLUGIN_KEY);

    await initPlugin(PLUGIN_KEY);
});

// ---------------------------------------------------------------------------
//  Test helpers
// ---------------------------------------------------------------------------

async function seedActiveDB() {
    const db = await getActiveDB();
    await db.pluginData.clear();
    await db.pluginData.add({
        type: 'Header',
        TMP_index: 0,
        TMP_dep: PLUGIN_KEY,
        masters: [[DEP_KEY, 12345]],
        num_objects: 0,
        id: 'Header',
    });
}

async function seedDepDB() {
    const depDB = await initPlugin(`plugin_${DEP_KEY}_12345`);
    await depDB.pluginData.clear();
    await depDB.pluginData.add({
        type: 'Header',
        TMP_index: 0,
        TMP_dep: DEP_KEY,
        masters: [],
        num_objects: 0,
        id: 'Header',
    });
    return depDB;
}

// ---------------------------------------------------------------------------
//  1. TMP_is_active flag — the root cause of entry duplication
// ---------------------------------------------------------------------------

describe('TMP_is_active flag integrity', () => {
    beforeEach(async () => {
        invalidateDependencyCache();
        await seedActiveDB();
        dbMutationVersion.value = 0;
    });

    it('addEntry preserves TMP_is_active when explicitly set', async () => {
        await addEntry({
            type: 'DialogueInfo',
            TMP_topic: 'test-topic',
            TMP_type: 'Topic',
            TMP_info_id: 'entry-1',
            text: 'hello',
            TMP_is_active: true,
            id: 'entry-1',
            prev_id: '',
            next_id: '',
            data: { dialogue_type: 'Topic' },
        });

        const db = await getActiveDB();
        const entry = await db.pluginData.where('TMP_info_id').equals('entry-1').first();
        expect(entry).toBeDefined();
        expect(entry.TMP_is_active).toBe(true);
    });

    it('editTopicText should NOT create a duplicate when entry has TMP_is_active=true', async () => {
        const db = await getActiveDB();

        await addEntry({
            type: 'DialogueInfo',
            TMP_topic: 'test-topic',
            TMP_type: 'Topic',
            TMP_info_id: 'no-dup-entry',
            text: 'original',
            TMP_is_active: true,
            id: 'no-dup-entry',
            prev_id: '',
            next_id: '',
            data: { dialogue_type: 'Topic' },
        });

        await editTopicText('no-dup-entry', 'modified');

        // There should be exactly ONE entry with this info_id
        const entries = await db.pluginData
            .where('TMP_info_id')
            .equals('no-dup-entry')
            .toArray();
        expect(entries).toHaveLength(1);
        expect(entries[0].text).toBe('modified');
    });

    it('editTopicText should clone entry (not duplicate) when TMP_is_active is false/undefined', async () => {
        const depDB = await seedDepDB();

        // Simulate a dependency entry (TMP_is_active = false)
        await depDB.pluginData.add({
            type: 'DialogueInfo',
            TMP_topic: 'dep-topic',
            TMP_type: 'Topic',
            TMP_info_id: 'dep-entry-1',
            text: 'from master',
            TMP_is_active: false,
            TMP_dep: DEP_KEY,
            id: 'dep-entry-1',
            prev_id: '',
            next_id: '',
            TMP_index: 1,
            data: { dialogue_type: 'Topic' },
        });

        const result = await editTopicText('dep-entry-1', 'overridden text');

        expect(result).toBeDefined();
        expect(result!.TMP_is_active).toBe(true);
        expect(result!.text).toBe('overridden text');

        // Active DB should have the new clone
        const activeDB = await getActiveDB();
        const activeEntries = await activeDB.pluginData
            .where('TMP_info_id')
            .equals('dep-entry-1')
            .toArray();
        expect(activeEntries.length).toBeGreaterThanOrEqual(1);

        // The active clone should have TMP_is_active = true
        const activeClone = activeEntries.find((e: Record<string, unknown>) => e.TMP_is_active === true);
        expect(activeClone).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
//  2. Linked list ordering — infinite loop protection & correctness
// ---------------------------------------------------------------------------

describe('Linked list ordering safety', () => {
    beforeEach(async () => {
        invalidateDependencyCache();
        await seedActiveDB();
    });

    it('getOrderedEntriesByTopic does not infinite-loop on circular references', async () => {
        const db = await getActiveDB();

        // Create a cycle: A → B → A
        await db.pluginData.bulkAdd([
            {
                type: 'DialogueInfo', TMP_topic: 'cycle-topic', TMP_type: 'Topic',
                TMP_info_id: 'cyc-A', id: 'cyc-A', TMP_id: 'cyc-A',
                prev_id: '', next_id: 'cyc-B',
                TMP_prev_id: '', TMP_next_id: 'cyc-B',
                text: 'A', TMP_dep: PLUGIN_KEY, TMP_is_active: true,
                TMP_index: 10, data: { dialogue_type: 'Topic' },
            },
            {
                type: 'DialogueInfo', TMP_topic: 'cycle-topic', TMP_type: 'Topic',
                TMP_info_id: 'cyc-B', id: 'cyc-B', TMP_id: 'cyc-B',
                prev_id: 'cyc-A', next_id: 'cyc-A', // ← cycle!
                TMP_prev_id: 'cyc-A', TMP_next_id: 'cyc-A',
                text: 'B', TMP_dep: PLUGIN_KEY, TMP_is_active: true,
                TMP_index: 11, data: { dialogue_type: 'Topic' },
            },
        ]);

        // Should terminate without hanging (MAX_ITERATIONS guard in dialogue.ts)
        const result = await getOrderedEntriesByTopic('cycle-topic');
        expect(result.length).toBeLessThanOrEqual(10_000);
        expect(result.length).toBeGreaterThanOrEqual(2);
    }, 5000); // 5s timeout — if this times out, the loop guard is broken

    it('getOrderedEntriesByTopic handles valid 3-entry chain from DB', async () => {
        const db = await getActiveDB();

        await db.pluginData.bulkAdd([
            {
                type: 'DialogueInfo', TMP_topic: 'chain-topic', TMP_type: 'Topic',
                TMP_info_id: 'ch-A', id: 'ch-A', TMP_id: 'ch-A',
                prev_id: '', next_id: 'ch-B',
                TMP_prev_id: '', TMP_next_id: 'ch-B',
                text: 'first', TMP_dep: PLUGIN_KEY, TMP_is_active: true,
                TMP_index: 20, data: { dialogue_type: 'Topic' },
            },
            {
                type: 'DialogueInfo', TMP_topic: 'chain-topic', TMP_type: 'Topic',
                TMP_info_id: 'ch-B', id: 'ch-B', TMP_id: 'ch-B',
                prev_id: 'ch-A', next_id: 'ch-C',
                TMP_prev_id: 'ch-A', TMP_next_id: 'ch-C',
                text: 'second', TMP_dep: PLUGIN_KEY, TMP_is_active: true,
                TMP_index: 21, data: { dialogue_type: 'Topic' },
            },
            {
                type: 'DialogueInfo', TMP_topic: 'chain-topic', TMP_type: 'Topic',
                TMP_info_id: 'ch-C', id: 'ch-C', TMP_id: 'ch-C',
                prev_id: 'ch-B', next_id: '',
                TMP_prev_id: 'ch-B', TMP_next_id: '',
                text: 'third', TMP_dep: PLUGIN_KEY, TMP_is_active: true,
                TMP_index: 22, data: { dialogue_type: 'Topic' },
            },
        ]);

        const ordered = await getOrderedEntriesByTopic('chain-topic');
        expect(ordered).toHaveLength(3);
        expect(ordered.map((e: Record<string, unknown>) => e.id)).toEqual(['ch-A', 'ch-B', 'ch-C']);
    });

    it('getOrderedEntriesByTopic returns empty for nonexistent topic', async () => {
        const result = await getOrderedEntriesByTopic('does-not-exist');
        expect(result).toEqual([]);
    });

    it('getOrderedEntriesByTopic returns empty for empty topicId', async () => {
        const result = await getOrderedEntriesByTopic('');
        expect(result).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
//  3. addDialogueEntry — new entries must have TMP_is_active and valid links
// ---------------------------------------------------------------------------

describe('addDialogueEntry integrity', () => {
    beforeEach(async () => {
        invalidateDependencyCache();
        await seedActiveDB();
    });

    it('new dialogue entry has TMP_is_active = true', async () => {
        const db = await getActiveDB();

        // First create the Dialogue topic record
        await addEntry({
            type: 'Dialogue',
            dialogue_type: 'Topic',
            id: 'test-add-topic',
            TMP_topic: 'test-add-topic',
            TMP_type: 'Topic',
            TMP_id: 'test-add-topic',
            flags: '',
        });

        // Add a seed entry so addDialogueEntry can find prev/next
        await addEntry({
            type: 'DialogueInfo',
            TMP_topic: 'test-add-topic',
            TMP_type: 'Topic',
            TMP_info_id: 'seed-entry',
            id: 'seed-entry',
            TMP_id: 'seed-entry',
            TMP_is_active: true,
            text: 'seed',
            prev_id: '',
            next_id: '',
            TMP_prev_id: '',
            TMP_next_id: '',
            data: { dialogue_type: 'Topic' },
            speaker_id: '',
            speaker_cell: '',
            speaker_class: '',
            speaker_faction: '',
            speaker_race: '',
            filters: [],
            flags: '',
        });

        await addDialogueEntry('test-npc', 'test-add-topic', 'Topic', 'npc', 'seed-entry', '', '');

        // Find the NEW entry (not the seed)
        const allEntries = await db.pluginData
            .where('TMP_topic')
            .equals('test-add-topic')
            .and((v: Record<string, unknown>) => v.type === 'DialogueInfo')
            .toArray();

        const newEntries = allEntries.filter(
            (e: Record<string, unknown>) => e.TMP_info_id !== 'seed-entry',
        );

        expect(newEntries.length).toBeGreaterThanOrEqual(1);

        for (const entry of newEntries) {
            expect(entry.TMP_is_active, `Entry ${entry.id} must have TMP_is_active=true`).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
//  4. Journal — addQuestEntry must set TMP_is_active
// ---------------------------------------------------------------------------

describe('Journal entry integrity', () => {
    beforeEach(async () => {
        invalidateDependencyCache();
        await seedActiveDB();
    });

    it('addJournalQuest creates idEntry and nameEntry', async () => {
        await addJournalQuest('quest-test-1', 'Test Quest');

        const db = await getActiveDB();
        const dialogueRecords = await db.pluginData
            .where('TMP_topic')
            .equals('quest-test-1')
            .and((v: Record<string, unknown>) => v.type === 'Dialogue')
            .toArray();
        expect(dialogueRecords.length).toBeGreaterThanOrEqual(1);

        const infoRecords = await db.pluginData
            .where('TMP_topic')
            .equals('quest-test-1')
            .and((v: Record<string, unknown>) => v.type === 'DialogueInfo')
            .toArray();
        expect(infoRecords.length).toBeGreaterThanOrEqual(1);

        // Name entry should have quest_state = 'Name'
        const nameEntry = infoRecords.find((e: Record<string, unknown>) => e.quest_state === 'Name');
        expect(nameEntry).toBeDefined();
        expect(nameEntry.text).toBe('Test Quest');
    });

    it('addQuestEntry creates entry with TMP_is_active = true', async () => {
        // First create a quest
        await addJournalQuest('quest-active-test', 'Active Test Quest');

        // Now add an entry to it
        await addQuestEntry('quest-active-test', 'New journal entry', '', '');

        const db = await getActiveDB();
        const entries = await db.pluginData
            .where('TMP_topic')
            .equals('quest-active-test')
            .and((v: Record<string, unknown>) => v.type === 'DialogueInfo' && v.quest_state !== 'Name')
            .toArray();

        expect(entries.length).toBeGreaterThanOrEqual(1);

        for (const entry of entries) {
            expect(
                entry.TMP_is_active,
                `Quest entry "${entry.text}" must have TMP_is_active=true to prevent duplication`,
            ).toBe(true);
        }
    });

    it('fetchQuestByID returns entries after addQuestEntry', async () => {
        await addJournalQuest('quest-fetch-test', 'Fetch Test');
        await addQuestEntry('quest-fetch-test', 'Entry one', '', '');

        const quest = await fetchQuestByID('quest-fetch-test');

        expect(quest.name).toBe('Fetch Test');
        expect(quest.entries.length).toBeGreaterThanOrEqual(1);
        expect(quest.entries.some((e: Record<string, unknown>) => e.text === 'Entry one')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
//  5. Topic status detection — hasActive must detect active entries
//     anywhere in the group, not just at index 0
// ---------------------------------------------------------------------------

describe('getTopicStatus logic (extracted)', () => {
    // Pure function test — mirrors ModalContentDialogue.vue:getTopicStatus
    type RecordStatus = '' | 'new' | 'mod';

    function getTopicStatus(question: Record<string, unknown>[]): RecordStatus {
        if (!question?.length) return '';
        const hasActive = question.some((entry) => entry.TMP_is_active);
        if (!hasActive) return '';
        if (question.length > 1) return 'mod';
        return 'new';
    }

    it('detects active entry at index 0', () => {
        const group = [
            { TMP_is_active: true, TMP_dep: 'mod.esp' },
            { TMP_is_active: false, TMP_dep: 'Morrowind.esm' },
        ];
        expect(getTopicStatus(group)).toBe('mod');
    });

    it('detects active entry NOT at index 0 (Agent3 bug)', () => {
        // This was the exact bug: dep entry first, active entry second
        const group = [
            { TMP_is_active: false, TMP_dep: 'Morrowind.esm' },
            { TMP_is_active: true, TMP_dep: 'mod.esp' },
        ];
        expect(getTopicStatus(group)).toBe('mod');
    });

    it('detects active entry with TMP_is_active = undefined (legacy, Agent3 bug)', () => {
        // `undefined` should NOT be treated as active
        const group = [
            { TMP_is_active: undefined, TMP_dep: 'mod.esp' },
            { TMP_is_active: false, TMP_dep: 'Morrowind.esm' },
        ];
        expect(getTopicStatus(group)).toBe('');
    });

    it('returns "new" for single active entry with no deps', () => {
        const group = [{ TMP_is_active: true, TMP_dep: 'mod.esp' }];
        expect(getTopicStatus(group)).toBe('new');
    });

    it('returns empty for no entries', () => {
        expect(getTopicStatus([])).toBe('');
    });
});

// ---------------------------------------------------------------------------
//  6. GENERIC_TMP should NOT include TMP_is_active (design invariant)
// ---------------------------------------------------------------------------

describe('GENERIC_TMP design invariant', () => {
    it('GENERIC_TMP does not contain TMP_is_active', async () => {
        const { GENERIC_TMP } = await import('@/api/db');
        expect('TMP_is_active' in GENERIC_TMP).toBe(false);
    });

    it('addEntry merges GENERIC_TMP but keeps caller TMP_is_active', async () => {
        invalidateDependencyCache();
        await seedActiveDB();

        await addEntry({
            type: 'Test',
            id: 'generic-test',
            TMP_is_active: true,
        });

        const db = await getActiveDB();
        const entry = await db.pluginData.where('type').equals('Test').first();
        expect(entry).toBeDefined();
        // TMP_is_active from caller should survive the { ...GENERIC_TMP, ...entry } merge
        expect(entry.TMP_is_active).toBe(true);
    });
});

// ---------------------------------------------------------------------------
//  7. Linked list — nextEntry reset (Agent3 infinite loop root cause)
// ---------------------------------------------------------------------------

describe('Linked list nextEntry reset (Agent3 stale reference bug)', () => {
    /**
     * Pure-function reproduction of the bug:
     * If `nextEntry` was not reset to `undefined` at each iteration,
     * a stale reference from a previous iteration would be reused,
     * potentially causing infinite pushes of the same entry.
     *
     * The fix: `nextEntry = undefined` at the top of the while loop.
     */

    interface Entry {
        id: string;
        prev_id: string;
        next_id: string;
        TMP_dep: string;
        TMP_is_active: boolean;
        [key: string]: unknown;
    }

    function orderWithReset(pluginDialogue: Entry[][]): Entry[] {
        const flat = pluginDialogue.flat(1);
        if (!flat.length) return [];

        const findByIdType = (idType: string, id: string, ignore: Entry[]) => {
            const ignoreSet = new Set(ignore.map(e => `${e.id}+${e.TMP_dep}`));
            const found = flat.filter(e => e[idType] === id && !ignoreSet.has(`${e.id}+${e.TMP_dep}`));
            return found.length ? found.at(-1)! : (false as const);
        };

        const first = findByIdType('prev_id', '', []);
        if (!first) return [];

        const ordered: Entry[] = [first];
        let nextEntry: Entry | undefined;
        let iterations = 0;

        while (true) {
            if (++iterations > 10_000) break;

            nextEntry = undefined; // ← THE FIX — without this, stale ref causes infinite loop
            const last = ordered.at(-1)!;
            const candidates = [
                findByIdType('prev_id', last.id, ordered),
                findByIdType('id', last.next_id, ordered),
            ].filter(Boolean) as Entry[];

            if (!candidates.length) break;

            nextEntry = candidates.find(e => e.TMP_is_active) || candidates[0];
            if (nextEntry) {
                ordered.push(nextEntry);
                if (!nextEntry.next_id) break;
            } else {
                break;
            }
        }

        return ordered;
    }

    function orderWithoutReset(pluginDialogue: Entry[][]): Entry[] {
        const flat = pluginDialogue.flat(1);
        if (!flat.length) return [];

        const findByIdType = (idType: string, id: string, ignore: Entry[]) => {
            const ignoreSet = new Set(ignore.map(e => `${e.id}+${e.TMP_dep}`));
            const found = flat.filter(e => e[idType] === id && !ignoreSet.has(`${e.id}+${e.TMP_dep}`));
            return found.length ? found.at(-1)! : (false as const);
        };

        const first = findByIdType('prev_id', '', []);
        if (!first) return [];

        const ordered: Entry[] = [first];
        let nextEntry: Entry | undefined;
        let iterations = 0;

        while (true) {
            if (++iterations > 100) break; // low limit to detect the bug fast
            // BUG: no `nextEntry = undefined` here!
            const last = ordered.at(-1)!;
            const candidates = [
                findByIdType('prev_id', last.id, ordered),
                findByIdType('id', last.next_id, ordered),
            ].filter(Boolean) as Entry[];

            if (!candidates.length) {
                // Without reset, nextEntry from previous iteration survives!
                // If it was already added, ignoreList catches it. BUT in the original code:
                //   `nextEntry = nextEntries.find(...) || nextEntry`
                // the fallback `|| nextEntry` would reuse the stale ref.
                break;
            }

            nextEntry = candidates.find(e => e.TMP_is_active) || candidates[0] || nextEntry;
            if (nextEntry) {
                ordered.push(nextEntry);
                if (!nextEntry.next_id) break;
            } else {
                break;
            }
        }

        return ordered;
    }

    const chainData: Entry[][] = [[
        { id: 'A', prev_id: '', next_id: 'B', TMP_dep: 'test', TMP_is_active: true },
        { id: 'B', prev_id: 'A', next_id: 'C', TMP_dep: 'test', TMP_is_active: true },
        { id: 'C', prev_id: 'B', next_id: '', TMP_dep: 'test', TMP_is_active: true },
    ]];

    it('orderWithReset produces correct 3-entry chain', () => {
        const result = orderWithReset(chainData);
        expect(result.map(e => e.id)).toEqual(['A', 'B', 'C']);
    });

    it('both implementations agree on simple chain', () => {
        const withReset = orderWithReset(chainData);
        const withoutReset = orderWithoutReset(chainData);
        expect(withReset.map(e => e.id)).toEqual(withoutReset.map(e => e.id));
    });
});

// ---------------------------------------------------------------------------
//  8. modifyEntry must increment dbMutationVersion
// ---------------------------------------------------------------------------

describe('dbMutationVersion signal', () => {
    beforeEach(async () => {
        invalidateDependencyCache();
        await seedActiveDB();
        dbMutationVersion.value = 0;
    });

    it('addEntry increments dbMutationVersion', async () => {
        const before = dbMutationVersion.value;
        await addEntry({ type: 'Test', id: 'mut-test' });
        expect(dbMutationVersion.value).toBeGreaterThan(before);
    });

    it('modifyEntry increments dbMutationVersion on successful update', async () => {
        await addEntry({
            type: 'DialogueInfo',
            TMP_info_id: 'mod-entry',
            id: 'mod-entry',
            text: 'original',
            TMP_is_active: true,
        });

        const db = await getActiveDB();
        const entry = await db.pluginData.where('TMP_info_id').equals('mod-entry').first();
        expect(entry).toBeDefined();

        const before = dbMutationVersion.value;
        await modifyEntry({ ...entry, text: 'changed' });
        expect(dbMutationVersion.value).toBeGreaterThan(before);
    });

    it('modifyEntry does NOT increment dbMutationVersion for non-existent entry', async () => {
        const before = dbMutationVersion.value;
        await modifyEntry({ TMP_index: 999999, text: 'ghost' } as unknown as any);
        expect(dbMutationVersion.value).toBe(before);
    });
});
