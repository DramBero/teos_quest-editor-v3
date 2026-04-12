/**
 * AI Tools — World data (getCellDetails, listFactions)
 *
 * All queries search across active plugin + master files.
 */

import type { TeosTool } from './index';
import { queryAllDBs } from './helpers';

export const worldTools: TeosTool[] = [
    {
        name: 'getCellDetails',
        description: 'Get details about a cell/location: name, region, and NPCs/creatures present. Searches across the active plugin AND master files. Useful for placing quest content in specific locations.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Cell name to search for (partial match supported)',
                },
            },
            required: ['name'],
        },
        execute: async (params) => {
            const name = (params.name as string).toLowerCase();
            try {
                const cells = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Cell')
                        .filter((r: Record<string, unknown>) =>
                            ((r.id as string) || '').toLowerCase().includes(name) ||
                            ((r.name as string) || '').toLowerCase().includes(name),
                        )
                        .limit(10)
                        .toArray();
                }, 10);

                if (!cells.length) return { error: `No cells matching "${name}" found in active plugin or masters` };

                const results = cells.map((cell) => {
                    const refs = (cell.references || []) as Record<string, unknown>[];

                    // Extract NPC/creature references
                    const npcs = refs
                        .filter(r => {
                            const id = ((r.id as string) || '').toLowerCase();
                            return r.type === 'Npc' || r.type === 'Creature' ||
                                id.includes('npc') || id.includes('_');
                        })
                        .slice(0, 20)
                        .map(r => r.id);

                    return {
                        id: cell.id,
                        name: cell.name || cell.id,
                        region: cell.region ?? null,
                        flags: cell.flags ?? null,
                        referenceCount: refs.length,
                        npcs: npcs.length ? npcs : undefined,
                        source: cell._source,
                    };
                });

                return { count: results.length, cells: results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'listFactions',
        description: 'List all factions with their IDs, names, and rank names. Searches across the active plugin AND master files. Essential for setting correct faction filters in dialogue entries.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'Optional text filter for faction name/ID',
                },
            },
        },
        execute: async (params) => {
            const filter = (params.filter as string)?.toLowerCase();
            try {
                const factions = await queryAllDBs(async (db) => {
                    let query = db.table('pluginData')
                        .where('type').equals('Faction');

                    if (filter) {
                        query = query.filter((r: Record<string, unknown>) => {
                            const id = ((r.id as string) || '').toLowerCase();
                            const name = ((r.name as string) || '').toLowerCase();
                            return id.includes(filter) || name.includes(filter);
                        });
                    }

                    return query.limit(30).toArray();
                }, 30);

                const results = factions.map((f) => {
                    const ranks = (f.ranks || []) as Record<string, unknown>[];
                    return {
                        id: f.id,
                        name: f.name,
                        ranks: ranks.map((r, i) => ({
                            index: i,
                            name: r.name || r,
                        })),
                        hidden: f.hidden ?? false,
                        source: f._source,
                    };
                });

                return { count: results.length, factions: results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
