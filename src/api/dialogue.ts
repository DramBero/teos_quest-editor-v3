import Dexie from 'dexie';
import {
    getActiveDB,
    getActiveHeader,
    getDependencies,
    getDependencyMap,
    getSpeakerTypeKey,
    _getDatabases,
    type SpeakerType,
} from './db';
import { modifyEntry, addEntry } from './import-export';
import type { DialogueInfoRecord } from '@/types/pluginEntries';

// ---------------------------------------------------------------------------
//  Topic list helpers
// ---------------------------------------------------------------------------

interface TopicList {
    topics: Record<string, unknown>[];
    greetings: Record<string, unknown>[];
    persuasions: Record<string, unknown>[];
}

function addTopicEntries(original: TopicList, entries: Record<string, unknown>[]): TopicList {
    const dialogue: TopicList = { topics: [], greetings: [], persuasions: [] };

    for (const type of ['Topic', 'Greeting', 'Persuasion'] as const) {
        const key = `${type.toLowerCase()}s` as keyof TopicList;
        const filtered = entries.filter((val) => val.TMP_type === type);
        const uniqueNames = [...new Set(filtered.map((val) => val.TMP_topic))];
        for (const name of uniqueNames) {
            const found = filtered.find((val) => val.TMP_topic === name);
            if (found) dialogue[key] = [...dialogue[key], found];
        }
    }

    return {
        topics: [...original.topics, ...dialogue.topics],
        greetings: [...original.greetings, ...dialogue.greetings],
        persuasions: [...original.persuasions, ...dialogue.persuasions],
    };
}

function buildSpeakerWhereClause(
    db: Dexie,
    speakerType: SpeakerType,
    speakerTypeKey: string,
    npcID: string,
) {
    if (speakerType !== 'Global') {
        return db.pluginData.where({ [speakerTypeKey]: npcID }).toArray();
    }
    return db.pluginData
        .where({
            TMP_speaker_id: '',
            TMP_speaker_cell: '',
            TMP_speaker_class: '',
            TMP_speaker_faction: '',
            TMP_speaker_race: '',
        })
        .toArray();
}

// ---------------------------------------------------------------------------
//  Public API — Topic list
// ---------------------------------------------------------------------------

export async function fetchTopicListByNPC(npcID: string, speakerType: SpeakerType) {
    const speakerTypeKey = getSpeakerTypeKey(speakerType);
    const activeDB = await getActiveDB();
    const databases = _getDatabases();
    let topicList: TopicList = { topics: [], greetings: [], persuasions: [] };

    const activeEntries = await buildSpeakerWhereClause(activeDB, speakerType, speakerTypeKey, npcID);
    topicList = addTopicEntries(topicList, activeEntries);

    const dependencies = await getDependencies();
    for (const dep of [...dependencies].reverse()) {
        const depDB = databases[dep];
        if (!depDB) continue;
        const depEntries = await buildSpeakerWhereClause(depDB, speakerType, speakerTypeKey, npcID);
        topicList = addTopicEntries(topicList, depEntries);
    }

    // Deduplicate and sort
    for (const type of ['topics', 'greetings', 'persuasions'] as const) {
        const uniqueNames = [...new Set(topicList[type].map((val) => val.TMP_topic as string))];
        const grouped = uniqueNames.map((name) =>
            topicList[type].filter((i) => i.TMP_topic === name),
        );
        grouped.sort((a, b) => (a[0].TMP_topic as string).localeCompare(b[0].TMP_topic as string));
        topicList[type] = grouped as unknown as Record<string, unknown>[];
    }

    return topicList;
}

// ---------------------------------------------------------------------------
//  Dialogue retrieval
// ---------------------------------------------------------------------------

export async function getDialogueByTMPInfoId(TMPInfoId: string): Promise<DialogueInfoRecord[][]> {
    const dependencies = await getDependencies();
    const databases = _getDatabases();
    const activeDB = await getActiveDB();

    const queryFn = (db: Dexie) =>
        db.pluginData.where('TMP_info_id').equals(TMPInfoId).toArray();

    const depDBs = dependencies.map((dep) => databases[dep]).filter(Boolean);
    return Promise.all([
        ...depDBs.map(queryFn),
        queryFn(activeDB),
    ]);
}

