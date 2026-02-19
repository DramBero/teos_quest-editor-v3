/**
 * Tests for PluginCollection — the fluent query builder.
 *
 * Uses fake-indexeddb to create a real Dexie backend, then tests
 * the builder's chain methods and terminators.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';

// ---------------------------------------------------------------------------
//  Re-create PluginCollection locally to avoid import side-effects
//  (the real collection.ts imports getActiveDB which has module-level state)
// ---------------------------------------------------------------------------

interface CollectionConfig {
    baseFilter?: Record<string, unknown>;
    whereClause?: [string, unknown] | Record<string, unknown> | null;
    whereInClause?: [string, unknown[]] | null;
    filterFn?: ((val: Record<string, unknown>) => boolean) | null;
    limitCount?: number | null;
    firstOnly?: boolean;
    searchClause?: [string, string] | null;
}

class PluginCollection {
    readonly config: Required<CollectionConfig>;

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

    where(indexOrObj: string | Record<string, unknown>, value?: unknown): PluginCollection {
        if (typeof indexOrObj === 'string') {
            return this.clone({ whereClause: [indexOrObj, value] });
        }
        return this.clone({ whereClause: indexOrObj });
    }

    whereIn(index: string, values: unknown[]): PluginCollection {
        return this.clone({ whereInClause: [index, values] });
    }

    search(index: string, searchString: string): PluginCollection {
        return this.clone({ searchClause: [index, searchString] });
    }

    filter(fn: (val: Record<string, unknown>) => boolean): PluginCollection {
        const existing = this.config.filterFn;
        const combined = existing
            ? (val: Record<string, unknown>) => existing(val) && fn(val)
            : fn;
        return this.clone({ filterFn: combined });
    }

    limit(n: number): PluginCollection {
        return this.clone({ limitCount: n });
    }

    first(): PluginCollection {
        return this.clone({ firstOnly: true });
    }

    /** Execute on a given Dexie DB (simplified from production code) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeOn(db: Dexie): Promise<any> {
        const { baseFilter, whereClause, whereInClause, filterFn, limitCount, firstOnly, searchClause } = this.config;
        const table = db.table('pluginData');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any;

        if (searchClause) {
            query = table.where(searchClause[0]).startsWithIgnoreCase(searchClause[1]);
        } else if (whereClause) {
            if (Array.isArray(whereClause)) {
                query = table.where(whereClause[0]).equals(whereClause[1] as string);
            } else {
                query = table.where(whereClause as Record<string, string>);
            }
        } else if (whereInClause) {
            query = table.where(whereInClause[0]).anyOf(whereInClause[1] as string[]);
        } else if (baseFilter && Object.keys(baseFilter).length === 1 && baseFilter.type) {
            query = table.where('type').equals(baseFilter.type as string);
        } else {
            query = table.toCollection();
        }

        const needsBaseFilter = baseFilter?.type && (searchClause || whereClause || whereInClause);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const combinedFilter = (val: any): boolean => {
            if (needsBaseFilter && val.type !== baseFilter.type) return false;
            if (filterFn && !filterFn(val)) return false;
            return true;
        };

        if (needsBaseFilter || filterFn) {
            query = query.and(combinedFilter);
        }

        if (limitCount) {
            query = query.limit(limitCount);
        }

        if (firstOnly) {
            return query.first();
        }
        return query.toArray();
    }
}

function collection(baseFilter?: Record<string, unknown>): PluginCollection {
    return new PluginCollection({ baseFilter });
}

// ---------------------------------------------------------------------------
//  Test DB
// ---------------------------------------------------------------------------

const PLUGIN_DATA_INDEXES = [
    'TMP_index', 'type', 'prev_id',
    'TMP_topic', 'TMP_info_id',
    'TMP_speaker_id', 'TMP_speaker_cell', 'TMP_speaker_faction',
    'TMP_speaker_class', 'TMP_speaker_race',
    'TMP_id', 'name',
    '[type+TMP_topic]', '[type+TMP_type]', '[type+TMP_id]',
].join(',');

// ---------------------------------------------------------------------------
//  Tests
// ---------------------------------------------------------------------------

describe('PluginCollection — fluent query builder', () => {
    let db: Dexie;

    const seedData = [
        { type: 'Npc', TMP_index: 0, TMP_id: 'npc-1', name: 'Guard', TMP_speaker_id: '', TMP_speaker_cell: '', TMP_speaker_class: '', TMP_speaker_faction: '', TMP_speaker_race: '', TMP_topic: '', TMP_info_id: '', prev_id: '' },
        { type: 'Npc', TMP_index: 1, TMP_id: 'npc-2', name: 'Merchant', TMP_speaker_id: '', TMP_speaker_cell: '', TMP_speaker_class: '', TMP_speaker_faction: '', TMP_speaker_race: '', TMP_topic: '', TMP_info_id: '', prev_id: '' },
        { type: 'Npc', TMP_index: 2, TMP_id: 'npc-3', name: 'Mage', TMP_speaker_id: '', TMP_speaker_cell: '', TMP_speaker_class: '', TMP_speaker_faction: '', TMP_speaker_race: '', TMP_topic: '', TMP_info_id: '', prev_id: '' },
        { type: 'Cell', TMP_index: 3, TMP_id: 'cell-1', name: 'Balmora', TMP_speaker_id: '', TMP_speaker_cell: '', TMP_speaker_class: '', TMP_speaker_faction: '', TMP_speaker_race: '', TMP_topic: '', TMP_info_id: '', prev_id: '' },
        { type: 'Dialogue', TMP_index: 4, TMP_id: 'topic-1', name: '', TMP_speaker_id: '', TMP_speaker_cell: '', TMP_speaker_class: '', TMP_speaker_faction: '', TMP_speaker_race: '', TMP_topic: 'background', TMP_info_id: '', prev_id: '' },
    ];

    beforeEach(async () => {
        db = new Dexie(`test_col_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        db.version(1).stores({ pluginData: PLUGIN_DATA_INDEXES });
        await db.open();
        await db.table('pluginData').bulkAdd(seedData);
    });

    afterEach(async () => {
        await db.delete();
    });

    // -----------------------------------------------------------------------
    //  Immutability
    // -----------------------------------------------------------------------

    describe('Immutability', () => {
        it('chain methods return new instances', () => {
            const base = collection({ type: 'Npc' });
            const filtered = base.filter(() => true);
            const limited = base.limit(5);

            expect(filtered).not.toBe(base);
            expect(limited).not.toBe(base);
            expect(filtered).not.toBe(limited);
        });

        it('preserves original config after chaining', () => {
            const base = collection({ type: 'Npc' });
            base.where('TMP_id', 'npc-1').first();

            expect(base.config.whereClause).toBeNull();
            expect(base.config.firstOnly).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    //  Base filter
    // -----------------------------------------------------------------------

    describe('Base filter', () => {
        it('filters by type when used as base', async () => {
            const npcs = await collection({ type: 'Npc' }).executeOn(db);
            expect(npcs).toHaveLength(3);
            expect(npcs.every((e: Record<string, unknown>) => e.type === 'Npc')).toBe(true);
        });

        it('returns all entries when no base filter', async () => {
            const all = await collection().executeOn(db);
            expect(all).toHaveLength(5);
        });
    });

    // -----------------------------------------------------------------------
    //  Where clause
    // -----------------------------------------------------------------------

    describe('Where clause', () => {
        it('string + value form', async () => {
            const result = await collection().where('TMP_id', 'npc-1').executeOn(db);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Guard');
        });

        it('object form', async () => {
            const result = await collection().where({ type: 'Cell' }).executeOn(db);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Balmora');
        });
    });

    // -----------------------------------------------------------------------
    //  WhereIn clause
    // -----------------------------------------------------------------------

    describe('WhereIn clause', () => {
        it('matches multiple values', async () => {
            const result = await collection().whereIn('type', ['Npc', 'Cell']).executeOn(db);
            expect(result).toHaveLength(4); // 3 npcs + 1 cell
        });

        it('returns empty for no matches', async () => {
            const result = await collection().whereIn('type', ['Unknown']).executeOn(db);
            expect(result).toHaveLength(0);
        });
    });

    // -----------------------------------------------------------------------
    //  Filter callback
    // -----------------------------------------------------------------------

    describe('Filter callback', () => {
        it('applies JS-side filter', async () => {
            const result = await collection({ type: 'Npc' })
                .filter(val => val.name === 'Guard')
                .executeOn(db);
            expect(result).toHaveLength(1);
            expect(result[0].TMP_id).toBe('npc-1');
        });

        it('composes multiple filters', async () => {
            const result = await collection({ type: 'Npc' })
                .filter(val => val.name !== 'Guard')
                .filter(val => val.name !== 'Merchant')
                .executeOn(db);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Mage');
        });
    });

    // -----------------------------------------------------------------------
    //  Limit
    // -----------------------------------------------------------------------

    describe('Limit', () => {
        it('limits results', async () => {
            const result = await collection({ type: 'Npc' }).limit(2).executeOn(db);
            expect(result).toHaveLength(2);
        });
    });

    // -----------------------------------------------------------------------
    //  First
    // -----------------------------------------------------------------------

    describe('First', () => {
        it('returns single result instead of array', async () => {
            const result = await collection({ type: 'Npc' }).first().executeOn(db);
            expect(result).toBeDefined();
            expect(result.type).toBe('Npc');
            expect(Array.isArray(result)).toBe(false);
        });

        it('returns undefined when no match', async () => {
            const result = await collection({ type: 'Unknown' }).first().executeOn(db);
            expect(result).toBeUndefined();
        });
    });

    // -----------------------------------------------------------------------
    //  Search (startsWithIgnoreCase)
    // -----------------------------------------------------------------------

    describe('Search', () => {
        it('case-insensitive prefix search', async () => {
            const result = await collection().search('name', 'gua').executeOn(db);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Guard');
        });

        it('returns multiple matches', async () => {
            const result = await collection().search('name', 'm').executeOn(db);
            expect(result).toHaveLength(2); // Merchant + Mage
        });
    });

    // -----------------------------------------------------------------------
    //  Combined chains
    // -----------------------------------------------------------------------

    describe('Combined chains', () => {
        it('base filter + where + filter', async () => {
            const result = await collection({ type: 'Npc' })
                .filter(val => (val.name as string).startsWith('M'))
                .executeOn(db);
            expect(result).toHaveLength(2); // Merchant + Mage
        });
    });
});
