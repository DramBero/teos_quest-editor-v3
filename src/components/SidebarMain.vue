<template>
  <div class="sidebar" v-if="getSidebarActive">
    <JournalFrame v-show="getSidebarActive === 'Journal'" :key="4" />
    <SidebarFactions 
      v-show="getSidebarActive === 'Social'"
      title="Social"
      :entryTypes="[
        'Class',
        'Faction',
        'Race',
        'Skill',
        'Birthsign',
      ]"
      modificator="factions"
    />
    <SidebarFactions 
      v-show="getSidebarActive === 'Actors'"
      title="Actors"
      :entryTypes="[
        'Npc',
        'Creature',
        'LeveledCreature',
      ]"
      modificator="actors"
    />
    <SidebarFactions 
      v-show="getSidebarActive === 'Items'"
      title="Items"
      :entryTypes="[
        'Book',
        'Clothing',
        'Armor',
        'Weapon',
        'MiscItem',
        'RepairItem',
        'Apparatus',
        'Lockpick',
        'Probe',
        'Ingredient',
        'Alchemy',
        'LeveledItem',
      ]"
      modificator="items"
    />
    <SidebarFactions 
      v-show="getSidebarActive === 'Scripts'"
      title="Scripts"
      :entryTypes="[
        'Script',
        'GlobalVariable',
        'StartScript',
        'GameSetting',
      ]"
      modificator="scripts"
    />
    <SidebarFactions 
      v-show="getSidebarActive === 'Magic'"
      title="Magic"
      :entryTypes="[
        'Spell',
        'MagicEffect',
        'Enchanting',
        'Alchemy',
      ]"
      modificator="magic"
    />
    <SidebarFactions 
      v-show="getSidebarActive === 'Interact'"
      title="Interact"
      :entryTypes="[
        'Door',
        'Activator',
        'Container',
      ]"
      modificator="interact"
    />
  </div>
</template>

<script setup lang="ts">
import JournalFrame from '@/components/journal/JournalFrame.vue';
import SidebarFactions from '@/components/sidebar/SidebarFactions.vue';
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
