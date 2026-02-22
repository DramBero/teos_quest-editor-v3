<template>
  <div class="storage-modal">
    <!-- Confirmation Overlay -->
    <div v-if="confirmAction" class="storage-modal__confirm">
        <div class="storage-modal__confirm-box">
            <p>{{ confirmAction.message }}</p>
            <div class="storage-modal__confirm-actions">
                <button class="btn-cancel" @click="confirmAction = null">Cancel</button>
                <button class="btn-confirm" @click="executeConfirm">Confirm</button>
            </div>
        </div>
    </div>

    <div class="storage-modal__header">
      <h3>Plugin Storage</h3>
      <button class="storage-modal__close" @click="closeModal">&times;</button>
    </div>

    <div class="storage-modal__quota">
      <div class="storage-modal__quota-header">
        <div class="storage-modal__quota-text">
            Used: <strong>{{ storageStats.storageUsed }} </strong> / {{ storageStats.storageTotal }}
        </div>
        <div v-if="storageStats.isPersisted" class="storage-modal__badge-persisted" title="Storage is persistent and won't be cleared by the browser">
            Persistent
        </div>
        <button v-else class="storage-modal__btn-persist" @click="requestPersist" title="Request persistent storage to prevent browser eviction">
            Request Persistence
        </button>
      </div>
      <div class="storage-modal__quota-bar">
        <div class="storage-modal__quota-fill" :style="{ width: storageStats.storagePercent + '%' }"></div>
      </div>
    </div>

    <div class="storage-modal__list">
      <div
        v-for="plugin in cachedPlugins"
        :key="plugin.key"
        class="storage-modal__item"
        :title="plugin.name"
      >
        <span class="storage-modal__item-icon">📜</span>
        <div class="storage-modal__item-info">
          <span class="storage-modal__item-name">{{ plugin.name }}</span>
          <span v-if="plugin.sessions" class="storage-modal__item-sessions">
            {{ plugin.sessions }} session{{ plugin.sessions > 1 ? 's' : '' }}
          </span>
        </div>
        <span class="storage-modal__item-size">{{ storageStats.formatBytes(plugin.size) }}</span>
        <button
          class="storage-modal__item-delete"
          :disabled="plugin.sessions > 0"
          :title="plugin.sessions > 0 ? 'Used in active sessions' : 'Delete cached plugin'"
          @click="requestDelete(plugin)"
        >
          &times;
        </button>
      </div>
       <div v-if="cachedPlugins.length === 0" class="storage-modal__empty">
        No plugins cached.
      </div>
    </div>

    <div class="storage-modal__footer">
        <div class="storage-modal__actions">
            <div class="storage-modal__reset-group">
                <button class="storage-modal__btn-reset" @click="requestReset" title="Clear theme and local preferences">
                Reset App Settings
                </button>
                <span class="storage-modal__reset-hint">Clears local preferences (theme, window positions) but keeps plugins.</span>
            </div>
            
            <button class="storage-modal__clear" @click="requestClearUnused" :disabled="!hasUnused">
                Clear All Unused
            </button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Dexie from 'dexie';
import { deleteDB, makePluginKey } from '@/api/db';
import { useSessionStore } from '@/stores/session';
import { usePrimaryModal } from '@/stores/modals';
import { useStorageStats } from '@/stores/storageStats';

const sessionStore = useSessionStore();
const primaryModalStore = usePrimaryModal();
const storageStats = useStorageStats();

interface PluginInfo {
  key: string;
  name: string;
  size: number;
  sessions: number;
}
const cachedPlugins = ref<PluginInfo[]>([]);

const hasUnused = computed(() => cachedPlugins.value.some(p => p.sessions === 0));

// Confirmation state
interface ConfirmRequest {
    message: string;
    action: () => Promise<void>;
}
const confirmAction = ref<ConfirmRequest | null>(null);

async function executeConfirm() {
    if (confirmAction.value) {
        await confirmAction.value.action();
        confirmAction.value = null;
    }
}

async function requestPersist() {
    if (confirm("Allow site to use persistent storage?\nThis prevents the browser from automatically deleting data to clear space.\n\nNote: The browser may still prompt you for permission.")) {
        const granted = await storageStats.requestPersistence();
        if (granted) {
            alert("Persistent storage granted!");
        } else {
            alert("Persistent storage request failed or denied.");
        }
    }
}

onMounted(async () => {
    // Initial fetch
    storageStats.updateStorageEstimate();
    listPlugins();
});

async function listPlugins() {
    const dbNames = await Dexie.getDatabaseNames();
    const pluginList: PluginInfo[] = [];

    const usedKeys = new Set<string>();
    for (const session of sessionStore.allSessions) {
        const sessionKey = makePluginKey(session.pluginName, session.pluginSize);
        usedKeys.add(sessionKey);
        for (const depKey of session.dependencies) {
            usedKeys.add(depKey);
        }
    }

    for (const key of dbNames) {
        if (key.startsWith('plugin_')) {
            const parts = key.match(/^plugin_(.+)_(\d+)$/);
            let name = key;
            let size = 0;
            if (parts) {
                name = parts[1];
                size = parseInt(parts[2], 10);
            } else {
                name = key.replace('plugin_', '');
            }
            
            let usageCount = 0;
             for (const session of sessionStore.allSessions) {
                 const sk = makePluginKey(session.pluginName, session.pluginSize);
                 if (sk === key || session.dependencies.includes(key)) {
                     usageCount++;
                 }
             }

            pluginList.push({
                key,
                name,
                size,
                sessions: usageCount
            });
        }
    }
    cachedPlugins.value = pluginList.sort((a, b) => a.name.localeCompare(b.name));
}

