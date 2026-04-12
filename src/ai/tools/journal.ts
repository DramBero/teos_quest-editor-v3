/**
 * AI Tools — Journal/Quest queries (listJournalQuests, getQuestDetails)
 *
 * All queries search across active plugin + master files.
 *
 * Data model:
 * - Dialogue records (type='Dialogue', dialogue_type='Journal') are topic headers
 * - DialogueInfo records (type='DialogueInfo', TMP_topic=questId) are the actual entries
 *   with text, disposition (stage index), quest_state, filters, etc.
 */

import type { TeosTool } from './index';
import { queryAllDBs } from './helpers';

export const journalTools: TeosTool[] = [
    {
        name: 'listJournalQuests',
        description: 'List all journal/quest entries across the active plugin AND master files. Returns quest IDs with their stage indices and text, tagged with source.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'Optional text filter to match against quest ID or entry text',
                },
            },
        },
        execute: async (params) => {
            const filter = (params.filter as string)?.toLowerCase();
            try {
                // 1. Get all Journal-type Dialogue headers across all DBs
                const dialogues = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Dialogue')
                        .filter((d: Record<string, unknown>) => d.TMP_type === 'Journal')
                        .toArray();
                }, 200);

                // 2. Get all DialogueInfo records for journal entries across all DBs
                const allInfos = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('DialogueInfo')
                        .filter((r: Record<string, unknown>) => r.TMP_type === 'Journal')
                        .toArray();
                }, 500);

                // Index infos by TMP_topic
                const infosByTopic = new Map<string, typeof allInfos>();
                for (const info of allInfos) {
                    const topic = info.TMP_topic as string;
                    if (!topic) continue;
                    if (!infosByTopic.has(topic)) infosByTopic.set(topic, []);
                    infosByTopic.get(topic)!.push(info);
                }

                // Deduplicate dialogue headers by id (active overrides master)
                const uniqueDialogues = new Map<string, typeof dialogues[0]>();
                for (const d of dialogues) {
                    const id = d.id as string;
                    if (!id) continue;
                    // Active plugin entries take precedence
                    if (!uniqueDialogues.has(id) || d._source === 'active') {
                        uniqueDialogues.set(id, d);
                    }
                }

                const journals = [...uniqueDialogues.values()].filter((j) => {
                    if (!filter) return true;
                    const id = ((j.id as string) || '').toLowerCase();
                    return id.includes(filter);
                });

                const results = journals.slice(0, 30).map((j) => {
                    const questId = j.id as string;
                    const entries = infosByTopic.get(questId) || [];

                    // Separate name entries from stage entries
                    const stages = entries
                        .filter((e) => e.quest_state !== 'Name')
                        .map((e) => {
                            const data = (e.data as Record<string, unknown>) || {};
                            return {
                                index: data.disposition ?? 0,
                                text: ((e.text as string) || '').slice(0, 200),
                                quest_finish: e.quest_state === 'Finished' || false,
                                source: e._source,
                            };
                        })
                        .sort((a, b) => (a.index as number) - (b.index as number));

                    const nameEntry = entries.find(
                        (e) => e.quest_state === 'Name',
                    );

                    return {
                        questId,
                        questName: nameEntry ? (nameEntry.text as string) : undefined,
                        stages,
                        source: j._source,
                    };
                });

                return { count: journals.length, quests: results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'getQuestDetails',
        description: 'Get full details of a specific quest: all journal entries (stages) and related dialogue entries (topics/greetings that reference this quest in filters or result scripts). Searches across the active plugin AND master files.',
        parameters: {
            type: 'object',
            properties: {
                questId: {
                    type: 'string',
                    description: 'The journal/quest ID, e.g. "A1_StolenRing"',
                },
            },
            required: ['questId'],
        },
        execute: async (params) => {
            const questId = params.questId as string;
            try {
                // 1. Get journal entries across all DBs
                const entries = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('DialogueInfo')
                        .filter((r: Record<string, unknown>) =>
                            (r.TMP_topic as string) === questId &&
                            r.quest_state !== 'Name',
                        )
                        .toArray();
                }, 50);

                // Get quest name entries
                const nameEntries = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('DialogueInfo')
                        .filter((r: Record<string, unknown>) =>
                            (r.TMP_topic as string) === questId &&
                            r.quest_state === 'Name',
                        )
                        .toArray();
                }, 5);

                const journalEntries = entries.map((e) => {
                    const data = (e.data as Record<string, unknown>) || {};
                    return {
                        index: data.disposition ?? 0,
                        text: ((e.text as string) || '').slice(0, 500),
                        quest_finish: e.quest_state === 'Finished' || false,
                        source: e._source,
                    };
                }).sort((a, b) => (a.index as number) - (b.index as number));

                // 2. Find related dialogue entries that reference this quest across all DBs
                const relatedEntries = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('DialogueInfo')
                        .filter((r: Record<string, unknown>) => {
                            if (r.TMP_type === 'Journal') return false; // skip journal entries themselves

                            const resultScript = ((r.script_text as string) || '').toLowerCase();
                            const filters = (r.filters || []) as Record<string, unknown>[];

                            const refsInScript = resultScript.includes(questId.toLowerCase());
                            const refsInFilters = Array.isArray(filters) && filters.some(
                                (f: Record<string, unknown>) =>
                                    String(f.id || '').toLowerCase() === questId.toLowerCase() ||
                                    String(f.value || '').toLowerCase() === questId.toLowerCase(),
                            );

                            return refsInScript || refsInFilters;
                        })
                        .limit(20)
                        .toArray();
                }, 20);

                const relatedDialogues = relatedEntries.map((e) => ({
                    topic: e.TMP_topic,
                    speaker_id: e.speaker_id || null,
                    text: ((e.text as string) || '').slice(0, 300),
                    result_script: ((e.script_text as string) || '').slice(0, 300),
                    source: e._source,
                }));

                return {
                    questId,
                    questName: nameEntries.length ? nameEntries[0].text : null,
                    journalEntries,
                    relatedDialogues,
                    found: entries.length > 0 || nameEntries.length > 0,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
