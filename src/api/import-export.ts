import {
    getActiveDB,
    getActiveHeader,
    getDependencies,
    initPlugin,
    invalidateDependencyCache,
    _getDatabases,
    GENERIC_TMP,
} from './db';

// ---------------------------------------------------------------------------
//  Entry CRUD
// ---------------------------------------------------------------------------

export async function modifyEntry(entry: any) {
    const activeDB = await getActiveDB();
    try {
        await activeDB.pluginData
            .where('TMP_index')
            .equals(entry.TMP_index)
            .modify(entry);
        return activeDB.pluginData.where('TMP_index').equals(entry.TMP_index).first();
    } catch (error) {
        console.error(error);
    }
}

export async function addEntry(entry: any, locationIndex?: number) {
    const header = await getActiveHeader();
    const index = locationIndex || header.num_objects + 1;
    const pluginName = header.TMP_dep;
    const databases = _getDatabases();

    const newEntry = {
        ...GENERIC_TMP,
        ...entry,
        TMP_index: index,
        TMP_dep: pluginName,
        TMP_is_active: true,
    };

    const activeDB = databases['activePlugin'];

    if (locationIndex) {
        let nextEntry = await activeDB.pluginData
            .where('TMP_index')
            .above(locationIndex)
            .limit(1)
            .first();
        if (!nextEntry) {
            nextEntry = await activeDB.pluginData.orderBy('TMP_index').last();
            newEntry.TMP_index = nextEntry.TMP_index + 1;
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

export async function deleteEntry(entry: any) {
    if (entry.TMP_is_active) {
        const databases = _getDatabases();
        const activeDB = databases['activePlugin'];
        await activeDB.pluginData.delete(entry.TMP_index);
        const header = await getActiveHeader();
        await activeDB.pluginData
            .where('type')
            .equals('Header')
            .modify({ num_objects: header.num_objects - 1 });
    } else {
        throw { key: 'MASTER_ENTRY_DELETION_NOT_IMPLEMENTED' };
    }
}

// ---------------------------------------------------------------------------
//  Index shifting
// ---------------------------------------------------------------------------

export async function shiftIndexes(index: number) {
    const databases = _getDatabases();
    const activeDB = databases['activePlugin'];
    const lastEntry = await activeDB.pluginData.orderBy('TMP_index').last();
    const lastEntryIndex = lastEntry.TMP_index;

    const indexes: number[] = [];
    for (let i = index; i <= lastEntryIndex; i++) {
        indexes.push(i);
    }
    indexes.reverse();

    if (!indexes.length) return;

    await activeDB.transaction('rw', activeDB.pluginData, async () => {
        for (const currentIndex of indexes) {
            await activeDB.pluginData
                .where('TMP_index')
                .equals(currentIndex)
                .modify({ TMP_index: currentIndex + 1 });
        }
    });
}

export async function unshiftIndexes(index: number) {
    const databases = _getDatabases();
    const activeDB = databases['activePlugin'];
    const lastEntry = await activeDB.pluginData.orderBy('TMP_index').last();
    const lastEntryIndex = lastEntry.TMP_index;

    const indexes: number[] = [];
    for (let i = index; i <= lastEntryIndex; i++) {
        indexes.push(i);
    }
    if (!indexes.length) return;

    await activeDB.transaction('rw', activeDB.pluginData, async () => {
        for (const currentIndex of indexes) {
            await activeDB.pluginData
                .where('TMP_index')
                .equals(currentIndex)
                .modify({ TMP_index: currentIndex - 1 });
        }
    });
}

// ---------------------------------------------------------------------------
//  Plugin import / export
// ---------------------------------------------------------------------------

export async function pluginToJSON() {
    try {
        const databases = _getDatabases();
        const entries = await databases['activePlugin'].pluginData.toArray();
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
        console.error(error);
    }
}

export async function importPlugin(
    pluginData: any[],
    pluginName: string,
    isActive: boolean,
) {
    let dialogueType: string | undefined;
    let dialogueId: string | undefined;
    const activePlugin = await initPlugin(isActive ? 'activePlugin' : pluginName);
    const tableLength = await activePlugin.pluginData.count();
    if (tableLength) {
        await activePlugin.pluginData.clear();
    }

    const entries: any[] = [];

    for (let index = 0; index < pluginData.length; index++) {
        const record = pluginData[index];
        let dialogueEntry: any;

        if (['DialogueInfo', 'Dialogue'].includes(record.type)) {
            let TMP_quest_name = '';
            if (record.type === 'Dialogue') {
                dialogueType = record.dialogue_type;
                if (record.id) {
                    dialogueId = record.id;
                    if (dialogueType === 'Journal') {
                        TMP_quest_name =
                            pluginData[index + 1]?.quest_state === 'Name'
                                ? pluginData[index + 1]?.text || ''
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
                ...record,
                TMP_id: record.id || '',
                TMP_topic: '',
                TMP_type: '',
                TMP_info_id: '',
                TMP_prev_id: '',
                TMP_next_id: '',
                TMP_speaker_id: '',
                TMP_speaker_cell: '',
                TMP_speaker_faction: '',
                TMP_speaker_class: '',
                TMP_speaker_race: '',
                TMP_dep: pluginName,
                TMP_is_active: isActive,
                TMP_index: index,
                TMP_quest_name: '',
            };
        }

        entries.push(dialogueEntry);
    }

    await activePlugin.transaction('rw', activePlugin.pluginData, async () => {
        await activePlugin.pluginData.bulkAdd(entries).catch((error: unknown) => {
            console.error('Dexie ERROR on importing:', error);
        });
    });

    invalidateDependencyCache();

    if (isActive) {
        const dependencies = await getDependencies();
        for (const dep of dependencies) {
            await initPlugin(dep);
        }
    }

    const databases = _getDatabases();
    return databases[isActive ? 'activePlugin' : pluginName];
}
