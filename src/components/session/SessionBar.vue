<template>
  <div class="session-bar">
    <div class="session-tabs">
      <div
        v-for="session in sessionStore.allSessions"
        :key="session.id"
        class="session-tab"
        :class="{ 'session-tab--active': session.id === sessionStore.currentSession?.id }"
        @click="handleSwitchSession(session.id)"
      >
        <span v-if="session.id === sessionStore.currentSession?.id && sessionStore.hasChanges" class="session-tab__indicator"></span>
        <span class="session-tab__name">{{ session.pluginName }}</span>
        <span class="session-tab__size">{{ formatBytes(session.pluginSize) }}</span>
        <button class="session-tab__close" @click.stop="handleDeleteSession(session.id)" title="Close session">&times;</button>
      </div>

      <button class="session-tab session-tab--add" @click="onPlusClick" title="Add plugin">
        +
      </button>
    </div>

    <!-- Hidden file input for loading .esp/.esm -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".esp,.esm"
      style="display: none"
      @change="loadPluginFile"
    />

    <button class="session-bar__storage" @click="openGearMenu" title="Settings">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.24,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
      </svg>
    </button>


  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ContextMenu from '@imengyu/vue3-context-menu';
import { useSessionStore } from '@/stores/session';
import { usePluginHeader } from '@/stores/pluginHeader';
import { useReloadTrigger } from '@/stores/reloadTrigger';
import { usePrimaryModal } from '@/stores/modals';
import init, { load_objects } from '@/tes3_wasm/tes3_wasm.js';
import {
  importPlugin,
  getActiveHeader,
  getDependencies,
  initPlugin,
  makePluginKey,
  invalidateDependencyCache,
} from '@/api/idb';
import { logger } from '@/services/logger';

const sessionStore = useSessionStore();
const headerStore = usePluginHeader();
const reloadTriggerStore = useReloadTrigger();
const primaryModalStore = usePrimaryModal();

const fileInputRef = ref<HTMLInputElement | null>(null);
// -------------------------------------------------------------------------
//  Init
// -------------------------------------------------------------------------


onMounted(async () => {
  await init();
  await sessionStore.loadSessions();
  const restored = await sessionStore.restoreLastSession();
  if (restored) {
    const header = await getActiveHeader();
    if (header) {
      headerStore.setPluginHeader(header);
    }
    // Eagerly init deps so queryAcrossPlugins sees them immediately
    try { 
        const deps = await getDependencies(); 
        // Sync deps to session store if they differ (e.g. legacy or fresh import)
        if (JSON.stringify(restored.dependencies) !== JSON.stringify(deps)) {
            // Update session with correct deps
             await sessionStore.updateSession({
                 ...restored,
                 dependencies: deps
             });
        }
    } catch { /* no deps or header missing */ }
    // Signal data components to re-fetch (they may have mounted before session was ready)
    reloadTriggerStore.triggerReload();
  }
});

// -------------------------------------------------------------------------
//  Unsaved-changes guard
// -------------------------------------------------------------------------

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (sessionStore.currentSession && sessionStore.currentSession.changes > 0) {
    e.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload);
});

// -------------------------------------------------------------------------
//  Session tab actions
// -------------------------------------------------------------------------

async function handleSwitchSession(id: string) {
  if (sessionStore.currentSession?.id === id) return;
  invalidateDependencyCache();
  await sessionStore.switchSession(id);
  const header = await getActiveHeader();
  if (header) {
    headerStore.setPluginHeader(header);
  }
  // Ensure deps are up to date
  try {
      const deps = await getDependencies();
      if (sessionStore.currentSession && JSON.stringify(sessionStore.currentSession.dependencies) !== JSON.stringify(deps)) {
           await sessionStore.updateSession({
               ...sessionStore.currentSession,
               dependencies: deps
           });
      }
  } catch { /* ignore */ }
  
  reloadTriggerStore.triggerReload();
}

async function handleDeleteSession(id: string) {
  await sessionStore.deleteSession(id);
  // If we deleted the current session, try to restore the last remaining one
  if (!sessionStore.currentSession && sessionStore.sessions.length) {
    await sessionStore.switchSession(sessionStore.sessions[0].id);
    const header = await getActiveHeader();
    if (header) {
      headerStore.setPluginHeader(header);
    }
    reloadTriggerStore.triggerReload();
  }
}

// -------------------------------------------------------------------------
//  "+" button → context menu
// -------------------------------------------------------------------------

function onPlusClick(e: MouseEvent) {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      {
        label: 'Load .esp / .esm',
        onClick: () => { fileInputRef.value?.click(); },
      },
      {
        label: 'Create new plugin',
        onClick: () => { primaryModalStore.setActiveModal('CreatePlugin'); },
      },
    ],
  });
}

