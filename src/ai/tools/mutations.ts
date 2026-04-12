/**
 * AI Tools — Mutation tools (writeScript, createRecord, addDialogue)
 *
 * These tools MODIFY the active plugin. They use the existing CRUD APIs:
 * - addEntry / modifyEntry from import-export.ts
 * - addDialogueEntry from dialogue.ts
 * - addJournalQuest / addQuestEntry from journal.ts
 *
 * All mutations go through the same code paths the UI uses,
 * so session change counters, dbMutationVersion, and linked-list
 * integrity are preserved.
 */

import type { TeosTool } from './index';
import { findFirstAcrossDBs } from './helpers';
import { getActiveDB } from '@/api/db';
import { addEntry, modifyEntry } from '@/api/import-export';
import { addDialogueEntry } from '@/api/dialogue';
import type { BaseEntry } from '@/types/pluginEntries';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid record types for createRecord.
 * These map to TES3 record type strings stored in `type` field.
 */
const CREATABLE_TYPES: Record<string, string> = {
    npc: 'Npc',
    weapon: 'Weapon',
    armor: 'Armor',
    clothing: 'Clothing',
    potion: 'Potion',
    ingredient: 'Ingredient',
    book: 'Book',
    miscellaneous: 'Miscellaneous',
    activator: 'Activator',
    container: 'Container',
    door: 'Door',
    light: 'Light',
    static: 'Static',
    creature: 'Creature',
    lockpick: 'Lockpick',
    probe: 'Probe',
    repair: 'Repair',
    apparatus: 'Apparatus',
    spell: 'Spell',
    enchantment: 'Enchantment',
    alchemy: 'Alchemy',
    levelled_creature: 'LevelledCreature',
    levelled_item: 'LevelledItem',
    sound: 'Sound',
    sound_gen: 'SoundGen',
    global: 'Global',
    game_setting: 'GameSetting',
    class: 'Class',
    faction: 'Faction',
    race: 'Race',
    birthsign: 'Birthsign',
    region: 'Region',
    body_part: 'BodyPart',
    start_script: 'StartScript',
};

