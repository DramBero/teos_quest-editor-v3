import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface ScriptTab {
    /** Unique key — script name (or temp id for new scripts) */
    id: string;
    /** The DB record object */
    entry: Record<string, unknown>;
    /** Current editor text (preserved between switches) */
    unsavedCode: string;
    /** Last-saved text (to compute isDirty) */
    savedCode: string;
    /** Whether this tab has unsaved changes */
    isDirty: boolean;
}

export const useScriptTabs = defineStore('scriptTabs', () => {
    const tabs = ref<ScriptTab[]>([]);
    const activeTabId = ref<string | null>(null);

    const activeTab = computed(() =>
        tabs.value.find(t => t.id === activeTabId.value) ?? null
    );

    const hasOpenTabs = computed(() => tabs.value.length > 0);

    /** Open a script in a new tab, or focus existing tab */
    function openTab(entry: Record<string, unknown>) {
        const id = (entry.id as string) || (entry.TMP_id as string) || '';
        if (!id) return;

        const existing = tabs.value.find(t => t.id === id);
        if (existing) {
            activeTabId.value = id;
            return;
        }

        const code = typeof entry.text === 'string' ? entry.text : '';
        tabs.value.push({
            id,
            entry,
            unsavedCode: code,
            savedCode: code,
            isDirty: false,
        });
        activeTabId.value = id;
    }

    /** Close a tab by id. Returns true if closed, false if cancelled. */
    function closeTab(id: string): boolean {
        const tab = tabs.value.find(t => t.id === id);
        if (!tab) return true;

        if (tab.isDirty) {
            if (!confirm(`Script "${id}" has unsaved changes. Close anyway?`)) {
                return false;
            }
        }

        const idx = tabs.value.indexOf(tab);
        tabs.value.splice(idx, 1);

        // If we closed the active tab, switch to neighbor
        if (activeTabId.value === id) {
            if (tabs.value.length === 0) {
                activeTabId.value = null;
            } else {
                const newIdx = Math.min(idx, tabs.value.length - 1);
                activeTabId.value = tabs.value[newIdx].id;
            }
        }
        return true;
    }

    /** Switch to a tab */
    function switchTab(id: string) {
        if (tabs.value.some(t => t.id === id)) {
            activeTabId.value = id;
        }
    }

    /** Update the code buffer for a tab (called on each editor change) */
    function updateTabCode(id: string, code: string) {
        const tab = tabs.value.find(t => t.id === id);
        if (tab) {
            tab.unsavedCode = code;
            tab.isDirty = code !== tab.savedCode;
        }
    }

    /** Mark tab as saved (after successful save) */
    function markSaved(id: string, code: string) {
        const tab = tabs.value.find(t => t.id === id);
        if (tab) {
            tab.savedCode = code;
            tab.unsavedCode = code;
            tab.isDirty = false;
        }
    }

    /** Rename a tab (after inline rename) */
    function renameTab(oldId: string, newId: string, newEntry: Record<string, unknown>) {
        const tab = tabs.value.find(t => t.id === oldId);
        if (tab) {
            tab.id = newId;
            tab.entry = newEntry;
        }
        if (activeTabId.value === oldId) {
            activeTabId.value = newId;
        }
    }

    /** Close all tabs */
    function closeAll() {
        tabs.value = [];
        activeTabId.value = null;
    }

    return {
        tabs,
        activeTabId,
        activeTab,
        hasOpenTabs,
        openTab,
        closeTab,
        switchTab,
        updateTabCode,
        markSaved,
        renameTab,
        closeAll,
    };
});
