<template>
  <div 
    class="journal-frame"
    :class="`journal-frame_${props.modificator}`"
  >
    <div class="journal-frame__header" v-if="true">
      <div class="frame-title types">
        <button
          v-for="type in entryTypes"
          :key="type"
          class="types__item"
          :class="{'types__item_selected': selectedType === type}"
          @click="selectedType = type"
        >
          {{ type }}
          <div class="types__amount" v-if="getTypeAmount(type)">
            {{ getTypeAmount(type) }}
          </div>
        </button>
      </div>
      <div class="journal-frame__controls">
        <input 
          class="text-input"
          type="text" 
          v-model.trim="factionSearch" 
          placeholder="Search"
        >
        <div class="controls">
          <button 
            class="add-quest" 
            :class="{'add-quest_active': showMasters}"
            @click="showMasters = !showMasters"
          >
            M
          </button>
        </div>
      </div>
    </div>
    <div class="header-content">
      <template v-if="!loading">
        <SidebarFactionsItem 
          v-for="faction in filteredFactions"
          :key="faction[0].id"
          :faction
          :modificator="props.modificator"
        />
      </template>
      <SVGSpinners90RingWithBg v-else class="loading-spinner" />
      <component
        :is="iconComponent" 
        class="journal-icon"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SidebarFactionsItem from '@/components/sidebar/SidebarFactionsItem.vue';
import { useCountTypes } from '@/stores/countTypes';
import { fetchByType } from '@/api/idb.js';
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';
import { useSelectedRecord } from '@/stores/selectedRecord';

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

const iconComponent = computed(() => {
  switch(props.modificator) {
    case 'scripts': return GameIconsGears;
    case 'factions': return GameIconsOrganigram;
    case 'actors': return GameIconsCharacter;
    case 'items': return GameIconsGauntlet;
    case 'magic': return FireSpellCast;
    case 'interact': return OpenChest;
    case 'world': return GameIconsMedievalVillage01;
    default: return GameIconsBookmarklet;
  }
})

const props = defineProps<{
  title: String;
  entryTypes: String[];
  modificator: String;
}>();

const factions = ref([]);
const filteredFactions = ref([]);

const loading = ref<Boolean>(false);

const selectedType = ref<String>('');

const showMasters = ref<Boolean>(false);

watch(() => props.entryTypes, () => {
  selectedType.value = props.entryTypes[0] || '';
}, {
  immediate: true,
});

watch(showMasters, fetchFactions, {
  immediate: true,
});

watch(selectedType, fetchFactions);

const selectedRecordStore = useSelectedRecord();
const getSelectedRecord = computed(() => selectedRecordStore.getSelectedRecord);
watch(getSelectedRecord, () => fetchFactions({loading: false}));

const countTypesStore = useCountTypes();

function getTypeAmount(type: string) {
  return countTypesStore.getTypesAmount?.[type] || 0;
}

interface FetchFactionsOptions {
  loading?: boolean;
}

