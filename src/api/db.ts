import Dexie from 'dexie';

// ---------------------------------------------------------------------------
//  Database registry
// ---------------------------------------------------------------------------

type DatabaseMap = Record<string, Dexie>;

const databases: DatabaseMap = {};

const PLUGIN_DATA_INDEXES = [
    'TMP_index', 'type', 'prev_id', 'next_id', 'dialogue_type',
    'TMP_is_active', 'TMP_topic', 'TMP_type', 'TMP_info_id',
    'TMP_prev_id', 'TMP_next_id', 'TMP_speaker_id', 'TMP_speaker_cell',
    'TMP_speaker_faction', 'TMP_speaker_class', 'TMP_speaker_race',
    'TMP_id', 'name',
].join(',');

export function createDB(name: string) {
    databases[name] = new Dexie(name);
}

export function getDB(name: string): Dexie {
    return databases[name];
}

export function deleteDB(name: string) {
    Dexie.delete(name);
    delete databases[name];
    invalidateDependencyCache();
}

export async function checkDB(name: string): Promise<boolean> {
    if (!databases[name]) {
        await initPlugin(name);
    }
    return !!databases[name];
}

// ---------------------------------------------------------------------------
//  Plugin initialisation
// ---------------------------------------------------------------------------

export async function initPlugin(pluginName: string): Promise<Dexie> {
    createDB(pluginName);
    const db = getDB(pluginName);
    db.version(1).stores({ pluginData: PLUGIN_DATA_INDEXES });

    await db.open().catch((err: unknown) => {
        console.error(err instanceof Error ? err.stack : err);
    });

    if (!databases['activePlugin']) {
        throw 'NO_INDEXEDDB_PLUGIN';
    }
    return db;
}

// ---------------------------------------------------------------------------
//  Architectural helpers  (replace 11 + 13 boilerplate occurrences)
// ---------------------------------------------------------------------------

/**
 * Ensures the active plugin DB is initialised and returns it.
 * Result is effectively cached — only the first call triggers initPlugin.
 */
export async function getActiveDB(): Promise<Dexie> {
    if (!databases['activePlugin']) {
        await initPlugin('activePlugin');
    }
    return databases['activePlugin'];
}

/**
 * Returns the raw `databases` registry — intended **only** for modules
 * inside `src/api/` that need direct access (e.g. import-export).
 */
export function _getDatabases(): DatabaseMap {
    return databases;
}

export interface QueryOptions {
    /** Include dependency DBs in the query (default: true). */
    includeDeps?: boolean;
    /** Reverse dependency order — useful when the latest plugin wins (default: false). */
    reverseDeps?: boolean;
}

/**
 * Runs the same Dexie query on the active plugin + all dependency DBs
 * **in parallel** and merges the results into a single array.
 */
export async function queryAcrossPlugins<T>(
    queryFn: (db: Dexie) => Promise<T[]>,
    options: QueryOptions = {},
): Promise<T[]> {
    const { includeDeps = true, reverseDeps = false } = options;

    const activeDB = await getActiveDB();

    if (!includeDeps) {
        return queryFn(activeDB);
    }

    const deps = await getDependencies();
    const orderedDeps = reverseDeps ? [...deps].reverse() : deps;
    const depDBs = orderedDeps
        .map((dep) => databases[dep])
        .filter(Boolean);

    // Run active + all dependency queries in parallel
    const [activeResults, ...depResults] = await Promise.all([
        queryFn(activeDB),
        ...depDBs.map((db) => queryFn(db)),
    ]);

    const results = [...activeResults];
    for (const batch of depResults) {
        results.push(...batch);
    }
    return results;
}

// ---------------------------------------------------------------------------
//  Dependencies & headers  (cached to avoid repeated Header lookups)
// ---------------------------------------------------------------------------

let _cachedDependencies: string[] | null = null;

/**
 * Invalidates the dependency cache. Call after importing a new plugin
 * or deleting a DB so that the next `getDependencies()` re-reads from Header.
 */
export function invalidateDependencyCache() {
    _cachedDependencies = null;
}

export async function getDependencies(): Promise<string[]> {
    if (_cachedDependencies) return _cachedDependencies;

    const activeDB = await getActiveDB();
    const header = await activeDB.pluginData.where('type').equals('Header').first();
    if (!header) {
        throw 'NO_HEADERFOUND';
    }
    const dependencies: string[] = header.masters.map((val: string[]) => val[0]);
    for (const dependency of dependencies) {
        if (!databases[dependency]) {
            await initPlugin(dependency);
        }
    }
    _cachedDependencies = dependencies;
    return dependencies;
}

export async function getHeader(pluginName: string) {
    if (!databases[pluginName]) {
        await initPlugin(pluginName);
    }
    const db = databases[pluginName];
    const header = await db.pluginData.where('type').equals('Header').first();
    if (!header) {
        throw 'NO_HEADERFOUND';
    }
    return header;
}

export async function getActiveHeader() {
    return getHeader('activePlugin');
}

// ---------------------------------------------------------------------------
//  Type counts
// ---------------------------------------------------------------------------

let activePluginTypeCount: Record<string, number> = {};
let journalCount = 0;

export async function countTypes() {
    try {
        const activeDB = await getActiveDB();
        const items = await activeDB.pluginData.toArray();
        activePluginTypeCount = {};
        for (const item of items) {
            activePluginTypeCount[item.type] = (activePluginTypeCount[item.type] || 0) + 1;
        }
        journalCount = await activeDB.pluginData
            .where('dialogue_type')
            .equals('Journal')
            .count();
    } catch (error) {
        console.error(error);
    }
}

export async function getCountTypes() {
    await countTypes();
    return {
        ...activePluginTypeCount,
        Journal: journalCount,
    };
}

// ---------------------------------------------------------------------------
//  Shared types & utils
// ---------------------------------------------------------------------------

export type SpeakerType = 'npc' | 'cell' | 'class' | 'faction' | 'race' | 'Global';

export function getSpeakerTypeKey(speakerType: SpeakerType): string {
    switch (speakerType) {
        case 'npc': return 'TMP_speaker_id';
        case 'cell': return 'TMP_speaker_cell';
        case 'class': return 'TMP_speaker_class';
        case 'faction': return 'TMP_speaker_faction';
        case 'race': return 'TMP_speaker_race';
        default: return '';
    }
}

export const GENERIC_TMP = {
    TMP_dep: '',
    TMP_id: '',
    TMP_index: '',
    TMP_info_id: '',
    TMP_is_active: true,
    TMP_next_id: '',
    TMP_prev_id: '',
    TMP_quest_name: '',
    TMP_speaker_cell: '',
    TMP_speaker_class: '',
    TMP_speaker_faction: '',
    TMP_speaker_id: '',
    TMP_speaker_race: '',
    TMP_topic: '',
    TMP_type: '',
} as const;
