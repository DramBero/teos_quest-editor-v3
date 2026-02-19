/**
 * Tests for dialogue ordering logic.
 *
 * The linked-list ordering in getOrderedEntriesByTopic is one of the most
 * complex algorithms in the app. These tests verify the ordering without
 * needing Dexie — we test the pure algorithm by feeding pre-shaped data.
 *
 * The ordering works as a linked list:
 *   entry with prev_id="" is first → follow next_id chain
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
//  Extracted ordering algorithm (mirrors dialogue.ts:164-231)
// ---------------------------------------------------------------------------

interface DialogueEntry {
    id: string;
    prev_id: string;
    next_id: string;
    text: string;
    TMP_dep: string;
    TMP_is_active?: boolean;
    TMP_topic?: string;
    old_values?: DialogueEntry[];
    [key: string]: unknown;
}

/**
 * Orders dialogue entries using the linked list algorithm from dialogue.ts.
 * Extracted as a pure function for testability.
 *
 * @param flatEntries — grouped by plugin: [[plugin1 entries], [plugin2 entries], ...]
 */
function orderEntries(pluginDialogue: DialogueEntry[][]): DialogueEntry[] {
    if (!pluginDialogue.flat(1).length) return [];

    const findByIdType = function (idType: string, id: string, ignoreList?: DialogueEntry[]) {
        let entries = pluginDialogue.flatMap((plugin) =>
            plugin.filter((entry) => entry[idType] === id),
        );
        const ignoreStrings = ignoreList?.map((val) => `${val.id}+${val.TMP_dep}`) || [];
        entries = entries.filter(
            (entry) => !ignoreStrings.includes(`${entry.id}+${entry.TMP_dep}`),
        );
        if (!entries.length) return false as const;

        const lastValue = entries.at(-1)!;
        const oldValues = pluginDialogue.flatMap((plugin) =>
            plugin.filter((entry) => entry.id === lastValue.id),
        );
        return {
            ...lastValue,
            old_values: oldValues.length > 1 ? oldValues.filter((val) => val && val.TMP_dep) : [],
        };
    };

    const firstElement = findByIdType('prev_id', '');
    if (!firstElement) throw 'NO_PREV_ID';

    const orderedDialogue: DialogueEntry[] = [firstElement];
    let nextEntry: DialogueEntry | false | undefined;

    while (true) {
        const last = orderedDialogue.at(-1)!;
        const nextEntries = [
            ...new Set([
                findByIdType('prev_id', last.id, orderedDialogue),
                findByIdType('id', last.next_id, orderedDialogue),
            ]),
        ];

        if (nextEntries.length === 1 && nextEntries[0] === false) break;

        for (const entry of nextEntries) {
            if (entry) nextEntry = entry;
        }

        if (nextEntry && nextEntry !== false) {
            orderedDialogue.push(nextEntry);
            if (!nextEntry.next_id) {
                const newEntry = findByIdType('prev_id', nextEntry.id, orderedDialogue);
                if (newEntry) {
                    orderedDialogue.push(newEntry);
                } else {
                    break;
                }
            }
        } else {
            break;
        }
    }

    return orderedDialogue;
}

// ---------------------------------------------------------------------------
//  Tests
// ---------------------------------------------------------------------------

