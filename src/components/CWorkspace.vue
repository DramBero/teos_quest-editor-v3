<template>
  <div class="workspace">
    <ToolBarMain v-if="!reloadTriggered"/>
    <CWorkspaceDesk v-if="!reloadTriggered"/>
    <div class="status-bar"></div>
  </div>
</template>

<script setup lang="ts">
import ToolBarMain from './toolbar/ToolBarMain.vue';
import CWorkspaceDesk from './CWorkspaceDesk.vue';
import { useReloadTrigger } from '@/stores/reloadTrigger';
import { computed } from 'vue';

const reloadTriggerStore = useReloadTrigger();

const reloadTriggered = computed(() => {
  return reloadTriggerStore.getReloadTrigger;
})
</script>

<style>
.workspace {
  height: 100vh;
  max-height: 100vh;
}
</style>
