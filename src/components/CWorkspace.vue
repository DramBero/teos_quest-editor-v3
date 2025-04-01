<template>
  <div class="workspace">
    <ToolBarMain />
    <CWorkspaceDesk />
    <div class="status-bar"></div>
  </div>
</template>

<script setup lang="ts">
import ToolBarMain from './toolbar/ToolBarMain.vue';
import CWorkspaceDesk from './CWorkspaceDesk.vue';

</script>

<style>
.workspace {
  height: 100vh;
  max-height: 100vh;
}
</style>