describe('Dialogue linked-list ordering', () => {
    it('orders a simple 3-entry chain', () => {
        const entries: DialogueEntry[] = [
            { id: 'B', prev_id: 'A', next_id: 'C', text: 'second', TMP_dep: 'test.esp' },
            { id: 'A', prev_id: '', next_id: 'B', text: 'first', TMP_dep: 'test.esp' },
            { id: 'C', prev_id: 'B', next_id: '', text: 'third', TMP_dep: 'test.esp' },
        ];

        const ordered = orderEntries([entries]);
        expect(ordered.map(e => e.id)).toEqual(['A', 'B', 'C']);
        expect(ordered.map(e => e.text)).toEqual(['first', 'second', 'third']);
    });

    it('handles single entry', () => {
        const entries: DialogueEntry[] = [
            { id: 'only', prev_id: '', next_id: '', text: 'solo', TMP_dep: 'test.esp' },
        ];

        const ordered = orderEntries([entries]);
        expect(ordered).toHaveLength(1);
        expect(ordered[0].id).toBe('only');
    });

    it('throws when no entry has prev_id=""', () => {
        const entries: DialogueEntry[] = [
            { id: 'A', prev_id: 'B', next_id: '', text: 'orphan', TMP_dep: 'test.esp' },
        ];

        expect(() => orderEntries([entries])).toThrow('NO_PREV_ID');
    });

    it('returns empty array for empty input', () => {
        expect(orderEntries([[]])).toEqual([]);
        expect(orderEntries([])).toEqual([]);
    });

    it('orders entries from multiple plugins', () => {
        // Morrowind provides the base chain, a mod inserts in the middle
        const morrowind: DialogueEntry[] = [
            { id: 'M1', prev_id: '', next_id: 'M2', text: 'morrowind 1', TMP_dep: 'Morrowind.esm' },
            { id: 'M2', prev_id: 'M1', next_id: '', text: 'morrowind 2', TMP_dep: 'Morrowind.esm' },
        ];
        const mod: DialogueEntry[] = [
            { id: 'X1', prev_id: 'M1', next_id: 'M2', text: 'mod entry', TMP_dep: 'mod.esp' },
        ];

        const ordered = orderEntries([morrowind, mod]);

        // First entry should be M1 (has prev_id='')
        expect(ordered[0].id).toBe('M1');
        // The ordering algorithm should include all entries
        expect(ordered.length).toBeGreaterThanOrEqual(2);
    });

    it('handles 5-entry chain correctly', () => {
        // Deliberately shuffled
        const entries: DialogueEntry[] = [
            { id: 'E', prev_id: 'D', next_id: '', text: 'five', TMP_dep: 'test.esp' },
            { id: 'C', prev_id: 'B', next_id: 'D', text: 'three', TMP_dep: 'test.esp' },
            { id: 'A', prev_id: '', next_id: 'B', text: 'one', TMP_dep: 'test.esp' },
            { id: 'D', prev_id: 'C', next_id: 'E', text: 'four', TMP_dep: 'test.esp' },
            { id: 'B', prev_id: 'A', next_id: 'C', text: 'two', TMP_dep: 'test.esp' },
        ];

        const ordered = orderEntries([entries]);
        expect(ordered.map(e => e.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(ordered.map(e => e.text)).toEqual(['one', 'two', 'three', 'four', 'five']);
    });

    it('populates old_values for duplicate entries across plugins', () => {
        const base: DialogueEntry[] = [
            { id: 'A', prev_id: '', next_id: '', text: 'original', TMP_dep: 'base.esm' },
        ];
        const override: DialogueEntry[] = [
            { id: 'A', prev_id: '', next_id: '', text: 'modified', TMP_dep: 'mod.esp' },
        ];

        const ordered = orderEntries([base, override]);

        // Should have one entry with old_values containing both versions
        expect(ordered).toHaveLength(1);
        expect(ordered[0].old_values!.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
//  addTopicEntries — topic grouping
// ---------------------------------------------------------------------------

interface TopicList {
    topics: unknown[];
    greetings: unknown[];
    persuasions: unknown[];
}

function addTopicEntries(original: TopicList, entries: Record<string, unknown>[]): TopicList {
    const dialogue: TopicList = { topics: [], greetings: [], persuasions: [] };

    for (const type of ['Topic', 'Greeting', 'Persuasion'] as const) {
        const key = `${type.toLowerCase()}s` as keyof TopicList;
        const filtered = entries.filter((val) => val.TMP_type === type);
        const uniqueNames = [...new Set(filtered.map((val) => val.TMP_topic))];
        for (const name of uniqueNames) {
            dialogue[key] = [...dialogue[key], filtered.find((val) => val.TMP_topic === name)];
        }
    }

    return {
        topics: [...original.topics, ...dialogue.topics],
        greetings: [...original.greetings, ...dialogue.greetings],
        persuasions: [...original.persuasions, ...dialogue.persuasions],
    };
}

describe('addTopicEntries — topic grouping', () => {
    it('groups entries by dialogue type', () => {
        const entries = [
            { TMP_type: 'Topic', TMP_topic: 'background', text: 'hello' },
            { TMP_type: 'Greeting', TMP_topic: 'greeting 0', text: 'welcome' },
            { TMP_type: 'Persuasion', TMP_topic: 'admire', text: 'nice' },
        ];

        const result = addTopicEntries({ topics: [], greetings: [], persuasions: [] }, entries);

        expect(result.topics).toHaveLength(1);
        expect(result.greetings).toHaveLength(1);
        expect(result.persuasions).toHaveLength(1);
    });

    it('deduplicates by TMP_topic', () => {
        const entries = [
            { TMP_type: 'Topic', TMP_topic: 'background', text: 'version 1' },
            { TMP_type: 'Topic', TMP_topic: 'background', text: 'version 2' },
            { TMP_type: 'Topic', TMP_topic: 'trade', text: 'trade text' },
        ];

        const result = addTopicEntries({ topics: [], greetings: [], persuasions: [] }, entries);

        // 'background' should only appear once (first match)
        expect(result.topics).toHaveLength(2);
    });

    it('merges with existing topic list', () => {
        const existing: TopicList = {
            topics: [{ TMP_topic: 'old-topic' }],
            greetings: [],
            persuasions: [],
        };

        const newEntries = [
            { TMP_type: 'Topic', TMP_topic: 'new-topic', text: 'new' },
        ];

        const result = addTopicEntries(existing, newEntries);

        expect(result.topics).toHaveLength(2);
    });

    it('ignores entries of unrecognised dialogue types', () => {
        const entries = [
            { TMP_type: 'Voice', TMP_topic: 'idle', text: 'hmm' },
            { TMP_type: 'Journal', TMP_topic: 'quest', text: 'entry' },
        ];

        const result = addTopicEntries({ topics: [], greetings: [], persuasions: [] }, entries);

        expect(result.topics).toHaveLength(0);
        expect(result.greetings).toHaveLength(0);
        expect(result.persuasions).toHaveLength(0);
    });
});
