/**
 * AI Tool helpers — cross-plugin query with source tagging.
 *
 * Wraps `queryAcrossPlugins` from db.ts to tag each result with its source
 * (active plugin vs master file), so the AI can distinguish user's changes
 * from base game data.
 */

import Dexie from 'dexie';
import { getActiveDB, getDependencies, _getDatabases } from '@/api/db';

export interface TaggedResult {
    _source: 'active' | string;  // 'active' or master key like 'plugin_Morrowind.esm_79837557'
    [key: string]: unknown;
}

/**
 * Run a query across active plugin + all master files in parallel.
 * Results are tagged with `_source` field.
 * Active plugin results come first.
 */
export async function queryAllDBs(
    queryFn: (db: Dexie) => Promise<Record<string, unknown>[]>,
    limit = 50,
): Promise<TaggedResult[]> {
    const activeDB = await getActiveDB();
    let deps: string[] = [];
    try {
        deps = await getDependencies();
    } catch {
        // No dependencies — single plugin mode
    }

    const databases = _getDatabases();
    const depDBs = deps.map(dep => ({ key: dep, db: databases[dep] })).filter(d => d.db);

    const [activeResults, ...depResults] = await Promise.all([
        queryFn(activeDB),
        ...depDBs.map(d => queryFn(d.db)),
    ]);

    const results: TaggedResult[] = [];

    // Active plugin results first
    for (const r of activeResults) {
        results.push({ ...r, _source: 'active' });
    }

    // Master file results
    for (let i = 0; i < depResults.length; i++) {
        const masterKey = depDBs[i].key;
        for (const r of depResults[i]) {
            results.push({ ...r, _source: masterKey });
        }
    }

    return results.slice(0, limit);
}

/**
 * Find first matching record across all DBs (active first, then masters).
 * Returns null if not found anywhere.
 */
export async function findFirstAcrossDBs(
    queryFn: (db: Dexie) => Promise<Record<string, unknown> | undefined>,
): Promise<TaggedResult | null> {
    const activeDB = await getActiveDB();
    const activeResult = await queryFn(activeDB);
    if (activeResult) {
        return { ...activeResult, _source: 'active' };
    }

    let deps: string[] = [];
    try {
        deps = await getDependencies();
    } catch {
        return null;
    }

    const databases = _getDatabases();
    for (const dep of deps) {
        const db = databases[dep];
        if (!db) continue;
        const result = await queryFn(db);
        if (result) {
            return { ...result, _source: dep };
        }
    }

    return null;
}
