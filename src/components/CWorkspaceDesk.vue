<template>
  <div class="workspace-desk">
    <WorkspaceControls />
    <transition-group name="fadeSidebarr" :style="{ display: 'flex', width: '100%', height: '100%' }" mode="out-in">
      <SidebarMain />

      <DialogueFrame v-show="true" />
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import SidebarMain from '@/components/SidebarMain.vue';
import WorkspaceControls from '@/components/WorkspaceControls.vue';
import DialogueFrame from './dialogue/DialogueFrame.vue';
</script>

<style>
.workspace-desk {
  height: calc(100% - 50px);
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
</style>