export async function getAllDialogue(topicId: string): Promise<DialogueInfoRecord[][]> {
    const dependencies = await getDependencies();
    const databases = _getDatabases();
    const activeDB = await getActiveDB();

    const queryFn = (db: Dexie) =>
        db.pluginData
            .where('TMP_topic')
            .equals(topicId)
            .and((entry: Record<string, unknown>) => entry['type'] === 'DialogueInfo')
            .toArray();

    const depDBs = dependencies.map((dep) => databases[dep]).filter(Boolean);
    return Promise.all([...depDBs.map(queryFn), queryFn(activeDB)]);
}

export async function getAllTopicsByType(topicType: string) {
    const dependencies = await getDependencies();
    const databases = _getDatabases();
    const activeDB = await getActiveDB();

    const queryFn = (db: Dexie) =>
        db.pluginData
            .where('type')
            .equals('Dialogue')
            .and((entry: Record<string, unknown>) => entry['TMP_type'] === topicType)
            .toArray();

    const depDBs = dependencies.map((dep) => databases[dep]).filter(Boolean);
    const allResults = await Promise.all([...depDBs.map(queryFn), queryFn(activeDB)]);
    const topics: Record<string, unknown>[] = allResults.flat();

    // Group by id, prioritise active plugin entries
    const uniqueObjMap: Record<string, Record<string, unknown>[]> = {};
    for (const object of topics) {
        const objId = object.id as string;
        uniqueObjMap[objId] = uniqueObjMap[objId]
            ? [...uniqueObjMap[objId], object]
            : [object];
    }

    const activePluginHeader = await getActiveHeader();
    const activePluginName = activePluginHeader.TMP_dep;

    return Object.values(uniqueObjMap).sort(
        (a, b) =>
            b.filter((val) => val.TMP_dep === activePluginName).length -
            a.filter((val) => val.TMP_dep === activePluginName).length,
    );
}

export async function getOrderedEntriesByTopic(topicId: string) {
    if (!topicId) return [];

    const pluginDialogue = await getAllDialogue(topicId);
    if (!pluginDialogue.flat(1).length) return [];

    let dependencies = await getDependencies();
    dependencies = [...dependencies].reverse();
    const depMap = await getDependencyMap();

    const findByIdType = function (idType: string, id: string, ignoreList?: DialogueInfoRecord[]) {
        let entries = pluginDialogue.flatMap((plugin) =>
            plugin.filter((entry) => entry[idType as keyof DialogueInfoRecord] === id),
        );
        const ignoreStrings = ignoreList?.map((val) => `${val.id}+${val.TMP_dep}`) || [];
        entries = entries.filter(
            (entry) => !ignoreStrings.includes(`${entry.id}+${entry.TMP_dep}`),
        );
        if (!entries.length) return false as const;

        const lastValue = entries.at(-1)!;
        const oldValues = pluginDialogue.flatMap((plugin) =>
            plugin.filter((entry) => entry.id === lastValue.id),
        );
        return {
            ...lastValue,
            old_values: oldValues.length > 1 ? oldValues.filter((val) => val && val.TMP_dep) : [],
        };
    };

    const firstElement = findByIdType('prev_id', '');
    if (!firstElement) {
        // The root of the dialogue chain is in a non-imported master file.
        // Fall back to returning all available entries sorted by TMP_index.
        const allEntries = pluginDialogue.flat(1);
        allEntries.sort((a, b) => (a.TMP_index ?? 0) - (b.TMP_index ?? 0));
        return allEntries.map((entry) => {
            const oldValues = pluginDialogue.flatMap((plugin) =>
                plugin.filter((e) => e.id === entry.id),
            );
            return {
                ...entry,
                old_values: oldValues.length > 1 ? oldValues.filter((val) => val && val.TMP_dep) : [],
            };
        });
    }

    const orderedDialogue: DialogueInfoRecord[] = [firstElement];
    let nextEntry: DialogueInfoRecord | undefined;

    while (true) {
        const last = orderedDialogue.at(-1)!;
        const nextEntries = [
            ...new Set([
                findByIdType('prev_id', last.id, orderedDialogue),
                findByIdType('id', last.next_id, orderedDialogue),
            ]),
        ];

        if (nextEntries.length === 1 && nextEntries[0] === false) break;

        for (const dependency of [...dependencies].reverse()) {
            const depName = depMap.get(dependency);
            if (depName) {
                nextEntry = nextEntries.find((val) => typeof val !== 'boolean' && val.TMP_dep === depName) as DialogueInfoRecord | undefined || nextEntry;
            }
        }
        nextEntry = nextEntries.find((val) => typeof val !== 'boolean' && val.TMP_is_active) as DialogueInfoRecord | undefined || nextEntry;

        if (nextEntry) {
            orderedDialogue.push(nextEntry);
            if (!nextEntry.next_id) {
                const newEntry = findByIdType('prev_id', nextEntry.id, orderedDialogue);
                if (newEntry) {
                    orderedDialogue.push(newEntry);
                } else {
                    break;
                }
            }
        } else {
            break;
        }
    }

    return orderedDialogue;
}

