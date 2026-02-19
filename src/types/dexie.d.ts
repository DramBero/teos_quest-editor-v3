import Dexie, { type Table } from 'dexie';

/**
 * Augment Dexie's type with our dynamic `pluginData` table.
 *
 * All plugin databases are created with a `pluginData` table store
 * (see initPlugin in db.ts), but since it's created dynamically,
 * vanilla Dexie types don't know about it.
 *
 * This module augmentation adds `pluginData` to every Dexie instance.
 */
declare module 'dexie' {
    interface Dexie {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pluginData: Table<any>;
    }
}
