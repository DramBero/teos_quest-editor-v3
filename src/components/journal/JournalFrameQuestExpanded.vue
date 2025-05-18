<template>
  <div 
    class="quest quest_selected" 
    :class="{
      'quest_new': props.questNameData?.is_new && !containsMasterIds,
      'quest_mod': props.questNameData?.is_new && containsMasterIds,
    }"
    ref="quest"
  >
    <div class="quest-header" @click="emit('clearSelected')">
      <div class="quest-title">
        <div v-if="props.questNameData?.is_new && containsMasterIds" class="quest-status quest-status_mod">
          Mod
        </div>
        <div v-else-if="props.questNameData?.is_new" class="quest-status quest-status_new">
          New
        </div>
        {{ props.questNameData.name }}
      </div>
    </div>
    <div 
      class="quest-content"
    >
      <JournalFrameQuestTabs 
        :quests="getQuestIds"
        v-model="selectedQuestId"
      />
      <div class="quest-entries">
        <div v-if="questDataLoaded && questData.entries.length">
          <div>
            <div name="fadeHeight" mode="out-in" class="entries-list">
              <div class="entries-list__child" key="TMP_quest-start">
                <div class="entry-wrapper">
                  <div
                    class="quest-entry quest-entry_start"
                    :class="{ 'quest-entry_highlighted': getIsHighlighted(0) }"
                  >
                    <div class="quest-entry__text">Before started</div>
                  </div>
                </div>
              </div>
              <JournalFrameQuestEntry 
                v-for="entry in questData.entries
                .filter((val) => val.data)
                .sort((a, b) => parseInt(a.data.disposition) - parseInt(b.data.disposition))" 
                :key="entry.info_id"
                :entry
                :questId="props.questNameData?.id"
                :highlightedId
                :highlightedComparison
              />
            </div>
            <!-- <div class="add-entry" @click="createEntry">+</div> -->
          </div>
        </div>

        <div v-else-if="questDataLoaded" class="no-entries">
          No entries yet. <a class="link" @click="createEntry">Create?</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { fetchQuestByID } from '@/api/idb.js'; 
import type { FilterComparison } from '@/types/pluginEntries.ts';
import { useJournalHighlight } from '@/stores/journalHighlights';
import JournalFrameQuestEntry from './JournalFrameQuestEntry.vue';
import JournalFrameQuestTabs from './JournalFrameQuestTabs.vue';

import { useElementVisibility } from '@vueuse/core'

const target = useTemplateRef<HTMLDivElement>('quest')
const targetIsVisible = useElementVisibility(target)

const props = defineProps({
  questNameData: Object,
});

const selectedQuestId = ref('');

onMounted(() => {
  if (props.questNameData.quests?.length) {
    selectedQuestId.value = props.questNameData.quests[0].id;
  }
})

watch(selectedQuestId, (newValue) => {
  if (newValue) {
    loadQuestData(newValue);
  }
})

const containsMasterIds = computed(() => {
  const isActiveList = props.questNameData.quests.map(val => val.TMP_is_active);
  return isActiveList.includes(false);
})

const getQuestIds = computed(() => {
  let questIds = props.questNameData.quests.map(val => val.id);
  questIds = [...new Set(questIds)];
  questIds = questIds.map((questId) => ({
    id: questId,
    TMP_is_active: Boolean(props.questNameData.quests.filter(val => val.id === questId && val.TMP_is_active).length),
  }))
  return questIds
})

const highlightedComparison = ref<FilterComparison | ''>('');
const highlightedId = ref<number | string>('');
const entryEdit = ref('');

const questDataLoaded = ref<boolean>(false);
const questData = ref({
  entries: []
})

const emit = defineEmits(['questLoaded', 'clearSelected']);

async function loadQuestData(questId: string) {
  try {
    questDataLoaded.value = false;
    const questResponse = await fetchQuestByID(questId);
    questData.value = {
      entries: [],
    }
    questData.value = questResponse;
    emit('questLoaded', {name: questData.value?.name, id: [questId]});
    questDataLoaded.value = true;
  } catch(error) {
    console.error(error);
  }
}

