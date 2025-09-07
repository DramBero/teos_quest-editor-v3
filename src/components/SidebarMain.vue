<template>
  <div class="sidebar" v-if="getSidebarActive">
    <JournalFrame v-show="getSidebarActive === 'Journal'" :key="4" />
    <template 
      v-for="category in categories" 
      :key="category.name"
    >
      <SidebarFactions 
        v-show="getSidebarActive === category.name"
        :title="category.name"
        :entryTypes="category.items"
        :modificator="category.name.toLowerCase()"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import JournalFrame from '@/components/journal/JournalFrame.vue';
import SidebarFactions from '@/components/sidebar/SidebarFactions.vue';
import { useSidebar } from '@/stores/sidebar';
import { computed } from 'vue';

const categories = [
  {
    name: 'Social',
    items: [
      'Class',
      'Faction',
      'Race',
      'Skill',
      'Birthsign',
    ]
  },
  {
    name: 'Actors',
    items: [
      'Npc',
      'Creature',
      'LeveledCreature',
    ]
  },
  {
    name: 'Items',
    items: [
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
    ]
  },
  {
    name: 'Scripts',
    items: [
      'Script',
      'GlobalVariable',
      'StartScript',
    ]
  },
  {
    name: 'Magic',
    items: [
      'Spell',
      'MagicEffect',
      'Enchanting',
      'Alchemy',
    ]
  },
  {
    name: 'Interact',
    items: [
      'Door',
      'Activator',
      'Container',
    ]
  },
  {
    name: 'World',
    items: [
      'Cell',
      'Region',
      'Sound',
      'SoundGen',
      'LandscapeTexture',
      'Static',
      'Bodypart',
      'Light',
      'Landscape',
      'PathGrid',
      'GameSetting',
    ]
  },
]

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
