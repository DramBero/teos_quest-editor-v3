import Dexie from 'dexie';
import {
    getActiveDB,
    getDependencies,
    _getDatabases,
    type QueryOptions,
} from './db';

// ---------------------------------------------------------------------------
//  PluginCollection — ORM-like fluent query builder for pluginData
// ---------------------------------------------------------------------------

interface CollectionConfig {
    baseFilter?: Record<string, unknown>;
    whereClause?: [string, unknown] | Record<string, unknown> | null;
    whereInClause?: [string, unknown[]] | null;
    filterFn?: ((val: any) => boolean) | null;
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
    filter(fn: (val: any) => boolean): PluginCollection {
        const existing = this.config.filterFn;
        // Compose filters: if there's already a filter, AND them
        const combined = existing
            ? (val: any) => existing(val) && fn(val)
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
    async activeOnly(): Promise<any> {
        const db = await getActiveDB();
        return this.executeOn(db);
    }

    /** Execute on active plugin + dependencies in parallel */
    async acrossPlugins(options: QueryOptions = {}): Promise<any> {
        const { includeDeps = true, reverseDeps = false } = options;
        const activeDB = await getActiveDB();

        if (!includeDeps) {
            return this.executeOn(activeDB);
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
            if (activeResults) return activeResults;
            for (const result of depResults) {
                if (result) return result;
            }
            return null;
        }

        const results = [...activeResults];
        for (const batch of depResults) {
            results.push(...batch);
        }
        return results;
    }

    // -------------------------------------------------------------------------
    //  Query builder (internal)
    // -------------------------------------------------------------------------

    private async executeOn(db: Dexie): Promise<any> {
        const { baseFilter, whereClause, whereInClause, filterFn, limitCount, firstOnly, searchClause } = this.config;
        const table = (db as any).pluginData;

        let query: any;

        // Step 1: Apply indexed where clause
        if (searchClause) {
            // startsWithIgnoreCase search
            query = table.where(searchClause[0]).startsWithIgnoreCase(searchClause[1]);
        } else if (whereClause) {
            if (Array.isArray(whereClause)) {
                query = table.where(whereClause[0]).equals(whereClause[1]);
            } else {
                query = table.where(whereClause);
            }
        } else if (whereInClause) {
            query = table.where(whereInClause[0]).anyOf(whereInClause[1]);
        } else if (baseFilter && Object.keys(baseFilter).length === 1 && baseFilter.type) {
            // Optimise: use the 'type' index directly
            query = table.where('type').equals(baseFilter.type);
        } else {
            query = table.toCollection();
        }

        // Step 2: Apply base type filter (if not already used as where clause)
        const needsBaseFilter = baseFilter?.type && (searchClause || whereClause || whereInClause);
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
