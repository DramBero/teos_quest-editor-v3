<template>
  <div class="workspace-controls">
    <div class="workspace-controls__button"
      :class="{ 'workspace-controls__button_active': getSidebarActive === 'Journal' }"
      @click="toggleSidebarActive('Journal')">
      <GameIconsBookmarklet />
      <span>Journal</span>
      <div v-if="getCountTypes['Journal']" class="workspace-controls__amount">
        {{ getCountTypes['Journal'] }}
      </div>
    </div>
<!--     <div class="workspace-controls__button"
      :class="{ 'workspace-controls__button_active': getSidebarActive === 'Header' }"
      @click="toggleSidebarActive('Header')">
       <GameIconsGears />
      <span>Header</span>
    </div> -->
    <div
      v-for="category in categories"
      :key="category.name"
      class="workspace-controls__button"
      :class="{ 'workspace-controls__button_active': getSidebarActive === category.name }"
      @click="toggleSidebarActive(category.name)"
    >
      <component
        :is="iconComponent(category.name?.toLowerCase())"
      />
      <span>{{ category.name }}</span>
      <div v-if="getCategoryAmount(category.name)" class="workspace-controls__amount">
        {{ getCategoryAmount(category.name) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCountTypes } from '@/stores/countTypes';
import { useSidebar } from '@/stores/sidebar';
import { computed, defineAsyncComponent } from 'vue';

const sidebarStore = useSidebar();
function toggleSidebarActive(value: string) {
  sidebarStore.setActiveItem(value);
}
const getSidebarActive = computed(() => {
  return sidebarStore.getActiveItem;
});

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

const GameIconsBookmarklet = defineAsyncComponent(
  () => import('~icons/game-icons/bookmarklet/GameIconsBookmarklet.vue')
);
const GameIconsGears = defineAsyncComponent(
  () => import('~icons/game-icons/gears/GameIconsGears.vue')
);
const GameIconsOrganigram = defineAsyncComponent(
  () => import('~icons/game-icons/organigram/GameIconsOrganigram.vue')
);
const GameIconsCharacter = defineAsyncComponent(
  () => import('~icons/game-icons/character/GameIconsCharacter.vue')
);
const GameIconsGauntlet = defineAsyncComponent(
  () => import('~icons/game-icons/gauntlet/GameIconsGauntlet.vue')
);
const GameIconsMedievalVillage01 = defineAsyncComponent(
  () => import('~icons/game-icons/medieval-village-01/GameIconsMedievalVillage01.vue')
);
const OpenChest = defineAsyncComponent(
  () => import('~icons/game-icons/open-chest/OpenChest.vue')
);
const FireSpellCast = defineAsyncComponent(
  () => import('~icons/game-icons/fire-spell-cast/FireSpellCast.vue')
);

function iconComponent(key){
  switch(key) {
    case 'scripts': return GameIconsGears;
    case 'factions': return GameIconsOrganigram;
    case 'actors': return GameIconsCharacter;
    case 'items': return GameIconsGauntlet;
    case 'magic': return FireSpellCast;
    case 'interact': return OpenChest;
    case 'world': return GameIconsMedievalVillage01;
    default: return GameIconsBookmarklet;
  }
}

const countTypesStore = useCountTypes();
const getCountTypes = computed(() => countTypesStore.getTypesAmount);

function getCategoryAmount(category) {
  const types = categories.find(val => val.name === category)?.items || [];
  const amounts = types.map(val => getCountTypes.value?.[val] || 0);
  const amount = amounts.reduce((a, b) => a + b, 0);
  return amount;
}
</script>

<style lang="scss">
.workspace-controls {
  min-width: 70px;
  z-index: 5;
  height: 100%;
  background: rgb(49, 44, 28);
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 10px;
  &__amount {
    background-color: rgba(81, 220, 111, 0.9);
    border-radius: 10px;
    color: black;
    font-size: 15px;
    font-family: 'Pelagiad';
    display: flex;
    align-items: center;
    justify-content: center;;
    padding: 0px 5px;
    position: absolute;
    top: 5px;
    right: 5px;
  }
  &__button {
    width: 100%;
    user-select: none;
    cursor: pointer;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.05s ease-in;
    display: flex;
    flex-direction: column;
    position: relative;
    gap: 5px;
    border-left: 3px solid rgba(216, 216, 216, 0);
    border-right: 3px solid rgba(216, 216, 216, 0);
    color: rgba(216, 216, 216, 0.5);

    svg {
      height: 35px;
      width: 35px;
    }

    &:hover {
      color: rgba(216, 216, 216, 0.8);

      .icon-controls {
        fill: rgba(216, 216, 216, 0.8);
      }
    }

    &_active {
      color: rgba(216, 216, 216, 1);
      border-left: 3px solid rgba(216, 216, 216, 1);

      .icon-controls {
        fill: rgba(216, 216, 216, 1);
      }

      &:hover {
        color: rgba(216, 216, 216, 1);

        .icon-controls {
          fill: rgba(216, 216, 216, 1);
        }
      }
    }

    &_wip {
      &::before {
        content: 'TBA';
        font-family:
          'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
        position: absolute;
        top: 15px;
        right: 10px;
        font-weight: 500;
        font-size: 12px;
        color: white;
        text-align: center;
        transform: rotate(10deg);
        border-radius: 4px;
        width: 40px;
        height: 15px;
        background: rgb(177, 64, 64);
      }

      &:hover {
        color: rgba(216, 216, 216, 0.5);
        cursor: default;

        .icon-controls {
          fill: rgba(216, 216, 216, 0.5);
        }
      }
    }

    &:disabled {
      cursor: default;
      color: gray;

      .icon-controls {
        fill: gray;
      }

      &:hover {
        color: gray;

        .icon-controls {
          fill: gray;
        }
      }
    }
  }
}

.icon-controls {
  fill: rgba(216, 216, 216, 0.5);
  transition: fill 0.05s ease-out;
}
</style>