const journalHighlightStore = useJournalHighlight();
const getHighlight = computed(() => {
  return journalHighlightStore.getJournalHighlight;
})

const getLatestDisposition = computed(() => {
  if (!questData.value.entries.length || !questData.value.entries[0].data.disposition)
    return '10';
  return (
    Math.floor(
      Math.max(...questData.value.entries.map((val) => parseInt(val.data.disposition))) / 10 + 1,
    ) * 10
  ).toString();
})

function editEntry(event, info_id) {
  //editJournalEntry(state, [entryId, entryText, entryDisp, entryFinished])
/*   this.$store.commit('editJournalEntry', [
        info_id,
        event.target.elements.entryText.value,
        event.target.elements.entryDisp.value,
        event.target.elements.entryFinished.checked,
      ]);
      this.entryEdit = ''; */
}

watch(getHighlight, async (newValue) => {
  if (!newValue?.id) {
    highlightedId.value = '';
    highlightedComparison.value = '';
  }
  else if (newValue.id === props.questNameData?.id) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    highlightedComparison.value = newValue.comparison;
    highlightedId.value = parseInt(newValue.value.data);
  } else {
    highlightedComparison.value = '';
    highlightedId.value = '';
  }
});

function deleteEntry(info_id) {
  entryEdit.value = '';
  // this.$store.commit('deleteJournalEntry', info_id);
}

function getIsHighlighted(entryId) {
  let intEntryId = parseInt(entryId);
  let intHighlightedId = parseInt(highlightedId.value);
  switch (highlightedComparison.value) {
    case 'Equal':
      return intEntryId == intHighlightedId;
    case 'GreaterEqual':
      return intEntryId >= intHighlightedId;
    case 'LessEqual':
      return intEntryId <= intHighlightedId;
    case 'Less':
      return intEntryId < intHighlightedId;
    case 'Greater':
      return intEntryId > intHighlightedId;
    case 'NotEqual':
      return intEntryId != intHighlightedId;
    default:
      return false;
  }
}
</script>

<style lang="scss">
button,
input[type='submit'],
input[type='reset'] {
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  //outline: inherit;
}

.entry-wrapper {
  display: flex;
  gap: 10px;
}

.edit {
  display: flex;
  gap: 10px;
  width: 100%;
  &-entry {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    &-controls {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      &__icon {
        fill: rgba(77, 58, 23, 0.4);
        transition: fill 0.2s ease-in;
        &:hover {
          fill: rgba(77, 58, 23, 1);
        }
      }
    }
    &-above {
      display: flex;
      width: 100%;

      &__text {
        flex-grow: 1;
        font-family: 'Pelagiad';
        min-height: 200px;
        padding: 10px;
        font-size: 20px;
        border: none;
        border-radius: 8px 0 0 8px;
        resize: none;
        &:focus {
          outline: none !important;
        }
      }
      &__disp {
        width: 70px;
        padding: 10px;
        font-family: 'Pelagiad';
        font-size: 20px;
        border-radius: 0 8px 8px 0;
        background: rgb(233, 233, 231);
        border: none;
        text-align: center;

        min-width: 50px;
        max-width: 50px;
        display: flex;
        align-items: center;
        &:focus {
          outline: none !important;
        }
      }
    }
  }
}

.entries-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
  &__child {
    &:first-child {
      .quest-entry {
        border-radius: 8px 8px 0 0;
      }
    }
  }
}

.add-entry {
  font-size: 40px;
  width: 100%;
  text-align: center;
  cursor: pointer;
  padding: 15px;
  color: rgba(44, 41, 34, 0.4);
  transition: color 0.2s ease-in;
  &:hover {
    color: rgb(235, 219, 129);
  }
}

.link {
  cursor: pointer;
  color: rgb(75, 86, 150);
  &:hover {
    color: rgb(112, 126, 207);
  }
}

.icon_hidden {
  fill: transparent;
}

.no-entries {
  text-align: center;
  width: 100%;
  padding: 20px;
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
</style>
