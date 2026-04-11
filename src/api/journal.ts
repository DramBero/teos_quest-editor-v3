import {
    getActiveDB,
    getDependencies,
    _getDatabases,
} from './db';
import { Dialogues } from './collection';
import { addEntry, deleteEntry, modifyEntry } from './import-export';
import { logger } from '@/services/logger';
import type { DialogueInfoRecord } from '@/types/pluginEntries';

// ---------------------------------------------------------------------------
//  Quest retrieval
// ---------------------------------------------------------------------------

export async function fetchAllQuestIDs(masters = false) {
    return Dialogues
        .filter((val) => val.TMP_type === 'Journal')
        .acrossPlugins({ includeDeps: masters, reverseDeps: true });
}

export async function fetchQuestByID(questID: string) {
    const activeDB = await getActiveDB();
    const databases = _getDatabases();
    const quest = {
        name: '',
        old_names: [] as string[],
        entries: [] as DialogueInfoRecord[],
        entry_ids: [] as string[],
    };

    // Active plugin entries
    const entries = await activeDB.pluginData
        .where('TMP_topic')
        .equals(questID)
        .and((val: Record<string, unknown>) => val.type === 'DialogueInfo' && val.quest_state !== 'Name')
        .toArray();

    const nameEntries = await activeDB.pluginData
        .where('TMP_topic')
        .equals(questID)
        .and((val: Record<string, unknown>) => val.type === 'DialogueInfo' && val.quest_state === 'Name')
        .toArray();

    quest.name = nameEntries.length ? nameEntries[0].text : '';
    quest.entries.push(...entries);

    // Dependency entries
    const dependencies = await getDependencies();
    for (const dep of [...dependencies].reverse()) {
        const depDB = databases[dep];
        if (!depDB) continue;

        const currentEntryIds = quest.entries.map((val) => val.TMP_info_id);

        const depName = await depDB.pluginData
            .where('TMP_topic')
            .equals(questID)
            .and((val: Record<string, unknown>) => val.type === 'DialogueInfo' && val.quest_state === 'Name')
            .toArray();

        if (depName[0]?.text) {
            if (!quest.name) quest.name = depName[0].text;
            quest.old_names.push(depName[0].text);
        }

        const depEntries = await depDB.pluginData
            .where('TMP_topic')
            .equals(questID)
            .and((val: Record<string, unknown>) => val.type === 'DialogueInfo' && val.quest_state !== 'Name')
            .toArray();

        for (const entry of depEntries) {
            if (currentEntryIds.includes(entry.TMP_info_id)) {
                const questEntry = quest.entries.find(
                    (val) => val.TMP_info_id === entry.TMP_info_id,
                );
                if (questEntry?.old_entries?.length) {
                    questEntry.old_entries.push(entry);
                } else if (questEntry) {
                    questEntry.old_entries = [entry];
                }
            } else {
                quest.entries.push(entry);
            }
        }
    }

    return quest;
}

// ---------------------------------------------------------------------------
//  Entry modification (override-or-modify pattern)
// ---------------------------------------------------------------------------

/**
 * Modify a journal entry field. If entry is from a master, clones it to
 * the active plugin as an override. Returns the (possibly new) entry.
 */
export async function modifyJournalEntry(
    entry: DialogueInfoRecord,
    changes: Record<string, unknown>,
) {
    try {
        if (entry.TMP_is_active) {
            return await modifyEntry({
                TMP_index: entry.TMP_index,
                ...changes,
            } as unknown as DialogueInfoRecord);
        } else {
            const { TMP_index: _ti, TMP_dep: _td, TMP_is_active: _tia, ...entryData } =
                entry as unknown as Record<string, unknown>;
            const newEntry = { ...entryData, ...changes, TMP_is_active: true };
            await addEntry(newEntry);

            await ensureDialogueInActive(entry.TMP_topic);

            return newEntry;
        }
    } catch (error) {
        logger.error('Journal', 'Failed to modify journal entry', error);
    }
}

/**
 * Ensure the parent Dialogue record for a quest exists in the active plugin.
 * If it only exists in dependencies, clone it to the active plugin.
 */
