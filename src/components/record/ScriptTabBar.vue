<template>
  <div class="script-tab-bar" ref="tabBarRef" @wheel.prevent="onWheel">
    <div
      v-for="tab in scriptTabsStore.tabs"
      :key="tab.id"
      class="script-tab"
      :class="{ 'script-tab--active': tab.id === scriptTabsStore.activeTabId }"
      @click="scriptTabsStore.switchTab(tab.id)"
      @dblclick="startRename(tab)"
    >
      <span v-if="tab.isDirty" class="script-tab__dot" title="Unsaved changes" />

      <!-- Inline rename input -->
      <input
        v-if="renamingTabId === tab.id"
        ref="renameInputRef"
        class="script-tab__rename-input"
        :value="renameValue"
        @input="renameValue = ($event.target as HTMLInputElement).value"
        @keydown.enter="commitRename(tab)"
        @keydown.escape="cancelRename"
        @blur="commitRename(tab)"
        @click.stop
      />
      <span v-else class="script-tab__name">{{ tab.id }}</span>

      <button
        class="script-tab__close"
        @click.stop="scriptTabsStore.closeTab(tab.id)"
        title="Close"
      >&times;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useScriptTabs, type ScriptTab } from '@/stores/scriptTabs';
import { modifyEntry } from '@/api/import-export';
import { getActiveDB } from '@/api/db';
import { logger } from '@/services/logger';
import type { BaseEntry } from '@/types/pluginEntries';

const scriptTabsStore = useScriptTabs();

const tabBarRef = ref<HTMLElement | null>(null);
const renamingTabId = ref<string | null>(null);
const renameValue = ref('');
const renameInputRef = ref<HTMLInputElement[] | null>(null);

// --- Horizontal scroll on wheel ---
function onWheel(e: WheelEvent) {
  if (tabBarRef.value) {
    tabBarRef.value.scrollLeft += e.deltaY;
  }
}

// --- Inline rename ---
function startRename(tab: ScriptTab) {
  renamingTabId.value = tab.id;
  renameValue.value = tab.id;
  nextTick(() => {
    const inputs = renameInputRef.value;
    if (inputs && inputs.length) {
      inputs[0].focus();
      inputs[0].select();
    }
  });
}

function cancelRename() {
  renamingTabId.value = null;
  renameValue.value = '';
}

const emit = defineEmits<{
  (e: 'renamed', oldId: string, newId: string): void;
}>();

async function commitRename(tab: ScriptTab) {
  const oldId = tab.id;
  const newName = renameValue.value.trim();
  renamingTabId.value = null;

  // Validate
  if (!newName || newName === oldId) return;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
    alert('Script name must start with a letter or underscore and contain only letters, numbers, and underscores.');
    return;
  }

  // Check duplicate
  try {
    const db = await getActiveDB();
    const existing = await db.table('pluginData')
      .where('type').equals('Script')
      .filter((r: Record<string, unknown>) => r.id === newName)
      .first();
    if (existing) {
      alert(`A script named "${newName}" already exists.`);
      return;
    }
  } catch { /* proceed optimistically */ }

  // Update the entry
  const entry = tab.entry;
  entry.id = newName;
  entry.TMP_id = newName;

  // Update Begin line in the code
  const code = tab.unsavedCode;
  const updatedCode = code.replace(
    /^(\s*Begin\s+)\S+/im,
    `$1${newName}`
  );
  tab.unsavedCode = updatedCode;

  // Persist to DB
  try {
    if (entry.TMP_index != null) {
      await modifyEntry(entry as unknown as BaseEntry);
    }
  } catch (err) {
    logger.error('Script', 'Rename DB error', err);
  }

  // Update tab store
  scriptTabsStore.renameTab(oldId, newName, entry);

  emit('renamed', oldId, newName);
}
</script>

<style lang="scss">
.script-tab-bar {
  display: flex;
  align-items: stretch;
  height: 36px;
  min-height: 36px;
  background: rgb(28, 25, 16);
  border-bottom: 1px solid rgba(202, 165, 96, 0.15);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.script-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-family: 'Pelagiad', serif;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 80ms ease;
  border: none;
  background: transparent;
  color: rgba(216, 216, 216, 0.45);
  border-bottom: 2px solid transparent;
  position: relative;
  flex-shrink: 0;

  &:hover {
    background: rgba(49, 44, 28, 0.6);
    color: rgba(216, 216, 216, 0.7);
  }

  &--active {
    background: rgba(153, 136, 102, 0.15);
    color: rgb(216, 186, 131);
    border-bottom-color: rgb(202, 165, 96);

    &:hover {
      background: rgba(153, 136, 102, 0.2);
      color: rgb(216, 186, 131);
    }
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgb(81, 220, 111);
    flex-shrink: 0;
  }

  &__name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__rename-input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(202, 165, 96, 0.5);
    color: rgb(216, 186, 131);
    font-family: 'Pelagiad', serif;
    font-size: 14px;
    padding: 1px 4px;
    border-radius: 3px;
    outline: none;
    width: 150px;
  }

  &__close {
    font-size: 18px;
    line-height: 1;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.3;
    padding: 0 2px;
    font-family: 'Pelagiad', serif;
    transition: opacity 80ms ease, color 80ms ease;

    &:hover {
      opacity: 1;
      color: rgb(200, 80, 80);
    }
  }
}
</style>
