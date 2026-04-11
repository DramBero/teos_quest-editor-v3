import {
    getActiveDB,
    getActiveHeader,
    initPlugin,
    invalidateDependencyCache,
    _getDatabases,
    GENERIC_TMP,
} from './db';
import { ref } from 'vue';
import { logger } from '@/services/logger';
import type { BaseEntry } from '@/types/pluginEntries';
import { useSessionStore } from '@/stores/session';
import type { TES3_Record } from '@/types/tes3';

// ---------------------------------------------------------------------------
//  Reactive mutation counter — watchers can react to DB add/delete
// ---------------------------------------------------------------------------
export const dbMutationVersion = ref(0);

// ---------------------------------------------------------------------------
//  Entry CRUD
// ---------------------------------------------------------------------------

export async function modifyEntry(entry: BaseEntry): Promise<BaseEntry | undefined> {
    const activeDB = await getActiveDB();
    try {
        // Strip Vue reactive proxies – IDB structured clone cannot handle them
        const plain = JSON.parse(JSON.stringify(entry));
        const count = await activeDB.pluginData
            .where('TMP_index')
            .equals(entry.TMP_index)
            .modify(plain);
        if (count > 0) useSessionStore().incrementChanges();
        return count > 0 ? entry : undefined;
    } catch (error) {
        logger.error('CRUD', 'Failed to modify entry', error);
        return undefined;
    }
}

export async function addEntry(entry: Record<string, unknown>, locationIndex?: number): Promise<void> {
    try {
        const header = await getActiveHeader();
        const pluginName = header.TMP_dep;
        const activeDB = await getActiveDB();

        // Find a safe TMP_index: always use max existing + 1 to avoid collisions
        let index: number;
        if (locationIndex) {
            index = locationIndex;
        } else {
            const last = await activeDB.pluginData.orderBy('TMP_index').last();
            index = (last?.TMP_index ?? 0) + 1;
        }

        const newEntry: Record<string, unknown> = {
            ...GENERIC_TMP,
            ...entry,
            TMP_index: index,
            TMP_dep: pluginName,
        };

        if (locationIndex) {
            let nextEntry: BaseEntry | undefined = await activeDB.pluginData
                .where('TMP_index')
                .above(locationIndex)
                .limit(1)
                .first();
            if (!nextEntry) {
                const lastEntry = await activeDB.pluginData.orderBy('TMP_index').last();
                newEntry.TMP_index = (lastEntry?.TMP_index ?? 0) + 1;
            } else {
                newEntry.TMP_index = locationIndex + (nextEntry.TMP_index - locationIndex) / 2;
            }
        }

        await activeDB.pluginData.add(newEntry);
        await activeDB.pluginData
            .where('type')
            .equals('Header')
            .modify({ num_objects: header.num_objects + 1 });
        dbMutationVersion.value++;
        useSessionStore().incrementChanges();
    } catch (error) {
        logger.error('CRUD', 'Failed to add entry', error);
    }
}

export async function deleteEntry(entry: BaseEntry): Promise<void> {
    try {
        const activeDB = await getActiveDB();
        await activeDB.pluginData.delete(entry.TMP_index);
        const header = await getActiveHeader();
        await activeDB.pluginData
            .where('type')
            .equals('Header')
            .modify({ num_objects: header.num_objects - 1 });
        dbMutationVersion.value++;
        useSessionStore().incrementChanges();
    } catch (error) {
        logger.error('CRUD', 'Failed to delete entry', error);
    }
}

// ---------------------------------------------------------------------------
//  Dirtied entries — CS touched but didn't change content
// ---------------------------------------------------------------------------

/**
 * Strip internal/TMP fields for content comparison.
 */
const stripInternalFields = (obj: Record<string, unknown>) =>
    Object.fromEntries(
        Object.entries(obj).filter(
            ([k]) => !k.includes('_id') && !k.startsWith('TMP_') && k !== 'old_values',
        ),
    );

/**
 * Compare two entries ignoring internal/TMP fields.
 * Returns true if the entry is "dirtied" (content identical to previous version).
 */
function isDirtied(entry: BaseEntry): boolean {
    const ov = entry.old_values;
    if (!ov || ov.length < 2) return false;

    const prev = ov[ov.length - 2] as Record<string, unknown>;
    return JSON.stringify(stripInternalFields(prev))
        === JSON.stringify(stripInternalFields(entry as unknown as Record<string, unknown>));
}

/**
 * Returns all dirtied entries from the **active plugin only**.
 */
export async function getDirtiedEntries(): Promise<BaseEntry[]> {
    const activeDB = await getActiveDB();
    const all = await activeDB.pluginData.toArray() as BaseEntry[];
    return all.filter(isDirtied);
}

/**
 * Bulk-delete entries by TMP_index and update header count.
 */
export async function bulkDeleteEntries(entries: BaseEntry[]): Promise<number> {
    if (entries.length === 0) return 0;
    try {
        const activeDB = await getActiveDB();
        const keys = entries.map(e => e.TMP_index);
        await activeDB.pluginData.bulkDelete(keys);
        const header = await getActiveHeader();
        await activeDB.pluginData
            .where('type')
            .equals('Header')
            .modify({ num_objects: header.num_objects - entries.length });
        dbMutationVersion.value++;
        useSessionStore().incrementChanges();
        return entries.length;
    } catch (error) {
        logger.error('CRUD', 'Failed to bulk-delete entries', error);
        return 0;
    }
}

