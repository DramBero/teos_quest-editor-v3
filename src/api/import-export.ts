import {
    getActiveDB,
    getActiveHeader,
    initPlugin,
    invalidateDependencyCache,
    _getDatabases,
    GENERIC_TMP,
} from './db';
import { logger } from '@/services/logger';
import type { BaseEntry } from '@/types/pluginEntries';
import type { TES3_Record } from '@/types/tes3';

// ---------------------------------------------------------------------------
//  Entry CRUD
// ---------------------------------------------------------------------------

export async function modifyEntry(entry: BaseEntry): Promise<BaseEntry | undefined> {
    const activeDB = await getActiveDB();
    try {
        const count = await activeDB.pluginData
            .where('TMP_index')
            .equals(entry.TMP_index)
            .modify(entry);
        return count > 0 ? entry : undefined;
    } catch (error) {
        logger.error('CRUD', 'Failed to modify entry', error);
        return undefined;
    }
}

export async function addEntry(entry: Partial<BaseEntry>, locationIndex?: number): Promise<void> {
    const header = await getActiveHeader();
    const index = locationIndex || header.num_objects + 1;
    const pluginName = header.TMP_dep;

    const newEntry: Record<string, unknown> = {
        ...GENERIC_TMP,
        ...entry,
        TMP_index: index,
        TMP_dep: pluginName,
    };

    const activeDB = await getActiveDB();

    if (locationIndex) {
        let nextEntry: BaseEntry | undefined = await activeDB.pluginData
            .where('TMP_index')
            .above(locationIndex)
            .limit(1)
            .first();
        if (!nextEntry) {
            nextEntry = await activeDB.pluginData.orderBy('TMP_index').last();
            newEntry.TMP_index = (nextEntry?.TMP_index ?? 0) + 1;
        } else {
            newEntry.TMP_index = locationIndex + (nextEntry.TMP_index - locationIndex) / 2;
        }
    }

    await activeDB.pluginData.add(newEntry);
    await activeDB.pluginData
        .where('type')
        .equals('Header')
        .modify({ num_objects: header.num_objects + 1 });
}

export async function deleteEntry(entry: BaseEntry): Promise<void> {
    const activeDB = await getActiveDB();
    await activeDB.pluginData.delete(entry.TMP_index);
    const header = await getActiveHeader();
    await activeDB.pluginData
        .where('type')
        .equals('Header')
        .modify({ num_objects: header.num_objects - 1 });
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

    const entries: Record<string, unknown>[] = [];

    for (let index = 0; index < pluginData.length; index++) {
        const record = pluginData[index];
        let dialogueEntry: Record<string, unknown>;

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

            dialogueEntry = {
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
            dialogueEntry = {
                type: '',
                ...GENERIC_TMP,
                ...record,
                TMP_id: record.id || '',
                TMP_dep: pluginName,
                TMP_is_active: isActive,
                TMP_index: index,
            };
        }

        entries.push(dialogueEntry);
    }

    // Chunked bulkAdd with progress reporting
    const total = entries.length;
    logger.info('Import', `Importing ${total} records for "${pluginName}"`);
    for (let i = 0; i < total; i += BULK_CHUNK_SIZE) {
        const chunk = entries.slice(i, i + BULK_CHUNK_SIZE);
        await pluginDB.pluginData.bulkAdd(chunk).catch((error: unknown) => {
            logger.error('Import', `Failed to import chunk at offset ${i}`, error);
        });
        onProgress?.(Math.min((i + chunk.length) / total, 1));
    }

    invalidateDependencyCache();
    logger.info('Import', `Import complete: ${total} records for "${pluginName}"`);
    return pluginDB;
}
