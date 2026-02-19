import Dexie, { type IndexableType } from 'dexie';
import {
    getActiveDB,
    getDependencies,
    _getDatabases,
    type QueryOptions,
} from './db';
import type { BaseEntry } from '@/types/pluginEntries';

// ---------------------------------------------------------------------------
//  PluginCollection — ORM-like fluent query builder for pluginData
// ---------------------------------------------------------------------------

interface CollectionConfig {
    baseFilter?: Record<string, unknown>;
    whereClause?: [string, unknown] | Record<string, unknown> | null;
    whereInClause?: [string, unknown[]] | null;
    filterFn?: ((val: BaseEntry) => boolean) | null;
    limitCount?: number | null;
    firstOnly?: boolean;
    searchClause?: [string, string] | null; // [field, searchString] for startsWithIgnoreCase
}

/**
 * Immutable fluent query builder for `pluginData` tables.
 *
 * Each method returns a **new** instance — safe to reuse and compose.
 *
 * Terminators:
 * - `.activeOnly()` — executes on active plugin only
 * - `.acrossPlugins(opts?)` — executes on active + dependencies in parallel
 */
export class PluginCollection {
    private readonly config: Required<CollectionConfig>;

    constructor(config: CollectionConfig = {}) {
        this.config = {
            baseFilter: config.baseFilter ?? {},
            whereClause: config.whereClause ?? null,
            whereInClause: config.whereInClause ?? null,
            filterFn: config.filterFn ?? null,
            limitCount: config.limitCount ?? null,
            firstOnly: config.firstOnly ?? false,
            searchClause: config.searchClause ?? null,
        };
    }

    private clone(overrides: Partial<CollectionConfig>): PluginCollection {
        return new PluginCollection({ ...this.config, ...overrides });
    }

    // -------------------------------------------------------------------------
    //  Chain methods (lazy, return new instance)
    // -------------------------------------------------------------------------

    /** Index-based where clause: `.where('TMP_id', value)` or `.where({ key: val })` */
    where(indexOrObj: string | Record<string, unknown>, value?: unknown): PluginCollection {
        if (typeof indexOrObj === 'string') {
            return this.clone({ whereClause: [indexOrObj, value] });
        }
        return this.clone({ whereClause: indexOrObj });
    }

    /** Index-based `.anyOf()`: `.whereIn('type', ['Npc', 'Creature'])` */
    whereIn(index: string, values: unknown[]): PluginCollection {
        return this.clone({ whereInClause: [index, values] });
    }

    /** Case-insensitive prefix search on an indexed field */
    search(index: string, searchString: string): PluginCollection {
        return this.clone({ searchClause: [index, searchString] });
    }

    /** JS-side filter (equivalent to Dexie `.and()`) */
    filter(fn: (val: BaseEntry) => boolean): PluginCollection {
        const existing = this.config.filterFn;
        // Compose filters: if there's already a filter, AND them
        const combined = existing
            ? (val: BaseEntry) => existing(val) && fn(val)
            : fn;
        return this.clone({ filterFn: combined });
    }

    /** Limit results count */
    limit(n: number): PluginCollection {
        return this.clone({ limitCount: n });
    }

    /** Only return the first matching result */
    first(): PluginCollection {
        return this.clone({ firstOnly: true });
    }

    // -------------------------------------------------------------------------
    //  Terminators (execute the query)
    // -------------------------------------------------------------------------

    /** Execute on active plugin only */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-polymorphic: returns single or array
    async activeOnly(): Promise<any> {
        const db = await getActiveDB();
        const results = await this.executeOn(db);
        // Tag results as active plugin entries
        if (this.config.firstOnly) {
            if (results) results.TMP_is_active = true;
        } else if (Array.isArray(results)) {
            for (const r of results) r.TMP_is_active = true;
        }
        return results;
    }

