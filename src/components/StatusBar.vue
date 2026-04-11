<template>
  <div class="status-bar">
    <div class="status-bar__left">
      <template v-if="sessionStore.currentSession">
        <span class="status-bar__stat status-bar__stat--changes">
          <span class="status-bar__dot" :class="sessionStore.hasChanges ? 'status-bar__dot--blue' : 'status-bar__dot--dim'"></span>
          {{ sessionStore.currentSession.changes }} change{{ sessionStore.currentSession.changes !== 1 ? 's' : '' }}
        </span>
        <template v-if="dirtiedCount > 0">
          <span class="status-bar__separator">·</span>
          <span class="status-bar__stat status-bar__interactive status-bar__stat--dirtied" @click="openCleanDirtied" title="Dirtied entries (CS touched, no changes)">
            <span class="status-bar__dot status-bar__dot--yellow"></span>
            {{ dirtiedCount }} dirtied
          </span>
        </template>
        <span class="status-bar__separator">·</span>
        <span class="status-bar__stat status-bar__stat--time">
          Last opened: {{ formatLastOpened(sessionStore.currentSession.lastOpened) }}
        </span>
      </template>
      <span v-else class="status-bar__stat status-bar__stat--time">
        No active session
      </span>
    </div>

    <div class="status-bar__right">
      <span class="status-bar__stat status-bar__interactive" @click="openStorage" title="Manage Storage">
        Storage: {{ storageStats.storageUsed }} / {{ storageStats.storageTotal }}
      </span>
      <template v-if="sessionStore.currentSession">
        <span class="status-bar__separator">·</span>
        <span class="status-bar__stat status-bar__interactive" @click="openDeps" title="Manage Dependencies">
          {{ sessionStore.currentSession.pluginName }} + {{ sessionStore.currentSession.dependencies.length }} dep{{ sessionStore.currentSession.dependencies.length !== 1 ? 's' : '' }}
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/session';
import { usePrimaryModal } from '@/stores/modals';
import { useStorageStats } from '@/stores/storageStats';
import { getDirtiedEntries, dbMutationVersion } from '@/api/idb';

const sessionStore = useSessionStore();
const primaryModalStore = usePrimaryModal();
const storageStats = useStorageStats();

function openStorage() {
  primaryModalStore.setActiveModal('Storage');
}

function openDeps() {
  primaryModalStore.setActiveModal('Upload');
}

function openCleanDirtied() {
  primaryModalStore.setActiveModal('CleanDirtied');
}

// -------------------------------------------------------------------------
//  Dirtied entry counter
// -------------------------------------------------------------------------

const dirtiedCount = ref(0);

async function refreshDirtiedCount() {
  try {
    const dirtied = await getDirtiedEntries();
    dirtiedCount.value = dirtied.length;
  } catch {
    // Session not ready yet — ignore
    dirtiedCount.value = 0;
  }
}

// -------------------------------------------------------------------------
//  Last opened formatting
// -------------------------------------------------------------------------

function formatLastOpened(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 24);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// -------------------------------------------------------------------------
//  Init & watchers
// -------------------------------------------------------------------------

onMounted(() => {
  storageStats.updateStorageEstimate();
  refreshDirtiedCount();
});

// Re-estimate storage when session changes (plugin loaded/deleted)
watch(() => sessionStore.currentSession?.id, () => {
  storageStats.updateStorageEstimate();
  refreshDirtiedCount();
});

// Refresh dirtied count when DB mutates (entries added/deleted)
watch(dbMutationVersion, () => {
  refreshDirtiedCount();
});
</script>

<style lang="scss">
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 26px;
  background: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  font-size: 12px;
  color: rgba(220, 220, 220, 0.7);
  z-index: 10;
}

.status-bar__left,
.status-bar__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-bar__separator {
  color: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

.status-bar__stat {
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;

  &--changes { color: rgb(100, 170, 255); }
  &--time { color: rgba(220, 220, 220, 0.45); }
}

.status-bar__interactive {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  user-select: none;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
}

.status-bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &--blue { background: rgb(80, 160, 255); }
  &--yellow { background: rgb(220, 180, 50); }
  &--dim { background: rgba(255, 255, 255, 0.15); }
}
</style>