// ---------------------------------------------------------------------------
//  Entry modifications (filter, text, choice)
// ---------------------------------------------------------------------------


export async function addChoiceFilter(entryId: string, choiceId: number) {
    const newFilter = {
        comparison: 'Equal',
        filter_type: 'Function',
        function: 'Choice',
        id: '',
        value: { type: 'Integer', data: choiceId },
    };
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    // Add filter logic
    entry.filters = [
        ...entry.filters,
        { ...newFilter, index: entry.filters?.length || 0 },
    ];

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        // Create override in active plugin
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

export async function editTopicText(entryId: string, text: string) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
    if (entry.text === text) return entry;

    entry.text = text;

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        // Create override in active plugin
        // Remove TMP fields specific to the master record source
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        // Adding it will assign a new TMP_index in the active DB

        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

export async function editScriptText(entryId: string, text: string) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
    if (entry.script_text === text) return entry;

    entry.script_text = text;

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        // Create override in active plugin
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

export async function deleteFilter(entryId: string, filterIndex: number) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    entry.filters = entry.filters.filter((val: Record<string, unknown>) => val.index !== filterIndex);

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        // Create override in active plugin
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

export async function addFilter(entryId: string, filter: {
    filter_type: string;
    function: string;
    comparison: string;
    id: string;
    value: { type: string; data: number | string };
}) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    entry.filters = [
        ...entry.filters,
        { ...filter, index: entry.filters?.length || 0 },
    ];

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

export async function updateFilter(
    entryId: string,
    filterIndex: number,
    patch: Partial<{
        comparison: string;
        id: string;
        value: { type: string; data: number | string };
        filter_type: string;
        function: string;
    }>,
) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    const filter = entry.filters.find(
        (f: Record<string, unknown>) => f.index === filterIndex,
    );
    if (!filter) return entry;

    Object.assign(filter, patch);

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

/** Update a speaker-level field (speaker_id, speaker_race, etc.) or player_faction */
export async function updateSpeakerField(
    entryId: string,
    field: 'speaker_id' | 'speaker_race' | 'speaker_class' | 'speaker_faction' | 'speaker_cell' | 'player_faction',
    value: string,
) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    if (entry[field] === value) return entry;
    entry[field] = value;

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

/** Update data-level fields: disposition, speaker_rank, speaker_sex, player_rank */
export async function updateEntryData(
    entryId: string,
    patch: Partial<{
        disposition: number;
        speaker_rank: number;
        speaker_sex: string;
        player_rank: number;
    }>,
) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));

    let changed = false;
    for (const [k, v] of Object.entries(patch)) {
        if (entry.data[k] !== v) {
            entry.data[k] = v;
            changed = true;
        }
    }
    if (!changed) return entry;

    if (entry.TMP_is_active) {
        return await modifyEntry(entry);
    } else {
        const { TMP_index, TMP_dep, TMP_is_active, ...entryData } = entry;
        const newEntry = { ...entryData, TMP_is_active: true };
        await addEntry(newEntry);
        return newEntry;
    }
}