export async function ensureDialogueInActive(questId: string) {
    let activeDB: Awaited<ReturnType<typeof getActiveDB>>;
    try {
        activeDB = await getActiveDB();
    } catch {
        return;
    }

    const existing = await activeDB.pluginData
        .where('TMP_id')
        .equals(questId)
        .and((val: Record<string, unknown>) => val.type === 'Dialogue')
        .toArray();

    if (existing.length > 0) {
        const rec = existing[0] as Record<string, unknown>;
        if (!rec.TMP_quest_name) {
            // Fix: existing clone has empty name — look it up from deps
            const databases = _getDatabases();
            const dependencies = await getDependencies();
            for (const dep of dependencies) {
                const depDB = databases[dep];
                if (!depDB) continue;
                const nameEntries = await depDB.pluginData
                    .where('TMP_topic')
                    .equals(questId)
                    .and((v: Record<string, unknown>) =>
                        v.type === 'DialogueInfo' && v.quest_state === 'Name')
                    .toArray();
                if (nameEntries.length) {
                    const name = nameEntries[0].text;
                    logger.debug('Journal', `[ensureDialogueInActive] patching TMP_quest_name: ${questId} → ${name}`);
                    await activeDB.pluginData.update(rec.TMP_index as number, { TMP_quest_name: name });
                    return;
                }
            }
        }

        return;
    }

    // Find in dependencies and clone
    const databases = _getDatabases();
    const dependencies = await getDependencies();

    for (const dep of dependencies) {
        const depDB = databases[dep];
        if (!depDB) continue;
        const depResponse = await depDB.pluginData
            .where('TMP_id')
            .equals(questId)
            .and((val: Record<string, unknown>) => val.type === 'Dialogue')
            .toArray();
        if (depResponse.length) {
            const original = depResponse.at(-1);
            // Strip dep-specific TMP fields before cloning to active plugin
            const { TMP_index: _, TMP_dep: __, TMP_is_active: ___, ...cleanData } =
                original as Record<string, unknown>;

            // Ensure TMP_quest_name is populated (dep records may not have it)
            if (!cleanData.TMP_quest_name) {
                const nameEntries = await depDB.pluginData
                    .where('TMP_topic')
                    .equals(questId)
                    .and((v: Record<string, unknown>) =>
                        v.type === 'DialogueInfo' && v.quest_state === 'Name')
                    .toArray();
                if (nameEntries.length) {
                    cleanData.TMP_quest_name = nameEntries[0].text;
                }
            }


            await addEntry(cleanData);
            return;
        }
    }
    logger.warn('Journal', `[ensureDialogueInActive] Dialogue not found in any dep: ${questId}`);
}

// ---------------------------------------------------------------------------
//  Quest / entry management
// ---------------------------------------------------------------------------

export async function addJournalQuest(id: string, name: string) {
    try {
        const generatedId =
            Math.random().toString().slice(2, 15) + Math.random().toString().slice(2, 9);

        const idEntry = {
            type: 'Dialogue',
            flags: '',
            id,
            dialogue_type: 'Journal',
            TMP_topic: id,
            TMP_type: 'Journal',
            TMP_id: id,
            TMP_quest_name: name,
            TMP_info_id: id,
        };

        const nameEntry = {
            type: 'DialogueInfo',
            flags: '',
            TMP_info_id: generatedId,
            prev_id: '',
            next_id: '',
            id: generatedId,
            TMP_id: generatedId,
            data: {
                dialogue_type: 'Journal',
                disposition: 0,
                speaker_rank: -1,
                speaker_sex: 'Any',
                player_rank: -1,
            },
            text: name,
            player_faction: '',
            quest_state: 'Name',
            script_text: '',
            sound_path: '',
            speaker_cell: '',
            speaker_class: '',
            speaker_faction: '',
            speaker_id: '',
            speaker_race: '',
            filters: [],
            TMP_topic: id,
            TMP_type: 'Journal',
        };

        await addEntry(idEntry);
        await addEntry(nameEntry);
    } catch (error) {
        logger.error('Journal', 'Failed to add journal quest', error);
    }
}

