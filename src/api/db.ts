import Dexie from 'dexie';
import { makePluginKey } from './sessions-db';
import { logger } from '@/services/logger';

export { makePluginKey } from './sessions-db';

// ---------------------------------------------------------------------------
//  Database registry
// ---------------------------------------------------------------------------

type DatabaseMap = Record<string, Dexie>;

const databases: DatabaseMap = {};

// v1 indexes — kept for Dexie upgrade path from existing databases
const PLUGIN_DATA_INDEXES_V1 = [
    'TMP_index', 'type', 'prev_id', 'next_id', 'dialogue_type',
    'TMP_is_active', 'TMP_topic', 'TMP_type', 'TMP_info_id',
    'TMP_prev_id', 'TMP_next_id', 'TMP_speaker_id', 'TMP_speaker_cell',
    'TMP_speaker_faction', 'TMP_speaker_class', 'TMP_speaker_race',
    'TMP_id', 'name',
].join(',');

// v2 indexes — removed 6 unused, added 3 compound indexes
const PLUGIN_DATA_INDEXES = [
    'TMP_index', 'type', 'prev_id',
    'TMP_topic', 'TMP_info_id',
    'TMP_speaker_id', 'TMP_speaker_cell', 'TMP_speaker_faction',
    'TMP_speaker_class', 'TMP_speaker_race',
    'TMP_id', 'name',
    // Compound indexes (replace JS-side .and() filters)
    '[type+TMP_topic]', '[type+TMP_type]', '[type+TMP_id]',
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
    if (databases[pluginName]?.isOpen()) {
        return databases[pluginName];
    }
    createDB(pluginName);
    const db = getDB(pluginName);
    db.version(1).stores({ pluginData: PLUGIN_DATA_INDEXES_V1 });
    db.version(2).stores({ pluginData: PLUGIN_DATA_INDEXES });

    await db.open().catch((err: unknown) => {
        logger.error('DB', `Failed to open database "${pluginName}"`, err);
    });

    logger.info('DB', `Plugin "${pluginName}" initialised`);
    return db;
}

// ---------------------------------------------------------------------------
//  Architectural helpers  (replace 11 + 13 boilerplate occurrences)
// ---------------------------------------------------------------------------

// Session store registers itself via setSessionKeyGetter() to avoid circular deps
let _sessionKeyGetter: (() => string) | null = null;

/**
 * Called by the session store on init to provide the active plugin key getter.
 */
export function setSessionKeyGetter(getter: () => string) {
    _sessionKeyGetter = getter;
}

function _getActivePluginKey(): string {
    if (!_sessionKeyGetter) {
        throw 'SESSION_STORE_NOT_INITIALIZED';
    }
    return _sessionKeyGetter();
}

/**
 * Returns the Dexie DB for the currently active plugin (resolved from session store).
 */
export async function getActiveDB(): Promise<Dexie> {
    const key = _getActivePluginKey();
    if (!key) {
        throw 'NO_ACTIVE_SESSION';
    }
    if (!databases[key]) {
        await initPlugin(key);
    }
    return databases[key];
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
    // masters format: [[name, file_size], ...]
    // Resolve to plugin keys; fall back to name-only for legacy data
    const dependencies: string[] = header.masters.map((val: string[] | [string, number]) => {
        if (Array.isArray(val) && val.length >= 2 && typeof val[1] === 'number') {
            return makePluginKey(val[0], val[1]);
        }
        // Legacy: just a name string or [name] array
        return typeof val === 'string' ? val : val[0];
    });
    for (const dependency of dependencies) {
        if (!databases[dependency]) {
            await initPlugin(dependency);
        }
    }
    _cachedDependencies = dependencies;
    return dependencies;
}

/**
 * Check whether a dependency is loaded by scanning actual IndexedDB databases.
 * Deps in master lists are raw names (e.g. "Morrowind.esm") while DB keys
 * use the format "plugin_{name}_{sizeBytes}".
 */
export async function isPluginLoaded(depName: string): Promise<boolean> {
    // Use the native IDB API to list all databases on disk
    if (typeof indexedDB.databases === 'function') {
        try {
            const allDbs = await indexedDB.databases();
            const prefix = `plugin_${depName}_`;
            return allDbs.some(db => db.name?.startsWith(prefix));
        } catch { /* fallback below */ }
    }
    // Fallback: check in-memory map (older browsers without databases())
    for (const key of Object.keys(databases)) {
        if (key.startsWith(`plugin_${depName}_`) || key === depName) {
            return true;
        }
    }
    return false;
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
    const key = _getActivePluginKey();
    if (!key) throw 'NO_ACTIVE_SESSION';
    return getHeader(key);
}

// ---------------------------------------------------------------------------
//  Migration: clean break from legacy 'activePlugin' DB
// ---------------------------------------------------------------------------

export async function migrateFromLegacy(): Promise<boolean> {
    const legacyExists = (await Dexie.getDatabaseNames()).includes('activePlugin');
    if (legacyExists) {
        await Dexie.delete('activePlugin');
        delete databases['activePlugin'];
        return true; // caller should show notification
    }
    return false;
}

// ---------------------------------------------------------------------------
//  Type counts
// ---------------------------------------------------------------------------

let activePluginTypeCount: Record<string, number> = {};
let journalCount = 0;

export async function countTypes() {
    try {
        const activeDB = await getActiveDB();
        activePluginTypeCount = {};
        journalCount = 0;

        // Use index-based counting — no data leaves IDB
        const types: string[] = await activeDB.pluginData.orderBy('type').uniqueKeys();
        const counts = await Promise.all(
            types.map((type) => activeDB.pluginData.where('type').equals(type).count()),
        );
        for (let i = 0; i < types.length; i++) {
            activePluginTypeCount[types[i]] = counts[i];
        }

        // dialogue_type is not indexed, but only Dialogue records have it —
        // filter within the much smaller 'Dialogue' subset instead of scanning all
        const dialogues = await activeDB.pluginData.where('type').equals('Dialogue').toArray();
        journalCount = dialogues.filter((d: any) => d.dialogue_type === 'Journal').length;
    } catch (error) {
        logger.error('DB', 'Failed to count types', error);
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
