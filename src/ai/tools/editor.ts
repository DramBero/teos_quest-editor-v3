/**
 * AI Tools — Editor context, plugin diff, book/script search.
 *
 * - getContext: full editor state snapshot (sidebar, quest, NPC, scripts, modal)
 * - getPluginDiff: active-only changes vs masters
 * - searchByScript: find records using a specific script (across all DBs)
 * - getBookContent: read a book's text (across all DBs)
 */

import type { TeosTool } from './index';
import { queryAllDBs, findFirstAcrossDBs } from './helpers';
import { getActiveDB } from '@/api/db';
import { useScriptTabs } from '@/stores/scriptTabs';
import { useSidebar } from '@/stores/sidebar';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { useSelectedQuest } from '@/stores/selectedQuest';
import { useClassicView, useClassicViewTopic } from '@/stores/classicView';
import { usePrimaryModal } from '@/stores/modals';
import { useSelectedFilter } from '@/stores/selectedFilter';
import { useSelectedRecord } from '@/stores/selectedRecord';
import { useSessionStore } from '@/stores/session';

export const editorTools: TeosTool[] = [
    {
        name: 'getContext',
        description: 'Get the FULL current editor state: which sidebar is active, which quest/NPC/topic is selected, open script tabs with code, active modal, editing filters, record editor state, session info. Use this when you need detailed information beyond the summary in the system prompt.',
        parameters: {
            type: 'object',
            properties: {},
        },
        execute: async () => {
            const context: Record<string, unknown> = {};

            try {
                // Session info
                const session = useSessionStore();
                if (session.currentSession) {
                    context.session = {
                        pluginName: session.currentSession.pluginName,
                        changes: session.currentSession.changes,
                        dependencies: session.currentSession.dependencies,
                    };
                }

                // Sidebar
                const sidebar = useSidebar();
                context.sidebar = sidebar.activeItem || 'none';

                // Selected quest (full data)
                const questStore = useSelectedQuest();
                const quest = questStore.getSelectedQuest;
                const questName = questStore.getSelectedQuestName;
                if (quest || questName) {
                    context.quest = {
                        id: questName,
                        entryCount: quest?.entries?.length ?? 0,
                        entries: quest?.entries?.slice(0, 20)?.map((e: Record<string, unknown>) => ({
                            id: e.TMP_id || e.id,
                            index: (e.data as Record<string, unknown>)?.disposition ?? 0,
                            text: ((e.text as string) || '').slice(0, 200),
                            quest_state: e.quest_state,
                        })),
                    };
                }

                // Selected speaker (full data)
                const speakerStore = useSelectedSpeaker();
                const speaker = speakerStore.getSelectedSpeaker;
                if (speaker?.speakerId) {
                    context.speaker = {
                        id: speaker.speakerId,
                        name: speaker.speakerName,
                        type: speaker.speakerType,
                        // Include NPC record data if available
                        ...(speaker.speaker ? {
                            race: (speaker.speaker as Record<string, unknown>).race,
                            class: (speaker.speaker as Record<string, unknown>).class,
                            faction: (speaker.speaker as Record<string, unknown>).faction,
                        } : {}),
                    };
                }

                // Dialogue topic
                const topicStore = useClassicViewTopic();
                if (topicStore.classicViewTopic) {
                    context.dialogueTopic = topicStore.classicViewTopic;
                }

                // Classic view mode
                const classicStore = useClassicView();
                context.classicViewMode = classicStore.classicView;

                // Modal
                const modalStore = usePrimaryModal();
                if (modalStore.activeModal) {
                    context.activeModal = modalStore.activeModal;
                }

                // Selected filter
                const filterStore = useSelectedFilter();
                const filter = filterStore.getSelectedFilter;
                if (filter) {
                    context.selectedFilter = filter;
                }

                // Selected record (record editor)
                const recordStore = useSelectedRecord();
                const record = recordStore.getSelectedRecord;
                if (record && Array.isArray(record) && record.length > 0) {
                    context.editingRecord = record.map((r: Record<string, unknown>) => ({
                        id: r.id || r.TMP_id,
                        type: r.type,
                        name: r.name,
                    }));
                }

                // Script tabs (full code for active tab)
                const tabStore = useScriptTabs();
                context.scriptTabs = {
                    count: tabStore.tabs.length,
                    activeTabId: tabStore.activeTabId,
                    tabs: tabStore.tabs.map(t => ({
                        id: t.id,
                        isDirty: t.isDirty,
                    })),
                };

                if (tabStore.activeTab) {
                    const code = tabStore.activeTab.unsavedCode;
                    if (code && code.length < 5000) {
                        context.activeScriptCode = code;
                    } else if (code) {
                        context.activeScriptCode = code.slice(0, 3000) + '\n... (truncated)';
                    }
                }
            } catch {
                return { error: 'Stores not available' };
            }

            return context;
        },
    },
    {
        name: 'searchByScript',
        description: 'Find all records (NPCs, objects, etc.) that have a specific script attached. Searches across the active plugin AND master files. Useful for understanding what a script affects.',
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
                const records = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .filter((r: Record<string, unknown>) =>
                            ((r.script as string) || '').toLowerCase() === scriptName,
                        )
                        .limit(30)
                        .toArray();
                }, 30);

                const results = records.map((r) => ({
                    id: r.id,
                    name: r.name ?? null,
                    type: r.type,
                    script: r.script,
                    source: r._source,
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
        description: 'Read the text content of a book by name or ID. Searches across the active plugin AND master files. Books in Morrowind contain HTML-formatted text with lore, instructions, and quest clues.',
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
                const book = await findFirstAcrossDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Book')
                        .filter((r: Record<string, unknown>) =>
                            ((r.id as string) || '').toLowerCase().includes(name) ||
                            ((r.name as string) || '').toLowerCase().includes(name),
                        )
                        .first();
                });

                if (!book) return { error: `Book matching "${name}" not found in active plugin or masters` };

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
                    source: book._source,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
