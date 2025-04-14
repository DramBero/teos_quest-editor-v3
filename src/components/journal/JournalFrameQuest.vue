<template>
  <div class="quest">
    <div class="quest-title" @click="toggleCollapse">
      {{ questData.name }}
    </div>
    <div class="quest-id" @click="toggleCollapse">
      {{ quest.id }}
    </div>
    <div v-if="questDataLoaded && questData.entries.length">
      <!-- collapse-transition -->
      <div v-show="isCollapsed">
        <div name="fadeHeight" mode="out-in" class="entries-list">
          <!-- transition-group -->
          <div class="entries-list__child" key="TMP_quest-start">
            <div class="entry-wrapper">
              <div
                class="quest-entry quest-entry_start"
                :class="{ 'quest-entry_highlighted': getIsHighlighted(0) }"
              >
                <div class="quest-entry__text">Before started</div>
              </div>
              <div class="edit-button">
                <!-- <icon name="pen" scale="1" class="icon_hidden"></icon> -->
              </div>
            </div>
          </div>
          <div
            v-for="entry in questData.entries
              .filter((val) => val.data)
              .sort((a, b) => parseInt(a.data.disposition) - parseInt(b.data.disposition))"
            :key="entry.info_id"
            :id="quest.id + entry.data.disposition"
            class="entries-list__child"
          >
            <div v-if="entryEdit != entry.data.disposition" class="entry-wrapper">
              <div
                class="quest-entry"
                :class="{
                  'quest-entry_finished': entry.quest_state === 'Finished',
                  'quest-entry_highlighted': getIsHighlighted(entry.data.disposition),
                }"
                draggable
                @dragstart="startDrag($event, entry)"
              >
                <div class="quest-entry__text">{{ entry.text }}</div>
                <div class="quest-entry__index">
                  {{ entry.data.disposition }}
                </div>
              </div>
              <button class="edit-button">
<!--                 <icon
                  name="pen"
                  scale="1"
                  class="edit-entry-controls__icon"
                  @click="entryEdit = entry.data.disposition"
                ></icon> -->
              </button>
            </div>
            <div v-else>
              <form class="edit" @submit.prevent="editEntry($event, entry.info_id)">
                <div class="edit-entry">
                  <div class="edit-entry-above">
                    <textarea
                      v-text="entry.text"
                      name="entryText"
                      class="edit-entry-above__text"
                      :spellCheck="true"
                      lang="en"
                    ></textarea>
                    <input
                      :placeholder="parseInt(entry.data.disposition)"
                      name="entryDisp"
                      type="number"
                      :value="parseInt(entry.data.disposition)"
                      class="edit-entry-above__disp"
                    />
                  </div>
                  <label class="edit-entry__checkbox"
                    ><span>Finished: </span
                    ><input
                      type="checkbox"
                      title="Finished"
                      name="entryFinished"
                      :checked="entry.quest_state === 'Finished'"
                  /></label>
                </div>
                <div class="edit-entry-controls">
<!--                   <button type="submit">
                    <icon name="save" class="edit-entry-controls__icon" scale="1"></icon>
                  </button>
                  <button @click.prevent="entryEdit = ''">
                    <icon name="ban" class="edit-entry-controls__icon" scale="1"></icon>
                  </button>
                  <button @click.prevent="deleteEntry(entry.info_id)">
                    <icon name="trash" class="edit-entry-controls__icon" scale="1"></icon>
                  </button> -->
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="add-entry" @click="createEntry">+</div>
      </div>
    </div>
    <div v-else-if="questDataLoaded" class="no-entries">
      No entries yet. <a class="link" @click="createEntry">Create?</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchQuestByID } from '@/api/idb.js'; 
import type { FilterComparison } from '@/types/pluginEntries.ts';
import { useJournalHighlight } from '@/stores/journalHighlights';

const props = defineProps({
  quest: Object,
})

const isCollapsed = ref<boolean>(false);
const highlightedComparison = ref<FilterComparison | ''>('');
const highlightedId = ref<number | string>('');
const entryEdit = ref('');

const questDataLoaded = ref<boolean>(false);
const questData = ref({
  entries: []
})
async function loadQuestData() {
  try {
    const questResponse = await fetchQuestByID(props.quest.id);
    questData.value = questResponse;
    questDataLoaded.value = true;
  } catch(error) {
    console.error(error);
  }
}

loadQuestData();

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
  else if (newValue.id === props.quest?.id) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    isCollapsed.value = true;
    highlightedComparison.value = newValue.comparison;
    highlightedId.value = parseInt(newValue.value.data);
  } else {
    isCollapsed.value = false;
    highlightedComparison.value = '';
    highlightedId.value = '';
  }
});

function deleteEntry(info_id) {
  entryEdit.value = '';
  // this.$store.commit('deleteJournalEntry', info_id);
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function getIsHighlighted(entryId) {
  let intEntryId = parseInt(entryId);
  let intHighlightedId = parseInt(highlightedId.value);
  switch (highlightedComparison.value) {
    case 'Equal':
      return intEntryId == intHighlightedId;
    case 'GreaterEqual':
      return intEntryId >= intHighlightedId;
    case 'LesserEqual':
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

function createEntry() {
  isCollapsed.value = true;
/*   this.$store.commit('addJournalEntry', [
    this.quest.id,
    'New entry',
    this.getLatestDisposition,
  ]); */
}

function startDrag(event, entry) {
  event.dataTransfer.setData('type', 'Journal');
  event.dataTransfer.setData('topic', entry.TMP_topic);
  event.dataTransfer.setData('disposition', entry.data.disposition);
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
  outline: inherit;
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
    &:last-child {
      .quest-entry {
        border-radius: 0 0 8px 8px;
      }
    }
  }
}

.quest {
  font-family: 'Pelagiad', 'Sans serif';
  width: 100%;
  border-radius: 8px;
  line-height: 23px;
  font-size: 20px;
  padding: 15px;
  margin: 5px;
  background-color: rgba(255, 255, 255, 0.3);
  // border-top: 6px solid red;
  &-title {
    color: rgb(150, 50, 30);
    cursor: pointer;
    width: 100%;
    font-size: 23px;
    text-align: left;
    user-select: none;
    padding: 5px 0 8px 0;
    transition: all 0.1s ease-out;
    &:hover {
      color: rgb(180, 80, 60);
    }
  }
  &-id {
    color: black;
    cursor: pointer;
    font-size: 16px;
  }
  &-entry {
    background-color: rgba(255, 255, 255, 0.5);
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