// ---------------------------------------------------------------------------
//  Best entry location & add dialogue entry
// ---------------------------------------------------------------------------

export async function getBestEntryLocation(
    speakerId: string,
    topicId: string,
    speakerType: string,
) {
    const databases = _getDatabases();
    const orderedTopics = await getOrderedEntriesByTopic(topicId);
    if (!orderedTopics.length) return ['', ''];

    const matchingSpeaker = orderedTopics.filter((val) => val[speakerType as keyof DialogueInfoRecord] === speakerId);
    if (matchingSpeaker.length) {
        const last = matchingSpeaker.at(-1)!;
        return [last.id, last.next_id];
    }

    let selectedTopic: DialogueInfoRecord | undefined;
    const testString: string[] = [];

    if (speakerType === 'speaker_id') {
        testString.push('SPEAKER ID');
        let candidates = orderedTopics.filter((val) => val[speakerType as keyof DialogueInfoRecord] !== '');
        if (candidates.length > 1) {
            candidates = candidates.slice(0, Math.ceil(candidates.length / 2));
            selectedTopic = candidates[Math.floor(Math.random() * candidates.length)];
        } else if (candidates.length > 0) {
            selectedTopic = candidates[0];
        } else {
            selectedTopic = orderedTopics.length > 1 ? orderedTopics[1] : orderedTopics[0];
        }
    } else {
        testString.push('NOT SPEAKER ID');
        let filteredPriorityEntries: DialogueInfoRecord[];
        switch (speakerType) {
            case 'speaker_cell':
                filteredPriorityEntries = orderedTopics.filter((val) => !val.speaker_id);
                break;
            case 'speaker_faction':
                filteredPriorityEntries = orderedTopics.filter(
                    (val) => !val.speaker_id && !val.speaker_cell,
                );
                break;
            case 'speaker_class':
                filteredPriorityEntries = orderedTopics.filter(
                    (val) => !val.speaker_id && !val.speaker_cell && !val.speaker_faction,
                );
                break;
            case 'speaker_race':
                filteredPriorityEntries = orderedTopics.filter(
                    (val) =>
                        !val.speaker_id && !val.speaker_cell && !val.speaker_faction && !val.speaker_class,
                );
                break;
            default:
                filteredPriorityEntries = orderedTopics.filter(
                    (val) =>
                        !val.speaker_id &&
                        !val.speaker_cell &&
                        !val.speaker_faction &&
                        !val.speaker_class &&
                        !val.speaker_race,
                );
                break;
        }

        testString.push('LENGTH: ' + filteredPriorityEntries.length);
        let candidates = filteredPriorityEntries.filter((val) => val[speakerType as keyof DialogueInfoRecord] !== '');

        if (candidates.length > 1) {
            testString.push('IF 1');
            candidates = candidates.slice(0, Math.ceil(candidates.length / 2));
            selectedTopic = candidates[Math.floor(Math.random() * candidates.length)];
        } else if (candidates.length > 0) {
            testString.push('ELSE IF 1');
            selectedTopic = candidates[0];
        } else if (filteredPriorityEntries.length > 0) {
            testString.push('ELSE IF 2');
            selectedTopic = filteredPriorityEntries[0];
        } else {
            testString.push('ELSE');
            selectedTopic = orderedTopics.length > 1 ? orderedTopics.at(-2) : orderedTopics[0];
        }
    }

    testString.push(JSON.stringify(selectedTopic));

    let nextId: string | undefined;
    const activeDB = await getActiveDB();
    const activePluginEntry = await activeDB.pluginData
        .where('prev_id')
        .equals(selectedTopic!.id)
        .first();

    if (activePluginEntry) {
        nextId = activePluginEntry.id;
    } else {
        const dependencies = await getDependencies();
        for (const dep of [...dependencies].reverse()) {
            nextId = selectedTopic!.next_id;
            const depDB = databases[dep];
            if (!depDB) continue;
            const dependencyEntry = await depDB.pluginData
                .where('prev_id')
                .equals(selectedTopic!.id)
                .first();
            if (dependencyEntry) {
                nextId = dependencyEntry.id;
            }
        }
    }

    return [selectedTopic!.id, nextId, testString];
}

