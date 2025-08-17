<template>
  <div class="journal-frame">
    <div class="journal-frame__header">
      <div class="frame-title">Journal</div>
      <div class="journal-frame__controls" v-if="!selectedQuestName">
        <input 
          class="text-input"
          type="text" 
          v-model.trim="questSearch" 
          placeholder="Find quest"
        >
        <div class="controls">
          <button 
            class="add-quest" 
            :class="{'add-quest_active': showMasters}"
            @click="toggleMasters"
          >
            M
          </button>
          <button class="add-quest" @click="addQuest()">
            <TdesignAdd />
            Add
          </button>
        </div>
      </div>
      <div v-else class="journal-frame__controls">
        <div class="controls">
          <button 
            class="add-quest" 
            :class="{'add-quest_active': showMasters}"
            @click="selectedQuestName = null"
          >
            Back
          </button>
        </div>
      </div>
    </div>
    <div v-if="questList.length && !selectedQuestName" v-bind="containerProps">
      <div v-bind="wrapperProps" class="quests">
        <JournalFrameQuest 
          v-for="questNameData in getQuestNameList"
          :key="questNameData.data.name || 0 + `index${questNameData.index}`"
          :questNameData="questNameData.data"
          @selected="handleQuestNameSelect"
        />
      </div>
    </div>
    <JournalFrameQuestExpanded 
      v-else-if="selectedQuestName"
      :questNameData="selectedQuestName"
      @update="fetchQuests"
    />
  </div>
</template>

<script setup lang="ts">
import { fetchAllQuestIDs } from '@/api/idb.js';
import { usePrimaryModal } from '@/stores/modals';
import { computed, onMounted, ref, watch } from 'vue';
import JournalFrameQuest from './JournalFrameQuest.vue';
import { useJournalHighlight } from '@/stores/journalHighlights';
import { useVirtualList, watchDebounced } from '@vueuse/core';
import JournalFrameQuestExpanded from './JournalFrameQuestExpanded.vue';
import TdesignAdd from '~icons/tdesign/add';

const primaryModalStore = usePrimaryModal();
function addQuest() {
  primaryModalStore.setActiveModal('NewQuest');
};

const questSearch = ref('');

const showMasters = ref(false);
function toggleMasters() {
  showMasters.value = !showMasters.value;
}

const getJournal = ref([]);

const questList = ref([]);

const selectedQuestName = ref(null);
function handleQuestNameSelect(newValue) {
  selectedQuestName.value = newValue;
}

async function handleSearch() {
  questList.value = [];
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (!questSearch.value || questSearch.value.length < 3) {
    questList.value = getJournal.value;
  } else {
    questList.value = getJournal.value
      .filter(val => val.TMP_quest_name?.toLowerCase()?.includes(questSearch.value.toLowerCase()));
  }
}

const questNames = computed(() => {
  let questNameList = questList.value.filter(val => val.TMP_quest_name).map(val => val.TMP_quest_name.toLowerCase());
  questNameList = [...new Set(questNameList)];
  let questNameListNew = [];
  for (let questName of questNameList) {
    const questNameFact = questList.value.find(quest => quest.TMP_quest_name.toLowerCase() === questName)?.TMP_quest_name;
    const quests = questList.value.filter((quest) => quest.TMP_quest_name.toLowerCase() === questName).reverse();
    questNameListNew.push({
      name: questNameFact,
      quests,
      is_new: Boolean(quests.filter((quest) => quest.TMP_is_active)?.length),
    })
  }
  return questNameListNew;
});

const { list, containerProps, wrapperProps } = useVirtualList(questNames, { itemHeight: 85 });

const getQuestNameList = computed(() => {
  if (showMasters.value) {
    return list.value;
  } else {
    return list.value.filter(val => val.data.is_new);
  }
})

watchDebounced(questSearch, () => {
  handleSearch();
}, {
  debounce: 200,
  immediate: true,
})

watch(getJournal, handleSearch);

async function fetchQuests() {
  const journalResponse = await fetchAllQuestIDs(true);
  if (journalResponse?.length) {
    getJournal.value = journalResponse;
  }
}

onMounted(async () => {
  fetchQuests();
})


const journalHighlightStore = useJournalHighlight();
const getHighlighted = computed(() => {
  return journalHighlightStore.getJournalHighlight;
})
const getHighlightedId = computed(() => {
  if (!getHighlighted.value) return '';
  const valueObj = getHighlighted.value.value;
  if (valueObj) return getHighlighted.value.id + valueObj.data;
  else return '';
})

watch(getHighlightedId, async (newValue) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (newValue) {
    const el = document.getElementById(newValue);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
})

