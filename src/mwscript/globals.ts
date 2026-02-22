/**
 * Global variable type registry.
 *
 * Loads GlobalVariable records from IndexedDB (active plugin + dependencies)
 * and builds a case-insensitive name → VarType map so the code generator
 * can emit correct fetch/store opcodes for globals.
 */
import type { VarType } from './ast';
import { PluginData } from '@/api/collection';

// ---------------------------------------------------------------------------
//  GlobalVariable value → VarType mapping
// ---------------------------------------------------------------------------

/** Extract VarType from the tagged-enum value produced by WASM parser */
function valueToType(value: unknown): VarType {
    if (value && typeof value === 'object') {
        if ('Float' in value) return 'float';
        if ('Short' in value) return 'short';
        if ('Long' in value) return 'long';
    }
    // Default for unexpected shapes
    return 'long';
}

// ---------------------------------------------------------------------------
//  Loader
// ---------------------------------------------------------------------------

/**
 * Load all GlobalVariable records from the active plugin + dependencies
 * and return a case-insensitive name → type map.
 */
export async function loadGlobals(): Promise<Map<string, VarType>> {
    const globals = new Map<string, VarType>();

    try {
        const records = await PluginData
            .where({ type: 'GlobalVariable' })
            .acrossPlugins({ reverseDeps: true });

        for (const record of records) {
            const name = (record.id || record.TMP_id || '') as string;
            if (name) {
                globals.set(name.toLowerCase(), valueToType(record.value));
            }
        }
    } catch {
        // If DB is not available (e.g. in tests), return empty map
    }

    return globals;
}