function requestDelete(plugin: PluginInfo) {
    confirmAction.value = {
        message: `Delete cached data for "${plugin.name}"?`,
        action: async () => {
             await deleteDB(plugin.key);
             await listPlugins();
             storageStats.updateStorageEstimate();
        }
    };
}

function requestClearUnused() {
    const unused = cachedPlugins.value.filter(p => p.sessions === 0);
    if (unused.length === 0) return;
    confirmAction.value = {
        message: `Delete ${unused.length} unused plugins?`,
        action: async () => {
            for (const p of unused) {
                await deleteDB(p.key);
            }
            await listPlugins();
            storageStats.updateStorageEstimate();
        }
    }
}

function requestReset() {
    confirmAction.value = {
        message: "Reset layout and theme preferences? (Plugins will be kept)",
        action: async () => {
             localStorage.clear();
             window.location.reload();
        }
    }
}

function closeModal() {
    primaryModalStore.setActiveModal('');
}
</script>

<style scoped lang="scss">
.storage-modal {
  background: #d4b896;
  width: 100%;
  height: 100%; /* Fill parent */
  display: flex;
  flex-direction: column;
  font-family: 'Pelagiad', serif;
  color: rgb(50, 40, 25);
  position: relative; /* For overlay */

  /* Override generic ModalFrame padding if needed via negative margins, 
     or rely on parent styles being updated. 
     Assuming ModalFrame adds padding, negative margins can pull it back 
     to edges IF overflow matches. 
     But better to just fit nicely inside. 
     User complained about "margins on sides".
     If we make this full width/height of the content area provided by ModalFrame.
  */
  
  &__confirm {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
  }
  
  &__confirm-box {
      background: #e8d0b0;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 80%;
      text-align: center;
      border: 1px solid rgba(0,0,0,0.1);
      
      p {
          font-size: 18px;
          margin-bottom: 20px;
          color: rgb(40, 30, 15);
      }
  }
  
  &__confirm-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      
      button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-family: 'Pelagiad', serif;
          font-size: 16px;
          transition: all 0.1s;
      }
      
      .btn-cancel {
          background: rgba(0,0,0,0.1);
          color: rgba(0,0,0,0.7);
          &:hover { background: rgba(0,0,0,0.15); }
      }
      
      .btn-confirm {
          background: rgb(180, 60, 60);
          color: white;
          &:hover { background: rgb(200, 70, 70); }
      }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    h3 {
      color: rgb(50, 40, 25);
      font-size: 24px;
      font-weight: 500;
      margin: 0;
    }
  }

  &__close {
    background: none;
    border: none;
    color: rgba(50, 40, 25, 0.4);
    font-size: 26px;
    cursor: pointer;
    font-family: 'Pelagiad', serif;
    display: none; /* ModalFrame has close button usually? No, ModalMain has it. */
    /* Wait, this modal is rendered inside ModalMain > ModalFrame?
       If ModalMain has a close button, we might not need one here.
       The existing mock had one.
       If we are inside ModalFrame, user might want to close just this content?
       No, close modal closes the window.
       If ModalMain shows a header, we might be duplicating headers.
       ModalMain shows: <div class="window-header__name">{{ props.header }}</div>
       If we pass header prop to ModalMain, it shows there.
       ModalFrame does not seem to pass header prop based on content type?
       We'll keep it for now.
    */
  }

  &__quota {
    padding: 18px 24px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  &__quota-text {
    font-size: 18px;
    color: rgb(50, 40, 25);
    margin-bottom: 10px;

    strong {
      color: rgb(35, 25, 10);
    }
  }

  &__quota-bar {
    height: 8px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    overflow: hidden;
  }

  &__quota-fill {
    height: 100%;
    background: rgb(60, 160, 80);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  &__list {
    padding: 4px 0;
    overflow-y: auto;
    flex: 1; /* Take remaining space */
  }
  
  &__empty {
      padding: 24px;
      text-align: center;
      opacity: 0.5;
      font-style: italic;
  }

  &__item {
    display: grid;
    grid-template-columns: 24px 1fr 80px 32px;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    transition: background 80ms ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  &__item-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  &__item-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  &__item-name {
    color: rgb(50, 40, 25);
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-size {
    color: rgba(50, 40, 25, 0.55);
    font-size: 15px;
    text-align: right;
  }

  &__item-sessions {
    font-size: 12px;
    color: rgb(30, 120, 50);
    background: rgba(60, 160, 80, 0.15);
    padding: 2px 7px;
    border-radius: 8px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__item-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    color: rgb(180, 60, 60);
    opacity: 0.7;
    transition: opacity 80ms ease;
    padding: 2px 6px;
    line-height: 1;
    text-align: center;

    &:hover:not(:disabled) {
      opacity: 1;
    }

    &:disabled {
      opacity: 0.15;
      cursor: not-allowed;
    }
  }

  &__footer {
    padding: 18px 24px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0,0,0,0.02);
  }
  
  &__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  &__clear {
    background: rgba(0, 0, 0, 0.7);
    border: none;
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Pelagiad', serif;
    font-size: 16px;
    transition: all 80ms ease;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.85);
      color: white;
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
  }
  
  &__reset-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
  }
  
  &__reset-hint {
      font-size: 12px;
      color: rgba(50, 40, 25, 0.6);
      font-style: italic;
      max-width: 250px;
      line-height: 1.2;
  }
  
  &__btn-reset {
      background: transparent;
      border: 1px solid rgba(180, 60, 60, 0.3);
      color: rgb(180, 60, 60);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-family: 'Pelagiad', serif;
      font-size: 15px;
      transition: all 80ms ease;
      
      &:hover {
          background: rgba(180, 60, 60, 0.1);
      }
  }
}
</style>