export async function addQuestEntry(
    questId: string,
    text: string,
    prevId: string,
    nextId: string,
) {
    const generatedId =
        Math.random().toString().slice(2, 15) + Math.random().toString().slice(2, 9);

    const defaultEntry: Record<string, unknown> = {
        type: 'DialogueInfo',
        flags: '',
        prev_id: prevId || '',
        next_id: nextId || '',
        TMP_prev_id: prevId || '',
        TMP_next_id: nextId || '',
        id: generatedId,
        TMP_id: generatedId,
        TMP_info_id: generatedId,
        data: {
            dialogue_type: 'Journal',
            disposition: 10,
            speaker_rank: -1,
            speaker_sex: 'Any',
            player_rank: -1,
        },
        text,
        player_faction: '',
        script_text: '',
        sound_path: '',
        speaker_cell: '',
        speaker_class: '',
        speaker_faction: '',
        speaker_id: '',
        speaker_race: '',
        filters: [],
        TMP_topic: questId,
        TMP_type: 'Journal',
    };

    const databases = _getDatabases();
    const activeDB = databases['activePlugin'];

    // Ensure quest exists
    let quest = await activeDB.pluginData
        .where('TMP_id')
        .equals(questId)
        .and((val: Record<string, unknown>) => val.type === 'Dialogue')
        .toArray();

    if (quest && quest.length > 1) {
        throw { key: 'QUEST_ID_DUPLICATE' };
    } else if (!quest || quest.length === 0) {
        // Look in dependencies
        const dependencies = await getDependencies();
        let found = false;
        for (const dep of dependencies) {
            const depDB = databases[dep];
            if (!depDB) continue;
            const depResponse = await depDB.pluginData
                .where('TMP_id')
                .equals(questId)
                .and((val: Record<string, unknown>) => val.type === 'Dialogue')
                .toArray();
            if (depResponse.length) {
                quest = depResponse;
                found = true;
                break;
            }
        }
        if (!found) throw { key: 'NO_QUEST_FOUND' };
        const lastQuest = quest.at(-1);
        if (lastQuest) {
            delete (lastQuest as Record<string, unknown>).TMP_index;
            await addEntry(lastQuest);
        }
    }

    // Find location
    const lastEntry = await activeDB.pluginData
        .where('TMP_topic')
        .equals(questId)
        .toArray();
    const lastEntryIndex = lastEntry?.at(-1)?.TMP_index;
    if (!lastEntryIndex) throw { key: 'NO_LAST_ENTRY_INDEX_FOUND' };

    let prevEntry: DialogueInfoRecord[] = [];
    let nextEntry: DialogueInfoRecord[] = [];

    if (prevId) {
        prevEntry = await activeDB.pluginData.where('TMP_id').equals(prevId).toArray();
    } else {
        prevEntry = lastEntry;
    }
    if (nextId) {
        nextEntry = await activeDB.pluginData.where('TMP_id').equals(nextId).toArray();
    }

    let index: number;
    if (!prevId && !nextId) {
        index = lastEntryIndex + 1;
    } else if (prevEntry?.length) {
        index = prevEntry.at(-1)!.TMP_index + 1;
    } else if (nextEntry?.length) {
        index = nextEntry.at(-1)!.TMP_index;
    } else {
        index = lastEntryIndex + 1;
    }

    defaultEntry.TMP_index = index;

    // Calculate disposition
    const prevDisposition = (prevEntry?.at(-1) as Record<string, unknown> | undefined)?.data as Record<string, number> | undefined;
    const nextDisposition = (nextEntry?.at(-1) as Record<string, unknown> | undefined)?.data as Record<string, number> | undefined;
    const dispDifference = (nextDisposition?.disposition ?? Infinity) - (prevDisposition?.disposition ?? 0);

    let advisedDisposition = 10;
    if (dispDifference > 10) {
        advisedDisposition = (Math.floor((prevDisposition?.disposition ?? 0) / 10) + 1) * 10;
    } else if (dispDifference > 5) {
        advisedDisposition = (Math.floor((prevDisposition?.disposition ?? 0) / 10) + 0.5) * 10;
    } else if (dispDifference > 1) {
        advisedDisposition = (prevDisposition?.disposition ?? 0) + 1;
    } else {
        throw { key: 'NO_PLACE_FOR_ENTRY' };
    }
    (defaultEntry.data as Record<string, number>).disposition = advisedDisposition;

    await addEntry(defaultEntry, index);

    if (prevEntry.length) {
        await activeDB.pluginData
            .where('TMP_id')
            .equals(prevEntry.at(-1)!.id)
            .modify({ next_id: generatedId, TMP_next_id: generatedId });
    }
    if (nextEntry.length) {
        await activeDB.pluginData
            .where('TMP_id')
            .equals(nextEntry.at(-1)!.id)
            .modify({ prev_id: generatedId, TMP_prev_id: generatedId });
    }
}

export async function deleteJournalEntry(entry: DialogueInfoRecord, isMod = false) {
    try {
        const activeDB = await getActiveDB();

        if (entry.TMP_is_active) {
            await deleteEntry(entry);
        } else {
            const { TMP_index: _ti, TMP_dep: _td, TMP_is_active: _tia, ...entryData } = entry as unknown as Record<string, unknown>;
            await addEntry({
                ...entryData,
                TMP_is_active: true,
                flags: 'deleted',
            });
        }

        if (isMod) return;

        if (entry.prev_id) {
            const prevEntries = await activeDB.pluginData
                .where('TMP_id').equals(entry.prev_id).toArray();
            const prev = prevEntries.at(-1);
            if (prev) {
                if (prev.TMP_is_active) {
                    await modifyEntry({
                        TMP_index: prev.TMP_index,
                        next_id: entry.next_id,
                        TMP_next_id: entry.next_id,
                    } as unknown as DialogueInfoRecord);
                } else {
                    const { TMP_index: _ti2, TMP_dep: _td2, TMP_is_active: _tia2, ...data } = prev as unknown as Record<string, unknown>;
                    await addEntry({
                        ...data,
                        TMP_is_active: true,
                        next_id: entry.next_id,
                        TMP_next_id: entry.next_id,
                    });
                }
            }
        }

        if (entry.next_id) {
            const nextEntries = await activeDB.pluginData
                .where('TMP_id').equals(entry.next_id).toArray();
            const next = nextEntries.at(-1);
            if (next) {
                if (next.TMP_is_active) {
                    await modifyEntry({
                        TMP_index: next.TMP_index,
                        prev_id: entry.prev_id,
                        TMP_prev_id: entry.prev_id,
                    } as unknown as DialogueInfoRecord);
                } else {
                    const { TMP_index: _ti2, TMP_dep: _td2, TMP_is_active: _tia2, ...data } = next as unknown as Record<string, unknown>;
                    await addEntry({
                        ...data,
                        TMP_is_active: true,
                        prev_id: entry.prev_id,
                        TMP_prev_id: entry.prev_id,
                    });
                }
            }
        }
    } catch (error) {
        logger.error('Journal', 'Failed to delete journal entry', error);
    }
}
