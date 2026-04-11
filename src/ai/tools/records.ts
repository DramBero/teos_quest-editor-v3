/**
 * AI Tools — Record type queries (listRecordTypes, queryRecords)
 */

import type { TeosTool } from './index';
import { useCountTypes } from '@/stores/countTypes';
import { getActiveDB } from '@/api/db';

export const recordTools: TeosTool[] = [
    {
        name: 'listRecordTypes',
        description: 'List all record types and their counts in the currently loaded plugin. Returns an object with type names as keys and counts as values.',
        parameters: {
            type: 'object',
            properties: {},
        },
        execute: async () => {
            const store = useCountTypes();
            return store.countTypes || {};
        },
    },
    {
        name: 'queryRecords',
        description: 'Query records from the loaded plugin by type. Returns up to 50 records. Each record has fields like id, type, and type-specific data.',
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'The record type to query, e.g. "NPC", "Script", "Weapon", "Armor", "Cell", "Faction"',
                },
                filter: {
                    type: 'string',
                    description: 'Optional text filter — matches against record id/name',
                },
            },
            required: ['recordType'],
        },
        execute: async (params) => {
            const recordType = params.recordType as string;
            const filter = (params.filter as string)?.toLowerCase();
            try {
                const db = await getActiveDB();

                // Map common type names to DB type values
                const typeMap: Record<string, string> = {
                    npc: 'Npc', script: 'Script', weapon: 'Weapon',
                    armor: 'Armor', clothing: 'Clothing', cell: 'Cell',
                    faction: 'Faction', dialogue: 'Dialogue', book: 'Book',
                    potion: 'Potion', ingredient: 'Ingredient', spell: 'Spell',
                    enchantment: 'Enchantment', creature: 'Creature',
                    container: 'Container', door: 'Door', light: 'Light',
                    activator: 'Activator', static: 'Static', apparatus: 'Apparatus',
                    lockpick: 'Lockpick', probe: 'Probe', repair: 'Repair',
                    miscellaneous: 'Miscellaneous', sound: 'Sound',
                    levelledcreature: 'LevelledCreature', levelleditem: 'LevelledItem',
                };
                const dbType = typeMap[recordType.toLowerCase()] || recordType;

                let query = db.table('pluginData')
                    .where('type').equals(dbType);

                if (filter) {
                    query = query.filter((r: Record<string, unknown>) => {
                        const id = ((r.id as string) || '').toLowerCase();
                        const name = ((r.name as string) || '').toLowerCase();
                        return id.includes(filter) || name.includes(filter);
                    });
                }

                const results = await query.limit(50).toArray();
                return results.map((r: Record<string, unknown>) => {
                    const { TMP_index: _i, TMP_prev_id: _p, TMP_next_id: _n, ...clean } = r;
                    return clean;
                });
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