export async function addDialogueEntry(
    speakerId: string,
    topicId: string,
    dialogueType: string,
    speakerType: string,
    entryId: string,
    prevId: string,
    nextId: string,
    text = '',
) {
    let prev_id = '';
    let next_id = '';
    if (!entryId) {
        const location = await getBestEntryLocation(speakerId, topicId, speakerType);
        prev_id = location[0] as string;
        next_id = location[1] as string;
    } else {
        prev_id = prevId;
        next_id = nextId;
    }

    const generatedId =
        Math.random().toString().slice(2, 15) + Math.random().toString().slice(2, 9);

    const topicObject = {
        dialogue_type: 'Topic',
        flags: '',
        id: topicId,
        type: 'Dialogue',
        TMP_topic: topicId,
        TMP_type: dialogueType,
    };

    const activeDB = await getActiveDB();

    const newEntry: Record<string, unknown> = {
        data: {
            dialogue_type: 'Topic',
            disposition: 0,
            player_rank: -1,
            speaker_race: -1,
            speaker_sex: 'Any',
        },
        filters: [],
        flags: '',
        id: generatedId,
        TMP_id: generatedId,
        TMP_info_id: generatedId,
        next_id: next_id || '',
        prev_id: prev_id || '',
        TMP_next_id: next_id || '',
        TMP_prev_id: prev_id || '',
        text,
        type: 'DialogueInfo',
        TMP_topic: topicId,
        TMP_type: dialogueType,
        sound_path: '',
        script_text: '',
        player_faction: '',
        speaker_id: '',
        speaker_cell: '',
        speaker_class: '',
        speaker_faction: '',
        speaker_race: '',
    };

    // Set speaker fields based on type
    const speakerFieldMap: Record<string, [string, string]> = {
        npc: ['speaker_id', 'TMP_speaker_id'],
        cell: ['speaker_cell', 'TMP_speaker_cell'],
        class: ['speaker_class', 'TMP_speaker_class'],
        faction: ['speaker_faction', 'TMP_speaker_faction'],
        race: ['speaker_race', 'TMP_speaker_race'],
    };
    const fields = speakerFieldMap[speakerType];
    if (fields) {
        newEntry[fields[0]] = speakerId;
        newEntry[fields[1]] = speakerId;
    }

    const lastActiveEntry = await activeDB.pluginData
        .where('TMP_topic')
        .equals(topicId)
        .last();

    if (!lastActiveEntry) {
        await addEntry(topicObject);
        await addEntry(newEntry);
    } else {
        await addEntry(newEntry, lastActiveEntry.TMP_index);

        const lastEntry = await activeDB.pluginData
            .where('TMP_topic')
            .equals(topicId)
            .toArray();

        let prevEntry: DialogueInfoRecord[] | undefined;
        let nextEntryArr: DialogueInfoRecord[] | undefined;

        if (prev_id) {
            prevEntry = await activeDB.pluginData.where('TMP_id').equals(prev_id).toArray();
        } else {
            prevEntry = lastEntry;
        }
        if (next_id) {
            nextEntryArr = await activeDB.pluginData.where('TMP_id').equals(next_id).toArray();
        }
        if (prevEntry?.length) {
            await activeDB.pluginData
                .where('TMP_id')
                .equals(prevEntry.at(-1)!.id)
                .modify({ next_id: generatedId, TMP_next_id: generatedId });
        }
        if (nextEntryArr?.length) {
            await activeDB.pluginData
                .where('TMP_id')
                .equals(nextEntryArr.at(-1)!.id)
                .modify({ prev_id: generatedId, TMP_prev_id: generatedId });
        }
    }
}
