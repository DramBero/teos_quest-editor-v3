import Dexie from 'dexie';
import {
    getActiveDB,
    getActiveHeader,
    getDependencies,
    getSpeakerTypeKey,
    _getDatabases,
    type SpeakerType,
} from './db';
import { modifyEntry, addEntry } from './import-export';

// ---------------------------------------------------------------------------
//  Topic list helpers
// ---------------------------------------------------------------------------

interface TopicList {
    topics: unknown[];
    greetings: unknown[];
    persuasions: unknown[];
}

function addTopicEntries(original: TopicList, entries: Record<string, unknown>[]): TopicList {
    const dialogue: TopicList = { topics: [], greetings: [], persuasions: [] };

    for (const type of ['Topic', 'Greeting', 'Persuasion'] as const) {
        const key = `${type.toLowerCase()}s` as keyof TopicList;
        const filtered = entries.filter((val) => val.TMP_type === type);
        const uniqueNames = [...new Set(filtered.map((val) => val.TMP_topic))];
        for (const name of uniqueNames) {
            dialogue[key] = [...dialogue[key], filtered.find((val) => val.TMP_topic === name)];
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
        const uniqueNames = [...new Set(topicList[type].map((val: any) => val.TMP_topic))];
        const grouped = uniqueNames.map((name) =>
            topicList[type].filter((i: any) => i.TMP_topic === name),
        );
        grouped.sort((a: any[], b: any[]) => a[0].TMP_topic.localeCompare(b[0].TMP_topic));
        topicList[type] = grouped;
    }

    return topicList;
}

// ---------------------------------------------------------------------------
//  Dialogue retrieval
// ---------------------------------------------------------------------------

export async function getDialogueByTMPInfoId(TMPInfoId: string): Promise<any[][]> {
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

export async function getAllDialogue(topicId: string): Promise<any[][]> {
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
    const topics: any[] = allResults.flat();

    // Group by id, prioritise active plugin entries
    const uniqueObjMap: Record<string, any[]> = {};
    for (const object of topics) {
        uniqueObjMap[object.id] = uniqueObjMap[object.id]
            ? [...uniqueObjMap[object.id], object]
            : [object];
    }

    const activePluginHeader = await getActiveHeader();
    const activePluginName = activePluginHeader.TMP_dep;

    return Object.values(uniqueObjMap).sort(
        (a, b) =>
            b.filter((val: any) => val.TMP_dep === activePluginName).length -
            a.filter((val: any) => val.TMP_dep === activePluginName).length,
    );
}

export async function getOrderedEntriesByTopic(topicId: string) {
    if (!topicId) return [];

    const pluginDialogue = await getAllDialogue(topicId);
    if (!pluginDialogue.flat(1).length) return [];

    let dependencies = await getDependencies();
    dependencies = [...dependencies].reverse();

    const findByIdType = function (idType: string, id: string, ignoreList?: any[]) {
        let entries = pluginDialogue.flatMap((plugin: any[]) =>
            plugin.filter((entry) => entry[idType] === id),
        );
        const ignoreStrings = ignoreList?.map((val) => `${val.id}+${val.TMP_dep}`) || [];
        entries = entries.filter(
            (entry: any) => !ignoreStrings.includes(`${entry.id}+${entry.TMP_dep}`),
        );
        if (!entries.length) return false as const;

        const lastValue = entries.at(-1) as any;
        const oldValues = pluginDialogue.flatMap((plugin: any[]) =>
            plugin.filter((entry) => entry.id === lastValue.id),
        );
        return {
            ...lastValue,
            old_values: oldValues.length > 1 ? oldValues.filter((val: any) => val && val.TMP_dep) : [],
        };
    };

    const firstElement = findByIdType('prev_id', '');
    if (!firstElement) throw 'NO_PREV_ID';

    const orderedDialogue: any[] = [firstElement];
    let nextEntry: any;

    while (true) {
        const last = orderedDialogue.at(-1);
        const nextEntries = [
            ...new Set([
                findByIdType('prev_id', last.id, orderedDialogue),
                findByIdType('id', last.next_id, orderedDialogue),
            ]),
        ];

        if (nextEntries.length === 1 && nextEntries[0] === false) break;

        for (const dependency of [...dependencies].reverse()) {
            nextEntry = nextEntries.find((val: any) => val.TMP_dep === dependency) || nextEntry;
        }
        nextEntry = nextEntries.find((val: any) => val.TMP_is_active) || nextEntry;

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
    entry.filters = [
        ...entry.filters,
        { ...newFilter, index: entry.filters?.length || 0 },
    ];
    if (entry.TMP_is_active) {
        await modifyEntry(entry);
    }
}

export async function editTopicText(entryId: string, text: string) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
    if (entry.text === text) return;
    entry.text = text;
    if (entry.TMP_is_active) {
        await modifyEntry(entry);
    }
}

export async function deleteFilter(entryId: string, filterIndex: number) {
    const entries = await getDialogueByTMPInfoId(entryId);
    const entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
    entry.filters = entry.filters.filter((val: any) => val.index !== filterIndex);
    if (entry.TMP_is_active) {
        await modifyEntry(entry);
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

    const matchingSpeaker = orderedTopics.filter((val: any) => val[speakerType] === speakerId);
    if (matchingSpeaker.length) {
        const last = matchingSpeaker.at(-1)!;
        return [last.id, last.next_id];
    }

    let selectedTopic: any;
    const testString: any[] = [];

    if (speakerType === 'speaker_id') {
        testString.push('SPEAKER ID');
        let candidates = orderedTopics.filter((val: any) => val[speakerType] !== '');
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
        let filteredPriorityEntries: any[];
        switch (speakerType) {
            case 'speaker_cell':
                filteredPriorityEntries = orderedTopics.filter((val: any) => !val.speaker_id);
                break;
            case 'speaker_faction':
                filteredPriorityEntries = orderedTopics.filter(
                    (val: any) => !val.speaker_id && !val.speaker_cell,
                );
                break;
            case 'speaker_class':
                filteredPriorityEntries = orderedTopics.filter(
                    (val: any) => !val.speaker_id && !val.speaker_cell && !val.speaker_faction,
                );
                break;
            case 'speaker_race':
                filteredPriorityEntries = orderedTopics.filter(
                    (val: any) =>
                        !val.speaker_id && !val.speaker_cell && !val.speaker_faction && !val.speaker_class,
                );
                break;
            default:
                filteredPriorityEntries = orderedTopics.filter(
                    (val: any) =>
                        !val.speaker_id &&
                        !val.speaker_cell &&
                        !val.speaker_faction &&
                        !val.speaker_class &&
                        !val.speaker_race,
                );
                break;
        }

        testString.push('LENGTH: ' + filteredPriorityEntries.length);
        let candidates = filteredPriorityEntries.filter((val: any) => val[speakerType] !== '');

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

    testString.push(selectedTopic);

    let nextId: string | undefined;
    const activeDB = await getActiveDB();
    const activePluginEntry = await activeDB.pluginData
        .where('prev_id')
        .equals(selectedTopic.id)
        .first();

    if (activePluginEntry) {
        nextId = activePluginEntry.id;
    } else {
        const dependencies = await getDependencies();
        for (const dep of [...dependencies].reverse()) {
            nextId = selectedTopic.next_id;
            const depDB = databases[dep];
            if (!depDB) continue;
            const dependencyEntry = await depDB.pluginData
                .where('prev_id')
                .equals(selectedTopic.id)
                .first();
            if (dependencyEntry) {
                nextId = dependencyEntry.id;
            }
        }
    }

    return [selectedTopic.id, nextId, testString];
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
        prev_id = location[0];
        next_id = location[1];
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

        let prevEntry: any[] | undefined;
        let nextEntryArr: any[] | undefined;

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
                .equals(prevEntry.at(-1).id)
                .modify({ next_id: generatedId, TMP_next_id: generatedId });
        }
        if (nextEntryArr?.length) {
            await activeDB.pluginData
                .where('TMP_id')
                .equals(nextEntryArr.at(-1).id)
                .modify({ prev_id: generatedId, TMP_prev_id: generatedId });
        }
    }
}