async function fetchFactions(options: FetchFactionsOptions) {
  try {
    if (options.loading !== false) {
      loading.value = true;
    }
    const response = await fetchByType([selectedType.value], '', showMasters.value);
    let idKey = 'id';
    if (selectedType.value === 'Skill') {
      idKey = 'skill_id';
    } else if (selectedType.value === 'MagicEffect') {
      idKey = 'effect_id';
    } else if (selectedType.value === 'Cell') {
      idKey = 'name';
    } else if (selectedType.value === 'PathGrid') {
      idKey = 'TMP_index';
    }
    let uniqueIds = [];
    let uniqueFactions = [];
    if (selectedType.value === 'Landscape') {
      uniqueIds = [...new Set(response.map((val) => `${val.grid?.[0]}:${val.grid?.[1]}`))];
      uniqueFactions = uniqueIds.map(val => response.filter(faction => `${faction.grid?.[0]}:${faction.grid?.[1]}` === val));
    } else {
      uniqueIds = [...new Set(response.map((val) => val[idKey]))];
      uniqueFactions = uniqueIds.map(val => response.filter(faction => faction[idKey] === val));
    }
    factions.value = uniqueFactions;
    countTypesStore.updateCountTypes();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const factionSearch = ref<String>('');

function searchFactions() {
  if (factionSearch.value === '') {
    filteredFactions.value = factions.value;
  } else {
    filteredFactions.value = factions.value
      .filter((val) => val[0].name?.toLowerCase().includes(factionSearch.value.toLowerCase()) 
        || val[0].id?.toLowerCase().includes(factionSearch.value.toLowerCase()))
  }
}

watch(factionSearch, searchFactions, { immediate: true });

watch(factions, searchFactions)
</script>

<style lang="scss" scoped>
@mixin dot-bg-big($bg-color, $dot-color) {
  background-image: radial-gradient($dot-color 2px, transparent 2px), radial-gradient($dot-color 2px, transparent 2px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  background-color: $bg-color;
}

.header-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  gap: 5px;
  &__row {
    display: flex;
    flex-direction: row;
    gap: 15px;
  }
}

.header-buttons {
  display: flex;
  margin-top: 10px;
  gap: 15px;
  &__button {
    font-size: 20px;
  }
}

.header-dependencies {
  width: 100%;
  display: flex;
  flex-direction: column;
  &__item {
    border-top: 1px solid rgba(0, 0, 0, 0.25);
    color: rgba(0, 0, 0, 0.8);
    font-size: 18px;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    &:last-child {
      border-bottom: 1px solid rgba(0, 0, 0, 0.25);
    }
    .grab {
      cursor: grab;
    }
  }
}

.frame-title {
  width: 100%;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  color: rgb(202, 165, 96);
  background: rgb(48, 48, 48);
}
.journal-frame {
  background-color: #986;
  //box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  z-index: 2;
  //padding: 10px;
  min-width: 500px;
  max-width: 500px;
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  font-family: 'Pelagiad';
  position: relative;
  &__header {
    background-color: rgb(71, 71, 71);
    box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
    z-index: 2;
  }
  &__controls {
    font-size: 22px;
    padding: 10px;

    //display: flex;
    width: 100%;
    //top: 10px;
  }
}
.add-quest {
  cursor: pointer;
  background: rgba(0, 0, 0, 0.65);
  color: rgb(202, 165, 96);
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 3px 10px;
  border-radius: 4px;
  transition: all 0.1s ease-in;
  &:hover {
    color: white;
    .add-quest__button {
      fill: white;
    }
  }
  &__button {
    transition: all 0.1s ease-in;
    fill: rgb(202, 165, 96);
  }
}

.fadeHeight-enter-active,
.fadeHeight-leave-active {
  transition: all 0.15s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fadeHeight-enter,
.fadeHeight-leave-to {
  opacity: 0%;
}

.journal-frame {
  &_factions {
    @include dot-bg-big(rgb(59, 45, 59), rgba(255, 255, 255, 0.02));
  }
  &_actors {
    @include dot-bg-big(rgb(45, 59, 45), rgba(255, 255, 255, 0.02));
  }
  &_items {
    @include dot-bg-big(rgb(45, 59, 58), rgba(255, 255, 255, 0.02));
  }
  &_scripts {
    @include dot-bg-big(rgb(59, 48, 45), rgba(255, 255, 255, 0.02));
  }
  &_magic {
    @include dot-bg-big(rgb(57, 68, 80), rgba(255, 255, 255, 0.02));
  }
  &_interact {
    @include dot-bg-big(rgb(91, 62, 28), rgba(255, 255, 255, 0.02));
  }
  &_world {
    @include dot-bg-big(rgb(55, 85, 76), rgba(255, 255, 255, 0.02));
  }
}

.sidebar {
  position: relative;
  overflow-x: hidden;
}

.journal-icon {
  width: 600px;
  height: 600px;
  position: absolute;
  top: 200px;
  right: 0;
  z-index: -10;
  color: rgba(0, 0, 0, 0.1);
}

.types {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  height: auto;
  padding: 10px;
  justify-content: left;
  &__item {
    font-size: 20px;
    padding: 2px 5px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    transition: all .1s ease-in;
    display: flex;
    align-items: center;
    gap: 5px;
    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
    &_selected {
      background-color: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }
  &__amount {
    background-color: rgba(140, 219, 157, 0.9);
    border-radius: 10px;
    color: black;
    font-size: 15px;
    font-family: 'Pelagiad';
    display: flex;
    align-items: center;
    justify-content: center;;
    padding: 0px 5px;
  }
}

.loading-spinner {
  width: 100px;
  height: 100px;
  color: #986;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