/* import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  computed: {
    getJournal() {
      return this.$store.getters['getAllQuestIDs'];
    },
    getQuestNamesList() {
      let questNames = this.getJournal.map(
        (val) => `["${val.id.toLowerCase()}"]: "${val.name || 'skip'}",`,
      );
      return questNames;
    },
  },
  components: { Icon },
  methods: {
    addQuest() {
      this.$store.commit('setPrimaryModal', 'NewQuest');
    },
  },
}; */
</script>

<style lang="scss">
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
  background-color: rgb(163, 146, 112);
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
    display: flex;
    gap: 15px;
    justify-content: space-between;
    //display: flex;
    width: 100%;
    //top: 10px;
  }
}

.quests {
  display: flex;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  flex-grow: 1;
  padding: 10px 0px 10px 10px;
  gap: 5px;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.quest {
  font-family: 'Pelagiad', 'Sans serif';
  width: 100%;
  border-radius: 8px;
  line-height: 23px;
  font-size: 20px;
  padding: 0 15px 15px 15px;
  margin: 5px;
  position: relative;
  background-color: rgb(207, 191, 159);
  &_selected {
    //position: absolute;
    top: 0;
    height: 100%;
    overflow-y: scroll;
    z-index: 10;
    margin: 0;
    border-radius: 0;
    flex-grow: 1;
  }
  &-header {
    position: sticky;
    top: -15px;
    z-index: 1;
    padding-top: 15px;
    background-color: rgba(207, 191, 159, 0.9);
  }
  &_mod {
    background-color: rgb(187, 214, 219);
    .quest-header {
      background-color: rgba(187, 214, 219, 0.9);
    }
  }
  &_new {
    background-color: rgb(195, 217, 187);
    .quest-header {
      background-color: rgba(195, 217, 187, 0.9);
    }
  }
  &-title {
    color: rgb(150, 50, 30);
    cursor: pointer;
    width: 100%;
    font-size: 23px;
    text-align: left;
    user-select: none;
    padding: 5px 0 8px 0;
    transition: all 0.1s ease-out;
    display: flex;
    align-items: center;
    gap: 7px;
    &:hover {
      color: rgb(180, 80, 60);
    }
    &_expanded {
      &:hover {
        color: rgb(150, 50, 30);
        cursor: default;
      }
    }
  }
  &-content {
    overflow: hidden;
  }
  &-entries {
    background-color: rgb(240, 235, 214);
    width: 100%;
    z-index: 10;
    min-height: 100px;
    height: fit-content;
    border-radius: 8px;
  }
  &-status {
    font-size: 15px;
    line-height: 15px;
    background-color: rgb(202, 96, 96);
    color: white;
    padding: 5px;
    border-radius: 8px;
    height: fit-content;
    &_mod {
      background-color: rgb(126, 126, 179);
    }
    &_new {
      background-color: rgb(89, 170, 106);
    }
  }
  &-id {
    color: black;
    cursor: pointer;
    font-size: 16px;
  }
  &-entry {
    // background-color: rgba(255, 255, 255, 0.5);
    // border-radius: 8px;
    flex-grow: 1;
    // margin: 8px 0;
    min-height: 50px;
    overflow: hidden;
    display: flex;
    transition: all 0.2s ease-in;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 12px,
      transparent 12px,
      transparent 24px
    );
    border-bottom: 2px dashed rgba(0, 0, 0, 0.1);
    border-left: 5px solid transparent;
    &_new {
      border-left: 5px solid rgba(89, 170, 106, 0.7);
    }
    &_start {
      text-align: center;
      min-height: 10px;
      background-color: rgba(255, 255, 255, 0.3);
      .quest-entry__text {
        padding: 5px;
      }
    }
    &_finished {
      background-color: rgba(145, 215, 145, 0.5);
    }
    &_highlighted {
      background-image: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 12px,
        rgb(233, 203, 72) 12px,
        rgb(233, 203, 72) 24px
      );
    }
    &__add {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      width: 100%;
      background-color: rgba(0, 0, 0, 0.05);
      padding: 3px;
      align-items: center;
      justify-content: center;
      transition: background-color .1s ease-in;
      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
      &_bottom {
        top: 100%;
      }
      svg {
        color: rgb(49, 44, 28);
      }
    }
    &__text {
      flex-grow: 1;
      padding: 15px;
    }
    &__index {
      min-width: 50px;
      max-width: 50px;
      background-color: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
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
  &_active {
    background: rgb(202, 165, 96) !important;
    color: rgba(0, 0, 0, 0.65) !important;
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

.controls {
  display: flex;
  gap: 10px;
}
</style>
