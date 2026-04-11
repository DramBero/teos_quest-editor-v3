/**
 * AI Tools — NPC & Item queries (getNPCDetails, searchItems)
 */

import type { TeosTool } from './index';
import { getActiveDB } from '@/api/db';

const ITEM_TYPES = [
    'Weapon', 'Armor', 'Clothing', 'Miscellaneous',
    'Ingredient', 'Potion', 'Book', 'Apparatus',
    'Lockpick', 'Probe', 'Repair', 'Light',
];

export const npcTools: TeosTool[] = [
    {
        name: 'getNPCDetails',
        description: 'Get detailed info about a specific NPC: race, class, faction, stats, inventory, spells, and attached script.',
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
                const db = await getActiveDB();
                const npc = await db.table('pluginData')
                    .where('type').equals('Npc')
                    .filter((r: Record<string, unknown>) =>
                        (r.id as string)?.toLowerCase() === name.toLowerCase() ||
                        (r.name as string)?.toLowerCase() === name.toLowerCase(),
                    )
                    .first();

                if (!npc) return { error: `NPC "${name}" not found` };

                const result: Record<string, unknown> = {
                    id: npc.id,
                    name: npc.name,
                    race: npc.race,
                    class: npc.class,
                    faction: npc.faction,
                    rank: npc.rank,
                    level: npc.level,
                    script: npc.script,
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
        description: 'Search for items (weapons, armor, clothing, potions, ingredients, books, etc.) by name or ID. Returns item details including type, name, weight, and value.',
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
                const db = await getActiveDB();

                const typesToSearch = itemType
                    ? [itemType.charAt(0).toUpperCase() + itemType.slice(1)]
                    : ITEM_TYPES;

                const results: Record<string, unknown>[] = [];

                for (const type of typesToSearch) {
                    if (results.length >= limit) break;

                    const items = await db.table('pluginData')
                        .where('type').equals(type)
                        .filter((r: Record<string, unknown>) => {
                            const id = ((r.id as string) || '').toLowerCase();
                            const name = ((r.name as string) || '').toLowerCase();
                            return id.includes(query) || name.includes(query);
                        })
                        .limit(limit - results.length)
                        .toArray();

                    for (const item of items) {
                        results.push({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            weight: item.weight ?? null,
                            value: item.value ?? null,
                            script: item.script ?? null,
                            enchantment: item.enchantment ?? null,
                        });
                    }
                }

                return { count: results.length, items: results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
