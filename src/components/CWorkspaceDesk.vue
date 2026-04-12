<template>
  <div class="workspace-desk" :class="{ 'workspace-desk--ai-fullscreen': aiPanelFullscreen }">
    <WorkspaceControls />
    <transition-group name="fadeSidebarr" :style="{ display: 'flex', width: '100%', height: '100%', minWidth: 0 }" mode="out-in">
      <SidebarMain v-show="!aiPanelFullscreen" />

      <DialogueFrame v-show="!aiPanelFullscreen" />
    </transition-group>

    <div
      v-if="aiPanelOpen"
      class="ai-panel-wrapper"
      :class="{ 'ai-panel-wrapper--fullscreen': aiPanelFullscreen }"
      :style="aiPanelFullscreen ? {} : { width: aiPanelWidth + 'px', minWidth: aiPanelWidth + 'px' }"
    >
      <div
        v-if="!aiPanelFullscreen"
        class="ai-panel-resize-handle"
        @mousedown="startResize"
      />
      <AiChatPanel @close="closeAi" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onUnmounted } from 'vue';
import SidebarMain from '@/components/SidebarMain.vue';
import WorkspaceControls from '@/components/WorkspaceControls.vue';
import DialogueFrame from './dialogue/DialogueFrame.vue';
import { useAiPanel } from '@/ai/panel-state';

const AiChatPanel = defineAsyncComponent(
  () => import('./ai/AiChatPanel.vue')
);

const { isOpen: aiPanelOpen, isFullscreen: aiPanelFullscreen, close: closeAi } = useAiPanel();

// --- Resizable AI Panel ---
const AI_WIDTH_KEY = 'teos_ai_panel_width';
const AI_MIN_WIDTH = 300;
const AI_MAX_WIDTH = 800;
const AI_DEFAULT_WIDTH = 420;

const aiPanelWidth = ref(AI_DEFAULT_WIDTH);

onMounted(() => {
  const saved = localStorage.getItem(AI_WIDTH_KEY);
  if (saved) {
    const val = parseInt(saved, 10);
    if (val >= AI_MIN_WIDTH && val <= AI_MAX_WIDTH) {
      aiPanelWidth.value = val;
    }
  }
});

let resizing = false;
let startX = 0;
let startWidth = 0;

function startResize(e: MouseEvent) {
  e.preventDefault();
  resizing = true;
  startX = e.clientX;
  startWidth = aiPanelWidth.value;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
}

function onResize(e: MouseEvent) {
  if (!resizing) return;
  // Dragging left = wider panel (panel is on the right side)
  const delta = startX - e.clientX;
  const newWidth = Math.min(AI_MAX_WIDTH, Math.max(AI_MIN_WIDTH, startWidth + delta));
  aiPanelWidth.value = newWidth;
}

function stopResize() {
  if (!resizing) return;
  resizing = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
  localStorage.setItem(AI_WIDTH_KEY, String(aiPanelWidth.value));
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<style>
.workspace-desk {
  height: calc(100% - 38px);
  width: 100%;
  display: flex;
}

.fadeSidebar-enter-active,
.fadeSidebar-leave-active {
  transition: all 0.3s ease-out;
  transform: translateX(0);
}

.fadeSidebar-enter,
.fadeSidebar-leave-to {
  transform: translateX(-100%);
}

/* AI panel wrapper with resize handle */
.ai-panel-wrapper {
  position: relative;
  flex-shrink: 0;
  display: flex;
  height: 100%;
}

.ai-panel-resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 20;
  transition: background 150ms ease;
}

.ai-panel-resize-handle:hover,
.ai-panel-resize-handle:active {
  background: rgba(202, 165, 96, 0.35);
}

.ai-panel-wrapper .ai-chat {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
}

.ai-panel-wrapper--fullscreen {
  flex: 1 !important;
  width: 100% !important;
  min-width: 0 !important;
}

.workspace-desk--ai-fullscreen > .fadeSidebarr-leave-active {
  display: none !important;
}
</style>
