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
import type { NpcEntry, BaseEntry } from '@/types/pluginEntries';
import type Dexie from 'dexie';

// ---------------------------------------------------------------------------
//  NPC / Creature lookup
// ---------------------------------------------------------------------------

export async function fetchNPCData(npcID: string): Promise<NpcEntry> {
    // Try active plugin first, then deps — return first match
    const activeDB = await getActiveDB();
    const databases = _getDatabases();

    // Use compound index [type+TMP_id] — two indexed queries instead of JS filter
    const queryFn = async (db: Dexie): Promise<NpcEntry | undefined> => {
        const npc = await db.table('pluginData').where({ type: 'Npc', TMP_id: npcID }).first();
        if (npc) return npc as NpcEntry;
        return db.table('pluginData').where({ type: 'Creature', TMP_id: npcID }).first() as Promise<NpcEntry | undefined>;
    };

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

export async function findNPCByName(npcName: string, size = 20): Promise<NpcEntry[]> {
    const nameLower = npcName.toLowerCase();
    const nameFilter = (entry: BaseEntry & { name?: string }) =>
        (entry.name as string ?? '').toLowerCase().includes(nameLower);

    const [npcs, creatures] = await Promise.all([
        Npcs.filter(nameFilter).limit(size).acrossPlugins(),
        Creatures.filter(nameFilter).limit(size).acrossPlugins(),
    ]);
    return [...npcs, ...creatures] as NpcEntry[];
}

// ---------------------------------------------------------------------------
//  Generic search
// ---------------------------------------------------------------------------

export async function searchByType(
    searchTypes: string[],
    searchString: string,
    dialogueType?: string,
): Promise<BaseEntry[]> {
    if (searchTypes.length < 1) return [];

    const typeFilter = (val: BaseEntry & { type?: string; TMP_type?: string }) => {
        if (!searchTypes.includes(val.type ?? '')) return false;
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

export async function fetchByType(types: string[], masters = true): Promise<BaseEntry[]> {
    return collection()
        .whereIn('type', types)
        .acrossPlugins({ includeDeps: masters, reverseDeps: true });
}

// ---------------------------------------------------------------------------
//  Speaker stats
// ---------------------------------------------------------------------------

export async function fetchAllDialogueBySpeaker(speakerType: SpeakerType): Promise<string[] | undefined> {
    const speakerTypeKey = getSpeakerTypeKey(speakerType);
    const activeDB = await getActiveDB();

    if (speakerType === 'Global') {
        return undefined;
    }

    return activeDB.table('pluginData')
        .orderBy(speakerTypeKey)
        .uniqueKeys((keys: string[]) => keys.filter((val) => val !== ''));
}

export async function fetchSpeakersAmountBySpeakerType(speakerType: SpeakerType): Promise<number | undefined> {
    const speakerTypeKey = getSpeakerTypeKey(speakerType);
    if (!speakerTypeKey) return undefined;

    const activeDB = await getActiveDB();

    if (speakerType === 'Global') {
        return 0;
    }

    let amount = 0;
    await activeDB.table('pluginData')
        .orderBy(speakerTypeKey)
        .eachUniqueKey((key: string) => {
            if (key !== '') amount += 1;
        });

    return amount;
}