export const mutationTools: TeosTool[] = [
    // ─────────────────────────────────────────────────────────────────────────
    //  writeScript
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: 'writeScript',
        description: 'Create a new MWScript or update an existing one in the active plugin. If a script with the given name exists in the active plugin, it will be updated. If it exists only in a master file, a new override entry will be created. If it doesn\'t exist at all, a brand-new script record will be added. Returns the script record on success.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The script name (Begin <name> / End). Must follow MWScript naming conventions (no spaces, max 32 chars).',
                },
                code: {
                    type: 'string',
                    description: 'The full MWScript source code including Begin/End directives.',
                },
            },
            required: ['name', 'code'],
        },
        execute: async (params) => {
            const name = params.name as string;
            const code = params.code as string;

            if (!name || !code) {
                return { error: 'Both name and code are required' };
            }
            if (name.length > 32) {
                return { error: 'Script name must be 32 characters or fewer' };
            }
            if (!code.toLowerCase().includes('begin') || !code.toLowerCase().includes('end')) {
                return { error: 'Script must contain Begin and End directives' };
            }

            try {
                const db = await getActiveDB();

                // Check if script already exists in active plugin
                const existing = await db.table('pluginData')
                    .where('type').equals('Script')
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === name.toLowerCase(),
                    )
                    .first();

                if (existing && existing.TMP_is_active) {
                    // Update existing active script
                    existing.text = code;
                    await modifyEntry(existing as BaseEntry);
                    return {
                        action: 'updated',
                        id: existing.id,
                        message: `Script "${name}" updated in active plugin`,
                    };
                }

                // Create new script entry (either brand new or override)
                const isOverride = !!existing; // exists in master but not active
                const newEntry: Record<string, unknown> = {
                    type: 'Script',
                    id: name,
                    text: code,
                    TMP_id: name,
                    TMP_is_active: true,
                };

                await addEntry(newEntry);

                return {
                    action: isOverride ? 'overridden' : 'created',
                    id: name,
                    message: isOverride
                        ? `Script "${name}" overridden from master file`
                        : `Script "${name}" created in active plugin`,
                };
            } catch (err) {
                return { error: `Failed to write script: ${err}` };
            }
        },
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  createRecord
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: 'createRecord',
        description: `Create a new record in the active plugin. Supports all TES3 record types: NPC, Weapon, Armor, Clothing, Potion, Ingredient, Book, Spell, Enchantment, Activator, Container, Door, Light, Static, Creature, and many more. Pass the record type and a fields object with type-specific data. The record ID is required and must be unique.

Common field examples:
- NPC: { id, name, race, class, faction, level, script, inventory: [{id, count}], spells: ["spell_id"] }
- Weapon: { id, name, weight, value, type: "LongBlade1H", speed, chop_min/max, slash_min/max, thrust_min/max }
- Book: { id, name, text, weight, value, scroll: true/false }
- Spell: { id, name, type: "Spell"|"Power"|"Ability", effects: [{id, range, duration, magnitude_min/max}] }
- Potion: { id, name, weight, value, effects: [...] }`,
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'The record type (e.g. "Npc", "Weapon", "Book", "Spell"). Case-insensitive.',
                },
                fields: {
                    type: 'object',
                    description: 'Record fields. Must include "id" (unique identifier). Other fields depend on the record type.',
                },
            },
            required: ['recordType', 'fields'],
        },
        execute: async (params) => {
            const typeInput = (params.recordType as string).toLowerCase();
            const fields = params.fields as Record<string, unknown>;

            const resolvedType = CREATABLE_TYPES[typeInput] || CREATABLE_TYPES[typeInput.replace(/\s+/g, '_')];
            if (!resolvedType) {
                return {
                    error: `Unknown record type "${params.recordType}". Available types: ${Object.keys(CREATABLE_TYPES).join(', ')}`,
                };
            }

            if (!fields.id) {
                return { error: 'Record must have an "id" field' };
            }

            try {
                const db = await getActiveDB();

                // Check for ID collision in active plugin
                const existing = await db.table('pluginData')
                    .where('type').equals(resolvedType)
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === (fields.id as string).toLowerCase(),
                    )
                    .first();

                if (existing && existing.TMP_is_active) {
                    return {
                        error: `Record "${fields.id}" of type ${resolvedType} already exists in active plugin. Use a different ID or modify the existing record.`,
                    };
                }

                const newEntry: Record<string, unknown> = {
                    type: resolvedType,
                    ...fields,
                    TMP_id: fields.id,
                    TMP_is_active: true,
                };

                await addEntry(newEntry);

                return {
                    action: 'created',
                    type: resolvedType,
                    id: fields.id,
                    message: `${resolvedType} "${fields.id}" created in active plugin`,
                };
            } catch (err) {
                return { error: `Failed to create record: ${err}` };
            }
        },
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  addDialogueEntries
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: 'addDialogueEntries',
        description: `Add one or more dialogue entries to a topic in the active plugin. This is the proper way to add dialogue — it handles linked-list insertion, speaker fields, and topic creation automatically.

Each entry needs:
- text: The dialogue response text
- speaker_id: (optional) NPC ID for speaker-specific lines
- speaker_type: (optional) How to match the speaker: "npc" (default), "race", "class", "faction", "cell"
- script_text: (optional) Result script code
- filters: (optional) Array of filter objects to add after creation

The topic will be created if it doesn't exist. Entries are inserted at the optimal position in the linked list based on speaker specificity.`,
        parameters: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'The dialogue topic name (e.g. "little advice", "latest rumors")',
                },
                type: {
                    type: 'string',
                    description: 'Dialogue type: "Topic" (default), "Greeting", "Persuasion", "Voice"',
                },
                entries: {
                    type: 'array',
                    description: 'Array of dialogue entries to add',
                    items: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: 'The dialogue response text',
                            },
                            speaker_id: {
                                type: 'string',
                                description: 'NPC/race/class/faction/cell ID for speaker matching',
                            },
                            speaker_type: {
                                type: 'string',
                                description: 'Speaker match type: "npc", "race", "class", "faction", "cell"',
                            },
                            script_text: {
                                type: 'string',
                                description: 'Result script (executed when this line is chosen)',
                            },
                        },
                        required: ['text'],
                    },
                },
            },
            required: ['topic', 'entries'],
        },
        execute: async (params) => {
            const topic = params.topic as string;
            const dialogueType = (params.type as string) || 'Topic';
            const entries = params.entries as {
                text: string;
                speaker_id?: string;
                speaker_type?: string;
                script_text?: string;
            }[];

            if (!topic) return { error: 'Topic name is required' };
            if (!entries?.length) return { error: 'At least one entry is required' };

            const results: { index: number; text: string; status: string }[] = [];

            try {
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    const speakerId = entry.speaker_id || '';
                    const speakerType = entry.speaker_type || (speakerId ? 'npc' : '');

                    try {
                        await addDialogueEntry(
                            speakerId,        // speakerId
                            topic,            // topicId
                            dialogueType,     // dialogueType
                            speakerType,      // speakerType
                            '',               // entryId (auto-generate)
                            '',               // prevId (auto-locate)
                            '',               // nextId (auto-locate)
                            entry.text,       // text
                        );

                        // If script_text is provided, we need to update the entry
                        // after creation since addDialogueEntry doesn't accept it
                        if (entry.script_text) {
                            const db = await getActiveDB();
                            // Find the just-created entry (last active entry in topic)
                            const topicEntries = await db.table('pluginData')
                                .where('TMP_topic').equals(topic)
                                .filter((r: Record<string, unknown>) =>
                                    r.type === 'DialogueInfo' && r.TMP_is_active === true,
                                )
                                .toArray();

                            // Get the most recently added entry (highest TMP_index)
                            const lastEntry = [...topicEntries].sort(
                                (a: Record<string, unknown>, b: Record<string, unknown>) =>
                                    (b.TMP_index as number) - (a.TMP_index as number),
                            )[0];

                            if (lastEntry) {
                                lastEntry.script_text = entry.script_text;
                                await modifyEntry(lastEntry as BaseEntry);
                            }
                        }

                        results.push({
                            index: i,
                            text: entry.text.slice(0, 80),
                            status: 'created',
                        });
                    } catch (err) {
                        results.push({
                            index: i,
                            text: entry.text.slice(0, 80),
                            status: `error: ${err}`,
                        });
                    }
                }

                const successCount = results.filter(r => r.status === 'created').length;
                return {
                    topic,
                    type: dialogueType,
                    totalEntries: entries.length,
                    created: successCount,
                    results,
                    message: `${successCount}/${entries.length} dialogue entries added to topic "${topic}"`,
                };
            } catch (err) {
                return { error: `Failed to add dialogue entries: ${err}` };
            }
        },
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  modifyRecord
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: 'modifyRecord',
        description: 'Modify an existing record in the active plugin. Updates the specified fields while keeping others intact. Works for any record type (NPC, Script, Weapon, etc.).',
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'The record type (e.g. "Npc", "Script", "Weapon")',
                },
                id: {
                    type: 'string',
                    description: 'The record ID to modify',
                },
                updates: {
                    type: 'object',
                    description: 'Fields to update. Only specified fields will be changed.',
                },
            },
            required: ['recordType', 'id', 'updates'],
        },
        execute: async (params) => {
            const typeInput = params.recordType as string;
            const id = params.id as string;
            const updates = params.updates as Record<string, unknown>;

            if (!id) return { error: 'Record ID is required' };

            // Resolve type
            const resolvedType = CREATABLE_TYPES[typeInput.toLowerCase()] || typeInput;

            try {
                const db = await getActiveDB();

                // Find in active plugin first
                let record = await db.table('pluginData')
                    .where('type').equals(resolvedType)
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === id.toLowerCase(),
                    )
                    .first();

                if (!record) {
                    // Try to find in masters and create an override
                    const masterRecord = await findFirstAcrossDBs(async (dbInner) => {
                        return dbInner.table('pluginData')
                            .where('type').equals(resolvedType)
                            .filter((r: Record<string, unknown>) =>
                                (r.id as string)?.toLowerCase() === id.toLowerCase(),
                            )
                            .first();
                    });

                    if (!masterRecord) {
                        return { error: `Record "${id}" of type "${resolvedType}" not found in active plugin or masters` };
                    }

                    // Create override from master record
                    const { TMP_index: _i, TMP_dep: _d, TMP_is_active: _a, _source: _s, ...cleanRecord } = masterRecord;
                    const overrideEntry: Record<string, unknown> = {
                        ...cleanRecord,
                        ...updates,
                        TMP_is_active: true,
                    };
                    await addEntry(overrideEntry);
                    return {
                        action: 'overridden',
                        type: resolvedType,
                        id,
                        updatedFields: Object.keys(updates),
                        message: `${resolvedType} "${id}" overridden from master with updates`,
                    };
                }

                if (!record.TMP_is_active) {
                    // It's a master record that was copied — create new override
                    const { TMP_index: _i, TMP_dep: _d, TMP_is_active: _a, ...cleanRecord } = record;
                    const overrideEntry: Record<string, unknown> = {
                        ...cleanRecord,
                        ...updates,
                        TMP_is_active: true,
                    };
                    await addEntry(overrideEntry);
                    return {
                        action: 'overridden',
                        type: resolvedType,
                        id,
                        updatedFields: Object.keys(updates),
                        message: `${resolvedType} "${id}" overridden with updates`,
                    };
                }

                // Active plugin record — modify in place
                Object.assign(record, updates);
                await modifyEntry(record as BaseEntry);

                return {
                    action: 'modified',
                    type: resolvedType,
                    id,
                    updatedFields: Object.keys(updates),
                    message: `${resolvedType} "${id}" modified in active plugin`,
                };
            } catch (err) {
                return { error: `Failed to modify record: ${err}` };
            }
        },
    },
];
