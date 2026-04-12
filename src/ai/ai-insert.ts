/**
 * AI Insert — functions to insert AI-generated quest/dialogue data
 * into the editor's IndexedDB via the existing journal/dialogue APIs.
 */

import { addJournalQuest, addQuestEntry } from '@/api/journal';
import { addDialogueEntry } from '@/api/dialogue';
import { logger } from '@/services/logger';

// ---------------------------------------------------------------------------
//  Types for structured AI output
// ---------------------------------------------------------------------------

export interface AiJournalEntry {
    index: number;
    text: string;
    finished?: boolean;
}

export interface AiJournalData {
    questId: string;
    questName: string;
    entries: AiJournalEntry[];
}

export interface AiDialogueFilter {
    type: string;     // "Journal", "ID", "Race", "Faction", etc.
    id: string;       // filter value (quest ID, NPC ID, race name, etc.)
    comp?: string;    // ">=", "<=", "==", "!="
    value?: number;   // numeric value for Journal/Item checks
}

export interface AiDialogueEntryData {
    speaker_id?: string;
    text: string;
    filters?: AiDialogueFilter[];
    result?: string;  // Results box script
}

export interface AiDialogueData {
    topic: string;
    type: string;     // "Topic", "Greeting 0"-"Greeting 9", "Voice", "Persuasion"
    entries: AiDialogueEntryData[];
}

// ---------------------------------------------------------------------------
//  Parse helpers
// ---------------------------------------------------------------------------

export function parseJournalBlock(jsonText: string): AiJournalData | null {
    try {
        const data = JSON.parse(jsonText);
        if (!data.questId || !data.entries?.length) return null;
        return data as AiJournalData;
    } catch {
        return null;
    }
}

export function parseDialogueBlock(jsonText: string): AiDialogueData | null {
    try {
        const data = JSON.parse(jsonText);
        if (!data.topic || !data.entries?.length) return null;
        return data as AiDialogueData;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
//  Insert operations
// ---------------------------------------------------------------------------

export interface InsertResult {
    success: boolean;
    message: string;
    inserted?: number;
}

/**
 * Insert a complete journal quest with all entries.
 */
export async function insertJournal(data: AiJournalData): Promise<InsertResult> {
    try {
        // Create the quest
        await addJournalQuest(data.questId, data.questName);

        // Add each entry sequentially (they build on each other via linked list)
        let inserted = 0;
        for (const entry of data.entries) {
            try {
                await addQuestEntry(data.questId, entry.text, '', '');
                inserted++;
            } catch (err) {
                const errObj = err as Record<string, unknown>;
                // Skip and continue on individual entry errors
                logger.warn('AI Insert', `Failed to add entry ${entry.index}`, errObj.key || err);
            }
        }

        return {
            success: true,
            message: `Quest "${data.questId}" created with ${inserted} entries`,
            inserted,
        };
    } catch (err) {
        return {
            success: false,
            message: `Failed to create quest: ${(err as Record<string, unknown>).key || err}`,
        };
    }
}

/**
 * Insert dialogue entries directly into the plugin via addDialogueEntry API.
 * Handles linked-list insertion, speaker type routing, and post-creation
 * script patching. Falls back to clipboard if direct insert fails.
 */
export async function insertDialogue(data: AiDialogueData): Promise<InsertResult> {
    let inserted = 0;
    const errors: string[] = [];

    try {
        for (const entry of data.entries) {
            try {
                const speakerType = entry.speaker_id ? 'npc' : '';

                await addDialogueEntry(
                    entry.speaker_id || '',  // speakerId
                    data.topic,              // topicId
                    data.type,               // dialogueType
                    speakerType,             // speakerType
                    '',                      // entryId (auto-generate)
                    '',                      // prevId (auto-locate)
                    '',                      // nextId (auto-locate)
                    entry.text,              // text
                );

                // If result script is provided, patch the just-created entry
                if (entry.result) {
                    try {
                        const { editScriptText } = await import('@/api/dialogue');
                        const { getActiveDB } = await import('@/api/db');
                        const db = await getActiveDB();

                        // Find the last entry in this topic with TMP_is_active
                        const topicEntries = await db.table('pluginData')
                            .where('TMP_topic').equals(data.topic)
                            .filter((r: Record<string, unknown>) =>
                                r.type === 'DialogueInfo' && r.TMP_is_active === true,
                            )
                            .toArray();

                        // Highest TMP_index = most recently added
                        const lastEntry = [...topicEntries].sort(
                            (a, b) => (b.TMP_index as number) - (a.TMP_index as number),
                        )[0];

                        if (lastEntry?.TMP_info_id) {
                            await editScriptText(lastEntry.TMP_info_id as string, entry.result);
                        }
                    } catch (scriptErr) {
                        logger.warn('AI Insert', `Script patch failed for "${entry.text.slice(0, 30)}..."`, scriptErr);
                    }
                }

                inserted++;
            } catch (err) {
                const msg = `Entry "${entry.text.slice(0, 40)}...": ${err}`;
                errors.push(msg);
                logger.warn('AI Insert', msg);
            }
        }

        if (inserted > 0) {
            return {
                success: true,
                message: `Dialogue "${data.topic}" (${data.type}): ${inserted}/${data.entries.length} entries inserted directly.${errors.length ? `\n⚠️ ${errors.length} failed: ${errors.join('; ')}` : ''}`,
                inserted,
            };
        }

        // All failed — fall back to clipboard
        return fallbackToClipboard(data);
    } catch (err) {
        logger.error('AI Insert', 'insertDialogue failed completely, falling back to clipboard', err);
        return fallbackToClipboard(data);
    }
}

/** Fallback: copy dialogue data to clipboard when direct insert fails */
async function fallbackToClipboard(data: AiDialogueData): Promise<InsertResult> {
    const summary = data.entries.map((e, i) =>
        `Entry ${i + 1}: [${e.speaker_id || 'any'}] "${e.text.slice(0, 60)}..."`,
    ).join('\n');

    try {
        const clipText = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(clipText);
        return {
            success: true,
            message: `Direct insert failed. Dialogue data copied to clipboard (${data.entries.length} entries).\n${summary}\n\nUse the Dialogue editor to add entries manually.`,
            inserted: 0,
        };
    } catch {
        return {
            success: false,
            message: `Failed to insert dialogue "${data.topic}". ${data.entries.length} entries could not be added.`,
            inserted: 0,
        };
    }
}
