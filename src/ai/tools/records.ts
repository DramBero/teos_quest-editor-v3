/**
 * AI Tools — Record type queries (listRecordTypes, queryRecords)
 *
 * All queries search across active plugin + master files.
 */

import type { TeosTool } from './index';
import { queryAllDBs } from './helpers';
import { getActiveDB, getDependencies, _getDatabases } from '@/api/db';

export const recordTools: TeosTool[] = [
    {
        name: 'listRecordTypes',
        description: 'List all record types and their counts in the active plugin AND master files. Returns separate counts for active plugin and each master.',
        parameters: {
            type: 'object',
            properties: {},
        },
        execute: async () => {
            try {
                const activeDB = await getActiveDB();
                const activeTypes: string[] = await activeDB.table('pluginData').orderBy('type').uniqueKeys() as string[];
                const activeCounts = await Promise.all(
                    activeTypes.map(type => activeDB.table('pluginData').where('type').equals(type).count()),
                );
                const active: Record<string, number> = {};
                for (let i = 0; i < activeTypes.length; i++) {
                    active[activeTypes[i]] = activeCounts[i];
                }

                // Master counts (summary only — just totals per master)
                const masterSummaries: { key: string; totalRecords: number; types: string[] }[] = [];
                try {
                    const deps = await getDependencies();
                    const databases = _getDatabases();
                    for (const dep of deps) {
                        const db = databases[dep];
                        if (!db) continue;
                        const total = await db.table('pluginData').count();
                        const types: string[] = await db.table('pluginData').orderBy('type').uniqueKeys() as string[];
                        masterSummaries.push({ key: dep, totalRecords: total, types });
                    }
                } catch {
                    // No masters
                }

                return {
                    activePlugin: active,
                    masters: masterSummaries,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'queryRecords',
        description: 'Query records by type (NPC, Script, Weapon, etc.) across the active plugin AND master files. Returns up to 50 records tagged with their source. Each record has fields like id, type, and type-specific data.',
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
                limit: {
                    type: 'number',
                    description: 'Maximum results (default 50)',
                },
            },
            required: ['recordType'],
        },
        execute: async (params) => {
            const recordType = params.recordType as string;
            const filter = (params.filter as string)?.toLowerCase();
            const limit = (params.limit as number) || 50;
            try {
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

                const results = await queryAllDBs(async (db) => {
                    let query = db.table('pluginData')
                        .where('type').equals(dbType);

                    if (filter) {
                        query = query.filter((r: Record<string, unknown>) => {
                            const id = ((r.id as string) || '').toLowerCase();
                            const name = ((r.name as string) || '').toLowerCase();
                            return id.includes(filter) || name.includes(filter);
                        });
                    }

                    return query.limit(limit).toArray();
                }, limit);

                return results.map(r => {
                    const { TMP_index: _i, TMP_prev_id: _p, TMP_next_id: _n, ...clean } = r;
                    return { ...clean, source: r._source };
                });
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
