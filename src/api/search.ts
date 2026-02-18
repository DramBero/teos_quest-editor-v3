import {
    getActiveDB,
    getDependencies,
    getSpeakerTypeKey,
    _getDatabases,
    type SpeakerType,
} from './db';
import {
    Npcs,
    Creatures,
    PluginData,
    collection,
} from './collection';

// ---------------------------------------------------------------------------
//  NPC / Creature lookup
// ---------------------------------------------------------------------------

export async function fetchNPCData(npcID: string) {
    // Try active plugin first, then deps — return first match
    const activeDB = await getActiveDB();
    const databases = _getDatabases();

    const queryFn = (db: any) =>
        db.pluginData
            .where('TMP_id')
            .equals(npcID)
            .and((entry: any) => entry.type === 'Npc' || entry.type === 'Creature')
            .first();

    const activeResult = await queryFn(activeDB);
    if (activeResult) return activeResult;

    const dependencies = await getDependencies();
    for (const dep of dependencies) {
        const depDB = databases[dep];
        if (!depDB) continue;
        const result = await queryFn(depDB);
        if (result) return result;
    }

    throw `NPC_NOT_FOUND: ${npcID}`;
}

export async function findNPCByName(npcName: string, size = 20) {
    const nameLower = npcName.toLowerCase();
    const nameFilter = (entry: any) =>
        (entry.name as string).toLowerCase().includes(nameLower);

    const [npcs, creatures] = await Promise.all([
        Npcs.filter(nameFilter).limit(size).acrossPlugins(),
        Creatures.filter(nameFilter).limit(size).acrossPlugins(),
    ]);
    return [...npcs, ...creatures];
}

// ---------------------------------------------------------------------------
//  Generic search
// ---------------------------------------------------------------------------

export async function searchByType(
    searchTypes: string[],
    searchString: string,
    dialogueType?: string,
) {
    if (searchTypes.length < 1) return [];

    const typeFilter = (val: any) => {
        if (!searchTypes.includes(val.type)) return false;
        return dialogueType ? val.TMP_type === dialogueType : true;
    };

    return PluginData
        .search('TMP_id', searchString)
        .filter(typeFilter)
        .limit(30)
        .acrossPlugins({ reverseDeps: true });
}

// ---------------------------------------------------------------------------
//  Fetch by type
// ---------------------------------------------------------------------------

export async function fetchByType(types: string[], masters = true) {
    return collection()
        .whereIn('type', types)
        .acrossPlugins({ includeDeps: masters, reverseDeps: true });
}

// ---------------------------------------------------------------------------
//  Speaker stats
// ---------------------------------------------------------------------------

export async function fetchAllDialogueBySpeaker(speakerType: SpeakerType) {
    const speakerTypeKey = getSpeakerTypeKey(speakerType);
    const activeDB = await getActiveDB();

    if (speakerType === 'Global') {
        return undefined;
    }

    return (activeDB as any).pluginData
        .orderBy(speakerTypeKey)
        .uniqueKeys((keys: string[]) => keys.filter((val) => val !== ''));
}

export async function fetchSpeakersAmountBySpeakerType(speakerType: SpeakerType) {
    const speakerTypeKey = getSpeakerTypeKey(speakerType);
    if (!speakerTypeKey) return;

    const activeDB = await getActiveDB();

    if (speakerType === 'Global') {
        return 0;
    }

    let amount = 0;
    await (activeDB as any).pluginData
        .orderBy(speakerTypeKey)
        .eachUniqueKey((key: string) => {
            if (key !== '') amount += 1;
        });

    return amount;
}