// -------------------------------------------------------------------------
//  File loading (moved from ToolBarReadFile.vue for session-level loading)
// -------------------------------------------------------------------------

async function loadPluginFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  const file = input.files[0];

  try {
    let buffer: ArrayBuffer | null = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let objects: any = await load_objects(bytes);
    buffer = null; // free raw buffer

    const pluginKey = makePluginKey(file.name, file.size);
    await importPlugin(objects, pluginKey, file.name, true);
    objects = null; // free parsed data ASAP

    // Create session (deps empty initially so getActiveDB works)
    const session = await sessionStore.createSession(file.name, file.size, []);

    // Resolve dependencies now that getActiveDB() works
    const deps = await getDependencies();
    for (const dep of deps) {
      await initPlugin(dep);
    }

    // Update deps in persistent store
    if (deps.length && session) {
      // Must fetch fresh session instance or update the one we have
      // Since createSession returns the object, we can update it
      await sessionStore.updateSession({
          ...session,
          dependencies: deps
      });
    }

    // Update header
    const header = await getActiveHeader();
    if (header) {
      headerStore.setPluginHeader(header);
    }

    reloadTriggerStore.triggerReload();

    // Open Upload modal to load master files immediately after loading plugin
    primaryModalStore.setActiveModal('Upload');
  } catch (error) {
    logger.error('Session', 'Failed to load plugin', error);
  } finally {
    // Reset input so the same file can be selected again
    input.value = '';
  }
}

// -------------------------------------------------------------------------
//  Gear menu
// -------------------------------------------------------------------------

function openGearMenu(e: MouseEvent) {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      {
        label: 'Edit Header',
        onClick: () => { primaryModalStore.setActiveModal('EditHeader'); },
        disabled: !sessionStore.currentSession,
      },
      {
        label: 'Upload Masters',
        onClick: () => { primaryModalStore.setActiveModal('Upload'); },
        disabled: !sessionStore.currentSession,
      },
      {
        label: 'Plugin Storage',
        onClick: () => { primaryModalStore.setActiveModal('Storage'); },
      },
      {
        label: 'Session History',
        disabled: true,
      },
      {
        label: 'Keyboard Shortcuts',
        disabled: true,
      },
      {
        label: 'About',
        disabled: true,
      },
    ],
  });
}



// -------------------------------------------------------------------------
//  Helpers
// -------------------------------------------------------------------------

function formatBytes(bytes: number, decimals: number = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
</script>

<style lang="scss">
.session-bar {
  height: 42px;
  min-height: 42px;
  background: rgb(35, 31, 20);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(202, 165, 96, 0.2);
  z-index: 10;
  position: relative;
}

.session-tabs {
  display: flex;
  height: 100%;
  align-items: stretch;
  gap: 1px;
  overflow-x: auto;
  flex: 1;

  &::-webkit-scrollbar {
    height: 0;
  }
}

.session-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  font-family: 'Pelagiad', serif;
  font-size: 17px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 80ms ease;
  border: none;
  background: rgba(49, 44, 28, 0.6);
  color: rgba(216, 216, 216, 0.5);
  border-bottom: 2px solid transparent;
  position: relative;

  &:hover {
    background: rgba(49, 44, 28, 0.9);
    color: rgba(216, 216, 216, 0.8);
  }

  &--active {
    background: rgba(153, 136, 102, 0.25);
    color: rgb(216, 186, 131);
    border-bottom: 2px solid rgb(202, 165, 96);

    &:hover {
      background: rgba(153, 136, 102, 0.3);
      color: rgb(216, 186, 131);
    }
  }

  &--add {
    font-size: 26px;
    padding: 0 18px;
    color: rgba(216, 216, 216, 0.3);
    background: transparent;

    &:hover {
      color: rgb(202, 165, 96);
      background: rgba(49, 44, 28, 0.5);
    }
  }

  &__indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(81, 220, 111);
    flex-shrink: 0;
  }

  &__name {
    font-weight: 500;
  }

  &__size {
    font-size: 13px;
    opacity: 0.5;
  }

  &__close {
    font-size: 22px;
    line-height: 1;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.4;
    padding: 2px 4px;
    font-family: 'Pelagiad', serif;
    transition: opacity 80ms ease, color 80ms ease;

    &:hover {
      opacity: 1;
      color: rgb(200, 80, 80);
    }
  }
}

.session-bar__storage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 100%;
  background: none;
  border: none;
  border-left: 1px solid rgba(202, 165, 96, 0.15);
  color: rgba(216, 216, 216, 0.4);
  cursor: pointer;
  transition: color 80ms ease;

  &:hover {
    color: rgb(202, 165, 96);
    background: rgba(49, 44, 28, 0.5);
  }

  svg {
    width: 18px;
    height: 18px;
  }
}


</style>
