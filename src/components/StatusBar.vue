<template>
  <div class="status-bar">
    <div class="status-bar__left">
      <template v-if="sessionStore.currentSession">
        <span class="status-bar__stat status-bar__stat--changes">
          <span class="status-bar__dot" :class="sessionStore.hasChanges ? 'status-bar__dot--blue' : 'status-bar__dot--dim'"></span>
          {{ sessionStore.currentSession.changes }} change{{ sessionStore.currentSession.changes !== 1 ? 's' : '' }}
        </span>
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
      <span class="status-bar__stat">
        Storage: {{ storageUsed }} / {{ storageTotal }}
      </span>
      <template v-if="sessionStore.currentSession">
        <span class="status-bar__separator">·</span>
        <span class="status-bar__stat">
          {{ sessionStore.currentSession.pluginName }} + {{ sessionStore.currentSession.dependencies.length }} dep{{ sessionStore.currentSession.dependencies.length !== 1 ? 's' : '' }}
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/session';

const sessionStore = useSessionStore();

// -------------------------------------------------------------------------
//  Storage estimate (real data from browser API)
// -------------------------------------------------------------------------

const storageUsed = ref('—');
const storageTotal = ref('—');

async function updateStorageEstimate() {
  if (!navigator.storage?.estimate) return;
  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const totalBytes = estimate.quota ?? 0;
    storageUsed.value = formatStorageSize(usedBytes);
    storageTotal.value = formatStorageSize(totalBytes);
  } catch {
    // Silently ignore — some browsers don't support this
  }
}

function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  if (bytes < k * k) return `${(bytes / k).toFixed(0)} KB`;
  if (bytes < k * k * k) return `${(bytes / (k * k)).toFixed(1)} MB`;
  return `${(bytes / (k * k * k)).toFixed(1)} GB`;
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
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// -------------------------------------------------------------------------
//  Init & watchers
// -------------------------------------------------------------------------

onMounted(() => {
  updateStorageEstimate();
});

// Re-estimate storage when session changes (plugin loaded/deleted)
watch(() => sessionStore.currentSession?.id, () => {
  updateStorageEstimate();
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

  &--changes { color: rgb(100, 170, 255); }
  &--time { color: rgba(220, 220, 220, 0.45); }
}

.status-bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &--blue { background: rgb(80, 160, 255); }
  &--dim { background: rgba(255, 255, 255, 0.15); }
}
</style>
