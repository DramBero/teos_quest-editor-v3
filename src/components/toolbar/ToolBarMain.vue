<template>
  <div>
    <div class="toolbar">
      <!-- Left: Undo / Redo -->
      <div class="toolbar__group">
        <button
          v-if="false"
          class="toolbar__btn"
          :class="{ 'toolbar__btn--disabled': !canUndo }"
          :disabled="!canUndo"
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L2.5 7.5v9h9l-3.19-3.19C9.84 12.02 11.11 11.5 12.5 11.5c3.03 0 5.55 2.11 6.22 4.94l2.86-.86C20.53 11.45 16.84 8 12.5 8z"/></svg>
        </button>
        <button
          v-if="false"
          class="toolbar__btn"
          :class="{ 'toolbar__btn--disabled': !canRedo }"
          :disabled="!canRedo"
          title="Redo (Ctrl+Y)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.34 0-8.03 3.45-9.08 7.58l2.86.86C5.95 13.61 8.47 11.5 11.5 11.5c1.39 0 2.66.52 3.69 1.31L12 16h9V7l-2.6 3.6z"/></svg>
        </button>
      </div>

      <!-- Center: AI toggle -->
      <div class="toolbar__group toolbar__group--center">

      </div>

      <!-- Right: Header / Export -->
      <div class="toolbar__group toolbar__group--right">
        <button
          class="toolbar__btn"
          :class="{ 'toolbar__btn--active': aiOpen }"
          title="Toggle AI Assistant"
          @click="aiOpen = !aiOpen"
        >
          <GameIconsGearsAi />
          <span>AI</span>
        </button>
        <button class="toolbar__btn" v-if="getTitle" @click="openHeaderModal" title="Edit plugin header">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>Header</span>
        </button>
        <button class="toolbar__btn toolbar__btn--action" @click="savePlugin" title="Export plugin file">
          <GameIconsSave />
          <span>Export</span>
        </button>
      </div>
    </div>
    <div class="pseudoheader"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePluginHeader } from '@/stores/pluginHeader';
import { usePrimaryModal } from '@/stores/modals';
import { pluginToJSON } from '@/api/idb.ts';
import { save_objects } from '@/tes3_wasm/tes3_wasm.js';
import GameIconsSave from '~icons/game-icons/save';
import GameIconsGearsAi from '~icons/game-icons/gears';
import { logger } from '@/services/logger';

const pluginHeaderStore = usePluginHeader();
const primaryModalStore = usePrimaryModal();

const getTitle = computed<string>(() => pluginHeaderStore.getPluginHeader?.TMP_dep || '');

// Mock undo/redo state
const canUndo = ref(false);
const canRedo = ref(false);

// AI panel state
import { useAiPanel } from '@/ai/panel-state';
const { isOpen: aiOpen } = useAiPanel();

function openHeaderModal() {
  primaryModalStore.setActiveModal('EditHeader');
}

async function savePlugin() {
  try {
    const plugin = await pluginToJSON();
    if (!plugin) {
      logger.error('Export', 'Nothing to export — no active session');
      return;
    }
    const file = save_objects(plugin);

    const blob = new Blob([file], { type: 'application/octet-stream' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getTitle.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    logger.success('Export', `${getTitle.value} exported successfully`);
  } catch (error) {
    logger.error('Export', 'Failed to export plugin', error);
  }
}
</script>

<style lang="scss">
@use '@/assets/_tokens.scss' as *;

.toolbar {
  position: fixed;
  top: 42px;
  width: 100%;
  height: 38px;
  background-color: $color-bg-sidebar;
  box-shadow: $shadow-panel;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: $font-main;
  padding: 0 $space-xs;
}

.pseudoheader {
  height: 38px;
  width: 100vw;
}

.toolbar__group {
  display: flex;
  align-items: center;
  height: 100%;
  gap: $space-xs;

  &--center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  &--right {
    margin-left: auto;
  }
}

.toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-sm;
  height: 34px;
  padding: 0 $space-md;
  background: rgba(0, 0, 0, 0.08);
  border: none;
  border-radius: $border-radius-sm;
  color: $color-text-dark;
  cursor: pointer;
  font-family: $font-main;
  font-size: $font-size-sm;
  transition: all $transition-fast;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  &--disabled {
    opacity: 0.3;
    cursor: default;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }
  }

  &--action {
    background: rgba(0, 0, 0, 0.12);

    &:hover {
      background: rgba(0, 0, 0, 0.22);
    }
  }
}

.toolbar__header-btn {
  display: flex;
  align-items: center;
  gap: $space-sm;
  height: 30px;
  padding: 0 $space-md;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: $border-radius-sm;
  cursor: pointer;
  font-family: $font-main;
  transition: all $transition-fast;

  &:hover {
    background: rgba(0, 0, 0, 0.12);

    .toolbar__edit-icon {
      opacity: 0.8;
    }
  }
}

.toolbar__plugin-name {
  font-size: $font-size-sm;
  color: $color-text-dark;
  font-weight: 500;
}

.toolbar__edit-icon {
  width: 14px;
  height: 14px;
  opacity: 0.4;
  transition: opacity $transition-fast;
  color: $color-text-dark;
}
</style>
