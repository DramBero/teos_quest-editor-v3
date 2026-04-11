/**
 * AI Tools — Dialogue queries (searchDialogues, getDialogueTree)
 */

import type { TeosTool } from './index';
import { getActiveDB } from '@/api/db';

export const dialogueTools: TeosTool[] = [
    {
        name: 'searchDialogues',
        description: 'Search dialogue entries by text content or speaker/NPC name. Returns matching entries with their response text.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Text to search for in dialogue text or speaker ID',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default 10)',
                },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const query = (params.query as string).toLowerCase();
            const limit = (params.limit as number) || 10;
            try {
                const db = await getActiveDB();

                // Search across DialogueInfo records directly
                const infos = await db.table('pluginData')
                    .where('type').equals('DialogueInfo')
                    .filter((r: Record<string, unknown>) => {
                        const text = ((r.text as string) || '').toLowerCase();
                        const speaker = ((r.speaker_id as string) || '').toLowerCase();
                        const topic = ((r.TMP_topic as string) || '').toLowerCase();
                        return text.includes(query) || speaker.includes(query) || topic.includes(query);
                    })
                    .limit(limit)
                    .toArray();

                const results = infos.map((e: Record<string, unknown>) => ({
                    topic: e.TMP_topic,
                    type: e.TMP_type || null,
                    speaker_id: e.speaker_id || null,
                    text: ((e.text as string) || '').slice(0, 200),
                }));

                return { count: results.length, results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'getDialogueTree',
        description: 'Get the full structure of a dialogue topic: all entries in order with their speaker, text, filters, and result scripts. Useful for understanding existing dialogue before adding new entries.',
        parameters: {
            type: 'object',
            properties: {
                topicId: {
                    type: 'string',
                    description: 'The dialogue topic ID/name to look up',
                },
            },
            required: ['topicId'],
        },
        execute: async (params) => {
            const topicId = params.topicId as string;
            try {
                const db = await getActiveDB();

                // Find the dialogue record
                const dialogue = await db.table('pluginData')
                    .where('type').equals('Dialogue')
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === topicId.toLowerCase(),
                    )
                    .first();

                if (!dialogue) return { error: `Topic "${topicId}" not found` };

                // Get all DialogueInfo entries for this topic
                const entries = await db.table('pluginData')
                    .where('type').equals('DialogueInfo')
                    .filter((r: Record<string, unknown>) =>
                        (r.TMP_topic as string)?.toLowerCase() === topicId.toLowerCase(),
                    )
                    .toArray();

                const tree = entries.map((e: Record<string, unknown>) => {
                    const filters = (e.filters || []) as Record<string, unknown>[];
                    return {
                        id: e.TMP_id || e.id,
                        speaker_id: e.speaker_id || null,
                        speaker_race: e.speaker_race || null,
                        speaker_class: e.speaker_class || null,
                        speaker_faction: e.speaker_faction || null,
                        speaker_cell: e.speaker_cell || null,
                        text: ((e.text as string) || '').slice(0, 500),
                        result_script: ((e.script_text as string) || '').slice(0, 500),
                        disposition: (e.data as Record<string, unknown>)?.disposition ?? null,
                        filters: filters.map(f => ({
                            type: f.filter_type || f.type,
                            function: f.function,
                            comparison: f.comparison,
                            id: f.id,
                            value: f.value,
                        })),
                    };
                });

                return {
                    topicId: dialogue.id,
                    dialogue_type: dialogue.dialogue_type,
                    entryCount: tree.length,
                    entries: tree.slice(0, 30),
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'findRelatedDialogues',
        description: 'Find ALL dialogue entries related to a specific NPC — not just by speaker ID, but also by their faction, race, class, and cell. Shows everything the NPC could potentially say. Requires the NPC to exist in the plugin.',
        parameters: {
            type: 'object',
            properties: {
                npcId: {
                    type: 'string',
                    description: 'The NPC id to look up',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default 30)',
                },
            },
            required: ['npcId'],
        },
        execute: async (params) => {
            const npcId = params.npcId as string;
            const limit = (params.limit as number) || 30;
            try {
                const db = await getActiveDB();

                // First, find the NPC record to get their attributes
                const npc = await db.table('pluginData')
                    .where('type').equals('Npc')
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === npcId.toLowerCase() ||
                        (r.name as string)?.toLowerCase() === npcId.toLowerCase(),
                    )
                    .first();

                if (!npc) return { error: `NPC "${npcId}" not found` };

                const attrs = {
                    id: (npc.id as string || '').toLowerCase(),
                    race: (npc.race as string || '').toLowerCase(),
                    class: (npc.class as string || '').toLowerCase(),
                    faction: (npc.faction as string || '').toLowerCase(),
                };

                // Search DialogueInfo entries matching ANY of the NPC's attributes
                const entries = await db.table('pluginData')
                    .where('type').equals('DialogueInfo')
                    .filter((r: Record<string, unknown>) => {
                        const speakerId = ((r.speaker_id as string) || '').toLowerCase();
                        const speakerRace = ((r.speaker_race as string) || '').toLowerCase();
                        const speakerClass = ((r.speaker_class as string) || '').toLowerCase();
                        const speakerFaction = ((r.speaker_faction as string) || '').toLowerCase();

                        if (speakerId && speakerId === attrs.id) return true;
                        if (speakerFaction && attrs.faction && speakerFaction === attrs.faction) return true;
                        if (speakerRace && attrs.race && speakerRace === attrs.race) return true;
                        if (speakerClass && attrs.class && speakerClass === attrs.class) return true;
                        return false;
                    })
                    .limit(limit)
                    .toArray();

                const results = entries.map((e: Record<string, unknown>) => {
                    const matchedBy: string[] = [];
                    const sid = ((e.speaker_id as string) || '').toLowerCase();
                    const sr = ((e.speaker_race as string) || '').toLowerCase();
                    const sc = ((e.speaker_class as string) || '').toLowerCase();
                    const sf = ((e.speaker_faction as string) || '').toLowerCase();
                    if (sid === attrs.id) matchedBy.push('ID');
                    if (sf && sf === attrs.faction) matchedBy.push('Faction');
                    if (sr && sr === attrs.race) matchedBy.push('Race');
                    if (sc && sc === attrs.class) matchedBy.push('Class');

                    return {
                        topic: e.TMP_topic,
                        type: e.TMP_type || null,
                        text: ((e.text as string) || '').slice(0, 200),
                        matchedBy,
                    };
                });

                return {
                    npc: { id: npc.id, name: npc.name, race: npc.race, class: npc.class, faction: npc.faction },
                    count: results.length,
                    entries: results,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
