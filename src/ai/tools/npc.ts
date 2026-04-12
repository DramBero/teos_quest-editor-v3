/**
 * AI Tools — NPC & Item queries (getNPCDetails, searchItems)
 *
 * All queries search across active plugin + master files.
 */

import type { TeosTool } from './index';
import { queryAllDBs, findFirstAcrossDBs } from './helpers';

const ITEM_TYPES = [
    'Weapon', 'Armor', 'Clothing', 'Miscellaneous',
    'Ingredient', 'Potion', 'Book', 'Apparatus',
    'Lockpick', 'Probe', 'Repair', 'Light',
];

export const npcTools: TeosTool[] = [
    {
        name: 'getNPCDetails',
        description: 'Get detailed info about a specific NPC: race, class, faction, stats, inventory, spells, and attached script. Searches across the active plugin AND master files.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The NPC id/name to look up',
                },
            },
            required: ['name'],
        },
        execute: async (params) => {
            const name = params.name as string;
            try {
                const npc = await findFirstAcrossDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Npc')
                        .filter((r: Record<string, unknown>) =>
                            (r.id as string)?.toLowerCase() === name.toLowerCase() ||
                            (r.name as string)?.toLowerCase() === name.toLowerCase(),
                        )
                        .first();
                });

                if (!npc) return { error: `NPC "${name}" not found in active plugin or masters` };

                const result: Record<string, unknown> = {
                    id: npc.id,
                    name: npc.name,
                    race: npc.race,
                    class: npc.class,
                    faction: npc.faction,
                    rank: npc.rank,
                    level: npc.level,
                    script: npc.script,
                    source: npc._source,
                };

                if (npc.stats) result.stats = npc.stats;
                if (npc.ai_data) result.ai_data = npc.ai_data;
                if (npc.inventory) result.inventory = npc.inventory;
                if (npc.spells) result.spells = npc.spells;
                if (npc.ai_packages) result.ai_packages = npc.ai_packages;
                if (npc.travel_destinations) result.travel_destinations = npc.travel_destinations;

                return result;
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'searchItems',
        description: 'Search for items (weapons, armor, clothing, potions, ingredients, books, etc.) by name or ID across the active plugin AND master files. Returns item details including type, name, weight, and value, tagged with source.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Text to search for in item ID or name',
                },
                itemType: {
                    type: 'string',
                    description: 'Optional: filter by specific item type (Weapon, Armor, Clothing, Potion, Ingredient, Book, Miscellaneous, etc.)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default 20)',
                },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const query = (params.query as string).toLowerCase();
            const itemType = params.itemType as string | undefined;
            const limit = (params.limit as number) || 20;
            try {
                const typesToSearch = itemType
                    ? [itemType.charAt(0).toUpperCase() + itemType.slice(1)]
                    : ITEM_TYPES;

                // Search each item type across all DBs
                const allResults: { id: unknown; name: unknown; type: unknown; weight: unknown; value: unknown; script: unknown; enchantment: unknown; source: unknown }[] = [];

                for (const type of typesToSearch) {
                    if (allResults.length >= limit) break;

                    const remaining = limit - allResults.length;
                    const results = await queryAllDBs(async (db) => {
                        return db.table('pluginData')
                            .where('type').equals(type)
                            .filter((r: Record<string, unknown>) => {
                                const id = ((r.id as string) || '').toLowerCase();
                                const name = ((r.name as string) || '').toLowerCase();
                                return id.includes(query) || name.includes(query);
                            })
                            .limit(remaining)
                            .toArray();
                    }, remaining);

                    for (const item of results) {
                        allResults.push({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            weight: item.weight ?? null,
                            value: item.value ?? null,
                            script: item.script ?? null,
                            enchantment: item.enchantment ?? null,
                            source: item._source,
                        });
                    }
                }

                return { count: allResults.length, items: allResults };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
