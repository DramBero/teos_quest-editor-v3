import { describe, it, expect, beforeAll } from 'vitest';
import 'fake-indexeddb/auto';
import { setSessionKeyGetter, initPlugin, getActiveDB, invalidateDependencyCache } from '@/api/db';
import { editTopicText } from '@/api/dialogue';
import { dbMutationVersion, addEntry } from '@/api/import-export';
import { useSessionStore } from '@/stores/session';
import { createPinia, setActivePinia } from 'pinia';

// Mock session store as it's not needed for pure API tests if we provide a getter
const mockSessionKey = 'test-plugin-key';

describe('Dialogue Persistence Integration', () => {
    beforeAll(async () => {
        // Initialize Pinia for session store
        setActivePinia(createPinia());
        
        // Essential to clear global state between test runs in the same environment
        invalidateDependencyCache();

        // Force session store init — it calls setSessionKeyGetter internally (session.ts:34)
        // We must init it first, then override the getter with our test key.
        const _sessionStore = useSessionStore();
        setSessionKeyGetter(() => mockSessionKey);
        const db = await initPlugin(mockSessionKey);
        
        // Add required Header record to satisfy getDependencies()
        await db.table('pluginData').add({
            type: 'Header',
            TMP_index: 0,
            TMP_dep: mockSessionKey,
            masters: [],
            num_objects: 0,
            id: 'Header'
        });
        
        // Reset mutation version
        dbMutationVersion.value = 0;
    });

    it('editTopicText should update existing active entry and increment dbMutationVersion', async () => {
        const db = await getActiveDB();
        const initialVersion = dbMutationVersion.value;

        // 1. Create an initial active entry
        const entryId = 'test-info-id';
        const initialText = 'Original Text';
        
        await addEntry({
            type: 'DialogueInfo',
            TMP_topic: 'Background',
            TMP_type: 'Topic',
            TMP_info_id: entryId,
            text: initialText,
            TMP_is_active: true,
            id: 'info-1',
            prev_id: '',
            next_id: '',
            data: { dialogue_type: 'Topic' }
        });

        // 2. Perform the edit
        const newText = 'Updated Text';
        const result = await editTopicText(entryId, newText);

        expect(result, 'editTopicText returned undefined. Check logs for potential Pinia/Dexie issues.').toBeDefined();
        expect(result?.text).toBe(newText);

        // 3. Verify it's in the DB
        const savedEntry = await db.table('pluginData').where('TMP_info_id').equals(entryId).first();
        expect(savedEntry, 'Entry was not saved to DB').toBeDefined();
        expect(savedEntry.text).toBe(newText);

        // 4. Verify mutation version was incremented
        expect(dbMutationVersion.value).toBeGreaterThan(initialVersion);
    });
});