// ---------------------------------------------------------------------------
//  Index shifting
// ---------------------------------------------------------------------------

export async function shiftIndexes(index: number): Promise<void> {
    const activeDB = await getActiveDB();
    const entries: BaseEntry[] = await activeDB.pluginData
        .where('TMP_index')
        .aboveOrEqual(index)
        .toArray();
    if (!entries.length) return;

    await activeDB.transaction('rw', activeDB.pluginData, async () => {
        // Delete old keys first to avoid unique-constraint conflicts
        await activeDB.pluginData.bulkDelete(entries.map((e) => e.TMP_index));
        for (const e of entries) e.TMP_index += 1;
        await activeDB.pluginData.bulkAdd(entries);
    });
}

export async function unshiftIndexes(index: number): Promise<void> {
    const activeDB = await getActiveDB();
    const entries: BaseEntry[] = await activeDB.pluginData
        .where('TMP_index')
        .aboveOrEqual(index)
        .toArray();
    if (!entries.length) return;

    await activeDB.transaction('rw', activeDB.pluginData, async () => {
        await activeDB.pluginData.bulkDelete(entries.map((e) => e.TMP_index));
        for (const e of entries) e.TMP_index -= 1;
        await activeDB.pluginData.bulkAdd(entries);
    });
}

// ---------------------------------------------------------------------------
//  Plugin import / export
// ---------------------------------------------------------------------------

export async function pluginToJSON(): Promise<Record<string, unknown>[] | undefined> {
    try {
        const activeDB = await getActiveDB();
        const entries: BaseEntry[] = await activeDB.pluginData.toArray();
        return entries.map((entry: Record<string, unknown>) => {
            const clean: Record<string, unknown> = {};
            for (const key of Object.keys(entry)) {
                if (!key.startsWith('TMP_')) {
                    clean[key] = entry[key];
                }
            }
            return clean;
        });
    } catch (error) {
        logger.error('Export', 'Failed to export plugin to JSON', error);
        return undefined;
    }
}

const BULK_CHUNK_SIZE = 5000;

/** Raw record from WASM parser before TMP_ fields are injected */
type RawRecord = Partial<TES3_Record> & Record<string, unknown>;

export async function importPlugin(
    pluginData: RawRecord[],
    pluginKey: string,
    pluginName: string,
    isActive: boolean,
    onProgress?: (ratio: number) => void,
) {
    let dialogueType: string | undefined;
    let dialogueId: string | undefined;
    const pluginDB = await initPlugin(pluginKey);
    const tableLength = await pluginDB.pluginData.count();
    if (tableLength) {
        await pluginDB.pluginData.clear();
    }

    const total = pluginData.length;
    logger.info('Import', `Importing ${total} records for "${pluginName}"`);

    // Process in streaming chunks — never hold all entries at once
    let chunk: Record<string, unknown>[] = [];

    for (let index = 0; index < total; index++) {
        const record = pluginData[index];
        // Free source record to allow GC to reclaim memory progressively
        (pluginData as unknown as (RawRecord | null)[])[index] = null;

        let entry: Record<string, unknown>;

        if (['DialogueInfo', 'Dialogue'].includes(record.type as string)) {
            let TMP_quest_name = '';
            if (record.type === 'Dialogue') {
                dialogueType = record.dialogue_type as string | undefined;
                if (record.id) {
                    dialogueId = record.id as string;
                    if (dialogueType === 'Journal') {
                        const next = pluginData[index + 1];
                        TMP_quest_name =
                            next?.quest_state === 'Name'
                                ? (next?.text as string) || ''
                                : '';
                    }
                }
            }

            entry = {
                type: '',
                ...record,
                TMP_id: record.id || '',
                TMP_topic: dialogueId,
                TMP_type: dialogueType,
                TMP_info_id: record.id,
                TMP_prev_id: record.prev_id,
                TMP_next_id: record.next_id,
                TMP_speaker_id: record.speaker_id,
                TMP_speaker_cell: record.speaker_cell,
                TMP_speaker_faction: record.speaker_faction,
                TMP_speaker_class: record.speaker_class,
                TMP_speaker_race: record.speaker_race,
                TMP_dep: pluginName,
                TMP_is_active: isActive,
                TMP_index: index,
                TMP_quest_name,
            };
        } else {
            entry = {
                type: '',
                ...GENERIC_TMP,
                ...record,
                TMP_id: record.id || '',
                TMP_dep: pluginName,
                TMP_is_active: isActive,
                TMP_index: index,
            };
        }

        chunk.push(entry);

        // Flush chunk when full or at end
        if (chunk.length >= BULK_CHUNK_SIZE || index === total - 1) {
            await pluginDB.pluginData.bulkAdd(chunk).catch((error: unknown) => {
                logger.error('Import', `Failed to import chunk at offset ${index - chunk.length + 1}`, error);
            });
            onProgress?.(Math.min((index + 1) / total, 1));
            chunk = []; // release for GC
        }
    }

    invalidateDependencyCache();
    logger.info('Import', `Import complete: ${total} records for "${pluginName}"`);
    return pluginDB;
}
