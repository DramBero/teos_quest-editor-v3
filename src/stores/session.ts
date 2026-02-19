import { ref, computed, toRaw } from 'vue';
import { defineStore } from 'pinia';
import {
    type Session,
    getAllSessions,
    getLastSession,
    saveSession,
    removeSession,
    getSessionByPluginKey,
    makePluginKey,
    generateSessionId,
} from '@/api/sessions-db';
import { setSessionKeyGetter } from '@/api/db';

export { makePluginKey } from '@/api/sessions-db';

export const useSessionStore = defineStore('session', () => {
    // -------------------------------------------------------------------------
    //  State
    // -------------------------------------------------------------------------

    const sessions = ref<Session[]>([]);
    const currentSession = ref<Session | null>(null);

    // -------------------------------------------------------------------------
    //  Getters
    // -------------------------------------------------------------------------

    const getActivePluginKey = computed(() => currentSession.value?.activePlugin ?? '');
    const hasChanges = computed(() => (currentSession.value?.changes ?? 0) > 0);
    const allSessions = computed(() => sessions.value);

    // Register with db.ts so getActiveDB() can resolve the key
    setSessionKeyGetter(() => getActivePluginKey.value);

    // -------------------------------------------------------------------------
    //  Actions
    // -------------------------------------------------------------------------

    /** Load all sessions from IndexedDB on app init. */
    async function loadSessions() {
        sessions.value = await getAllSessions();
    }

    /** Restore the most recently used session (called on page load). */
    async function restoreLastSession(): Promise<Session | null> {
        const last = await getLastSession();
        if (last) {
            currentSession.value = last;
        }
        return last ?? null;
    }

    /** Create a new session for a freshly imported plugin. */
    async function createSession(
        pluginName: string,
        pluginSize: number,
        dependencyKeys: string[],
    ): Promise<Session> {
        const pluginKey = makePluginKey(pluginName, pluginSize);

        // If a session for this exact plugin already exists → reuse it
        const existing = await getSessionByPluginKey(pluginKey);
        if (existing) {
            existing.lastOpened = Date.now();
            existing.dependencies = dependencyKeys;
            await saveSession({ ...toRaw(existing) });
            currentSession.value = existing;
            await loadSessions();
            return existing;
        }

        const session: Session = {
            id: generateSessionId(),
            activePlugin: pluginKey,
            pluginName,
            pluginSize,
            dependencies: dependencyKeys,
            lastOpened: Date.now(),
            changes: 0,
        };

        await saveSession({ ...session });
        currentSession.value = session;
        await loadSessions();
        return session;
    }

    /** Switch the current session to a different one. */
    async function switchSession(id: string) {
        const target = sessions.value.find((s) => s.id === id);
        if (!target) throw new Error(`Session ${id} not found`);
        target.lastOpened = Date.now();
        await saveSession({ ...toRaw(target) });
        currentSession.value = target;
    }

    /** Delete a session (does NOT delete the plugin DB). */
    async function deleteSession(id: string) {
        await removeSession(id);
        if (currentSession.value?.id === id) {
            currentSession.value = null;
        }
        await loadSessions();
    }

    /** Increment change counter (called on every mutation). */
    async function incrementChanges() {
        if (!currentSession.value) return;
        currentSession.value.changes++;
        await saveSession({ ...toRaw(currentSession.value) });
    }

    /** Reset change counter (called on export/save). */
    async function resetChanges() {
        if (!currentSession.value) return;
        currentSession.value.changes = 0;
        await saveSession({ ...toRaw(currentSession.value) });
    }

    return {
        // state
        sessions,
        currentSession,
        // getters
        getActivePluginKey,
        hasChanges,
        allSessions,
        // actions
        loadSessions,
        restoreLastSession,
        createSession,
        switchSession,
        deleteSession,
        incrementChanges,
        resetChanges,
    };
});
