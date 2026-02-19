<template>
  <div>
    <div class="toolbar">
      <!-- Left: Undo / Redo -->
      <div class="toolbar__group">
        <button
          class="toolbar__btn"
          :class="{ 'toolbar__btn--disabled': !canUndo }"
          :disabled="!canUndo"
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L2.5 7.5v9h9l-3.19-3.19C9.84 12.02 11.11 11.5 12.5 11.5c3.03 0 5.55 2.11 6.22 4.94l2.86-.86C20.53 11.45 16.84 8 12.5 8z"/></svg>
        </button>
        <button
          class="toolbar__btn"
          :class="{ 'toolbar__btn--disabled': !canRedo }"
          :disabled="!canRedo"
          title="Redo (Ctrl+Y)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.34 0-8.03 3.45-9.08 7.58l2.86.86C5.95 13.61 8.47 11.5 11.5 11.5c1.39 0 2.66.52 3.69 1.31L12 16h9V7l-2.6 3.6z"/></svg>
        </button>
      </div>

      <!-- Right: Header / Export -->
      <div class="toolbar__group toolbar__group--right">
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

const pluginHeaderStore = usePluginHeader();
const primaryModalStore = usePrimaryModal();

const getTitle = computed<string>(() => pluginHeaderStore.getPluginHeader?.TMP_dep || '');

// Mock undo/redo state
const canUndo = ref(false);
const canRedo = ref(false);

function openHeaderModal() {
  primaryModalStore.setActiveModal('Upload');
}

async function savePlugin() {
  try {
    const plugin = await pluginToJSON();
    const file = save_objects(plugin);

    const blob = new Blob([file], { type: 'application/octet-stream' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getTitle.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
  }
}
</script>

<style lang="scss">
.toolbar {
  position: fixed;
  top: 42px;
  width: 100%;
  height: 38px;
  background-color: #cb9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Pelagiad';
  padding: 0 4px;
}

.pseudoheader {
  height: 38px;
  width: 100vw;
}

.toolbar__group {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 2px;

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
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  background: rgba(0, 0, 0, 0.08);
  border: none;
  border-radius: 4px;
  color: rgb(50, 40, 25);
  cursor: pointer;
  font-family: 'Pelagiad';
  font-size: 16px;
  transition: all 80ms ease;

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
    font-size: 15px;

    &:hover {
      background: rgba(0, 0, 0, 0.22);
    }
  }
}

.toolbar__header-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 14px;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Pelagiad';
  transition: all 80ms ease;

  &:hover {
    background: rgba(0, 0, 0, 0.12);

    .toolbar__edit-icon {
      opacity: 0.8;
    }
  }
}

.toolbar__plugin-name {
  font-size: 17px;
  color: rgb(50, 40, 25);
  font-weight: 500;
}

.toolbar__edit-icon {
  width: 14px;
  height: 14px;
  opacity: 0.4;
  transition: opacity 80ms ease;
  color: rgb(50, 40, 25);
}
</style>