    /** Execute on active plugin + dependencies in parallel */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-polymorphic: returns single or array
    async acrossPlugins(options: QueryOptions = {}): Promise<any> {
        const { includeDeps = true, reverseDeps = false } = options;
        const activeDB = await getActiveDB();

        if (!includeDeps) {
            const results = await this.executeOn(activeDB);
            // Tag active results
            if (this.config.firstOnly) {
                if (results) results.TMP_is_active = true;
                return results;
            }
            for (const r of results) r.TMP_is_active = true;
            return results;
        }

        const deps = await getDependencies();
        const orderedDeps = reverseDeps ? [...deps].reverse() : deps;
        const databases = _getDatabases();
        const depDBs = orderedDeps.map((dep) => databases[dep]).filter(Boolean);

        const [activeResults, ...depResults] = await Promise.all([
            this.executeOn(activeDB),
            ...depDBs.map((db) => this.executeOn(db)),
        ]);

        if (this.config.firstOnly) {
            // Return the first non-null result across all DBs
            if (activeResults) {
                activeResults.TMP_is_active = true;
                return activeResults;
            }
            for (const result of depResults) {
                if (result) {
                    result.TMP_is_active = false;
                    return result;
                }
            }
            return null;
        }

        // Tag active entries
        for (const r of activeResults) r.TMP_is_active = true;
        const results = [...activeResults];
        // Tag dependency entries
        for (const batch of depResults) {
            for (const r of batch) r.TMP_is_active = false;
            results.push(...batch);
        }
        return results;
    }

    // -------------------------------------------------------------------------
    //  Query builder (internal)
    // -------------------------------------------------------------------------

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dexie query chain is inherently untyped
    private async executeOn(db: Dexie): Promise<any> {
        const { baseFilter, whereClause, whereInClause, filterFn, limitCount, firstOnly, searchClause } = this.config;
        const table = db.table('pluginData');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dexie query chain is inherently untyped
        let query: any;

        // Step 1: Apply indexed where clause
        if (searchClause) {
            // startsWithIgnoreCase search
            query = table.where(searchClause[0]).startsWithIgnoreCase(searchClause[1]);
        } else if (whereClause) {
            if (Array.isArray(whereClause)) {
                query = table.where(whereClause[0]).equals(whereClause[1] as IndexableType);
            } else {
                query = table.where(whereClause as Record<string, IndexableType>);
            }
        } else if (whereInClause) {
            query = table.where(whereInClause[0]).anyOf(whereInClause[1] as IndexableType[]);
        } else if (baseFilter && Object.keys(baseFilter).length === 1 && baseFilter.type) {
            // Optimise: use the 'type' index directly
            query = table.where('type').equals(baseFilter.type as IndexableType);
        } else {
            query = table.toCollection();
        }

        // Step 2: Apply base type filter (if not already used as where clause)
        const needsBaseFilter = baseFilter?.type && (searchClause || whereClause || whereInClause);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dexie filter callback
        const combinedFilter = (val: any): boolean => {
            if (needsBaseFilter && val.type !== baseFilter.type) return false;
            if (filterFn && !filterFn(val)) return false;
            return true;
        };

        if (needsBaseFilter || filterFn) {
            query = query.and(combinedFilter);
        }

        // Step 3: Limit
        if (limitCount) {
            query = query.limit(limitCount);
        }

        // Step 4: Execute
        if (firstOnly) {
            return query.first();
        }
        return query.toArray();
    }
}

// ---------------------------------------------------------------------------
//  Factory & pre-built collections
// ---------------------------------------------------------------------------

/** Create a collection with an optional base type filter */
export function collection(baseFilter?: Record<string, unknown>): PluginCollection {
    return new PluginCollection({ baseFilter });
}

// Pre-built typed collections
export const Dialogues = collection({ type: 'Dialogue' });
export const DialogueInfos = collection({ type: 'DialogueInfo' });
export const Npcs = collection({ type: 'Npc' });
export const Creatures = collection({ type: 'Creature' });
export const Headers = collection({ type: 'Header' });

/**
 * Unfiltered collection — for queries that don't start with a type filter.
 * Example: `PluginData.where('TMP_id', someId).activeOnly()`
 */
export const PluginData = collection();
