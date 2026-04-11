/**
 * AI Insert — functions to insert AI-generated quest/dialogue data
 * into the editor's IndexedDB via the existing journal/dialogue APIs.
 */

import { addJournalQuest, addQuestEntry } from '@/api/journal';
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
 * Insert dialogue entries — currently shows instructions since dialogue
 * insertion requires complex linked-list and location logic.
 * Future: direct API integration.
 */
export async function insertDialogue(data: AiDialogueData): Promise<InsertResult> {
    // Dialogue insertion is complex — requires knowing the exact linked-list
    // position, existing entries, speaker type resolution, etc.
    // For now, copy the data to clipboard as a structured format the user
    // can reference while manually adding entries.
    const summary = data.entries.map((e, i) =>
        `Entry ${i + 1}: [${e.speaker_id || 'any'}] "${e.text.slice(0, 60)}..."`,
    ).join('\n');

    try {
        const clipText = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(clipText);
        return {
            success: true,
            message: `Dialogue data copied to clipboard (${data.entries.length} entries).\n${summary}\n\nUse the Dialogue editor to add these entries.`,
            inserted: data.entries.length,
        };
    } catch {
        return {
            success: true,
            message: `Dialogue "${data.topic}" (${data.type}) with ${data.entries.length} entries ready.\n${summary}\n\nNote: Auto-insert for dialogue is not yet available. Use the Dialogue editor to add entries manually.`,
            inserted: 0,
        };
    }
}
