<template>
  <div class="sidebar" v-if="getSidebarActive">
    <JournalFrame v-show="getSidebarActive === 'Journal'" :key="4" />
    <!--     <HeaderFrame v-show="getSidebarActive === 'Header'" :key="5" />
    <SidebarFactions v-show="getSidebarActive === 'Factions'" :key="6" /> -->
  </div>
</template>

<script setup lang="ts">
import JournalFrame from '@/components/journal/JournalFrame.vue';
import { useSidebar } from '@/stores/sidebar';
import { computed } from 'vue';
const sidebarStore = useSidebar();
const getSidebarActive = computed(() => {
  return sidebarStore.getActiveItem;
});
</script>

<style lang="scss">
.sidebar {
  background-color: #986;
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  z-index: 2;
  //padding: 10px;
  min-width: 500px;
  max-width: 500px;
  height: 100%;
  max-height: 100%;
  font-family: 'Pelagiad';
  position: relative;
}
</style>
