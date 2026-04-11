/**
 * AI Tools — Editor context & script usage (getContext, searchByScript)
 */

import type { TeosTool } from './index';
import { getActiveDB } from '@/api/db';
import { useScriptTabs } from '@/stores/scriptTabs';

export const editorTools: TeosTool[] = [
    {
        name: 'getContext',
        description: 'Get the current editor context: which script is open, what plugins are loaded, etc.',
        parameters: {
            type: 'object',
            properties: {},
        },
        execute: async () => {
            try {
                const store = useScriptTabs();
                const tabs = store.tabs || [];
                const activeTabId = store.activeTabId;

                const context: Record<string, unknown> = {
                    openTabs: tabs.map((t: Record<string, unknown>) => t.id),
                    activeTab: activeTabId,
                };

                const activeTab = tabs.find((t: Record<string, unknown>) => t.id === activeTabId);
                if (activeTab) {
                    const code = (activeTab as Record<string, unknown>).unsavedCode as string | undefined;
                    if (code && code.length < 3000) {
                        context.activeScript = code;
                    } else if (code) {
                        context.activeScript = code.slice(0, 1500) + '\n... (truncated)';
                    }
                }

                return context;
            } catch {
                return { openTabs: [], activeTab: null };
            }
        },
    },
    {
        name: 'searchByScript',
        description: 'Find all records (NPCs, objects, etc.) that have a specific script attached. Useful for understanding what a script affects.',
        parameters: {
            type: 'object',
            properties: {
                scriptName: {
                    type: 'string',
                    description: 'The script name to search for',
                },
            },
            required: ['scriptName'],
        },
        execute: async (params) => {
            const scriptName = (params.scriptName as string).toLowerCase();
            try {
                const db = await getActiveDB();

                // Search across all record types that can have scripts
                const records = await db.table('pluginData')
                    .filter((r: Record<string, unknown>) =>
                        ((r.script as string) || '').toLowerCase() === scriptName,
                    )
                    .limit(30)
                    .toArray();

                const results = records.map((r: Record<string, unknown>) => ({
                    id: r.id,
                    name: r.name ?? null,
                    type: r.type,
                    script: r.script,
                }));

                return { count: results.length, records: results };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'getPluginDiff',
        description: 'Show what the active plugin adds or modifies compared to master files. Lists all records that exist in the active plugin (new entries and overrides). Useful for reviewing changes before export.',
        parameters: {
            type: 'object',
            properties: {
                recordType: {
                    type: 'string',
                    description: 'Optional: filter by record type (e.g. "DialogueInfo", "Script", "Npc")',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results (default 50)',
                },
            },
        },
        execute: async (params) => {
            const recordType = params.recordType as string | undefined;
            const limit = (params.limit as number) || 50;
            try {
                const db = await getActiveDB();

                // Active plugin entries have TMP_is_active = true
                let query = db.table('pluginData')
                    .filter((r: Record<string, unknown>) => r.TMP_is_active === true);

                if (recordType) {
                    query = db.table('pluginData')
                        .where('type').equals(recordType)
                        .filter((r: Record<string, unknown>) => r.TMP_is_active === true);
                }

                const records = await query.limit(limit).toArray();

                // Group by type
                const byType: Record<string, { id: string; name?: string }[]> = {};
                for (const r of records) {
                    const type = r.type as string;
                    if (!byType[type]) byType[type] = [];
                    byType[type].push({
                        id: (r.id as string) || (r.TMP_id as string) || '',
                        name: r.name as string | undefined,
                    });
                }

                // Summary
                const summary = Object.entries(byType).map(([type, items]) => ({
                    type,
                    count: items.length,
                    items: items.slice(0, 10),
                }));

                return {
                    totalModified: records.length,
                    byType: summary,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'getBookContent',
        description: 'Read the text content of a book by name or ID. Books in Morrowind contain HTML-formatted text with lore, instructions, and quest clues.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Book name or ID to look up',
                },
            },
            required: ['name'],
        },
        execute: async (params) => {
            const name = (params.name as string).toLowerCase();
            try {
                const db = await getActiveDB();

                const book = await db.table('pluginData')
                    .where('type').equals('Book')
                    .filter((r: Record<string, unknown>) =>
                        ((r.id as string) || '').toLowerCase().includes(name) ||
                        ((r.name as string) || '').toLowerCase().includes(name),
                    )
                    .first();

                if (!book) return { error: `Book matching "${name}" not found` };

                // Strip HTML tags for readable text
                const rawText = (book.text as string) || '';
                const plainText = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                return {
                    id: book.id,
                    name: book.name,
                    weight: book.weight ?? null,
                    value: book.value ?? null,
                    enchantment: book.enchantment ?? null,
                    script: book.script ?? null,
                    isScroll: book.scroll ?? false,
                    textLength: rawText.length,
                    text: plainText.slice(0, 2000),
                    rawHtml: rawText.length < 3000 ? rawText : rawText.slice(0, 3000) + '... (truncated)',
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
