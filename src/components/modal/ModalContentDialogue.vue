<template>
  <div class="dialogue">
    <div class="dialogue-answers">
      <div class="dialogue-answers__header" v-if="currentTopic">
        <div class="dialogue-answers__add" v-if="editMode" @click="addEntry">Add entry</div>
        <transition name="fadeHeight" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <span v-show="currentTopic.trim().length">{{ currentTopic }}</span>
        </transition>
        <div class="dialogue-answers__edit">
          <button @click="openClassicView">
            <TdesignList />
          </button>
          <!-- <icon name="list" color="#E1FF00" class="icon_gold" scale="1" @click="openClassicView"></icon> -->
        </div>
      </div>
      <div class="dialogue__filtrations" v-if="Object.keys(appliedFiltration).length">
        <button 
          v-if="appliedFiltration.choice"
          type="button"
          class="dialogue__filtration"
          @click="deleteFilter('choice')"
        >
          <div class="filtration__key">
            Choice:
          </div>
          <div class="filtration__value">
            {{ appliedFiltration.choice }}
          </div>
          <div class="filtration__cancel">
            <TdesignClose />
          </div>
        </button>
      </div>
      <div v-if="dialogueInfoLoading" class="dialogue-answers__loading">
        <SVGSpinners90RingWithBg :scale="10"/>
      </div>
      <div v-else>
        <transition-group name="fadeHeight" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <DialogueEntry 
            v-for="answer in currentFilteredAnswers" 
            :key="answer.id"
            :answer
            :editMode
            :speaker="props.speaker"
            :topicChoices
            :topicsList
            @setCurrentAnswers="setCurrentAnswers"
            @applyFilter="applyFilter"
          />
          <div class="dialogue-answers-answer__above dialogue-answers-answer__above_no-margin" v-if="!editMode"
            :key="'separator'"></div>
          <div class="dialogue-answers-answer__above-add" v-if="editMode" :key="'add-lowest'">
            <button class="entry-control-button" @click.prevent="addEntry([getLastEntryId, ''])">
              <!-- <icon name="plus" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
            </button>
            <button class="entry-control-button" v-if="Object.keys(getClipboardDialogue).length"
              @click.prevent="pasteDialogueFromClipboard([getLastEntryId, ''])">
              <!-- <icon name="clipboard" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
            </button>
          </div>
        </transition-group>
      </div>
      <div class="dialogue-answers__info dialogue-answers__info_error" v-if="getOrderedEntries.error_text">
        {{ getOrderedEntries.error_text }}
      </div>
      <div class="dialogue-answers__info" v-if="infoMessage">
        {{ infoMessage }}
      </div>
    </div>
    <div class="dialogue-questions">
      <div class="dialogue-questions__container" v-if="greetingsList.length">
        <div class="dialogue-questions__topic" v-for="(question, index) in greetingsList" :key="index"
          @click="setCurrentAnswers(question, 'Greeting')">
          {{ question }}
        </div>
      </div>
      <div class="dialogue-questions__container" v-if="persuasionsList.length">
        <div class="dialogue-questions__topic" v-for="(question, index) in persuasionsLists" :key="index"
          @click="setCurrentAnswers(question, 'Persuasion')">
          {{ question }}
        </div>
      </div>
      <div class="dialogue-questions__topic" v-for="(question, index) in topicsList" :key="index"
        @click="setCurrentAnswers(question, 'Topic')">
        {{ question }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import DialogueEntry from '@/components/dialogue/DialogueEntry.vue';
import { fetchTopicListByNPC, getOrderedEntriesByTopic } from '@/api/idb.js';
import { computed, reactive, ref, toRefs, watch } from 'vue';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';
import { useClassicView, useClassicViewTopic } from '@/stores/classicView';
import TdesignClose from '~icons/tdesign/close';
import TdesignList from '~icons/tdesign/list';

const props = defineProps({
  speaker: {
    type: Object,
    required: false,
    default: () => ({}),
  },
})
const { speaker } = toRefs(props);

const currentTopic = ref<string>('');
const editMode = ref<boolean>(false);
const showDependencies = ref<boolean>(true);
const editedEntry = ref<string>('');
const topicType = ref<string>('');
const infoMessage = ref<string>('');
const greetingsList = ref([]);
const persuasionsList = ref([]);
const topicsList = ref([]);
const orderedEntries = ref([]);

interface DialogueFiltration {
  key: string;
  value: string | number;
}
const appliedFiltration = reactive<Object>({});
function applyFilter(filter: DialogueFiltration) {
  appliedFiltration[filter.key] = filter.value;
}
function deleteFilter(key: string) {
  delete appliedFiltration[key];
}

watch(speaker, async (newValue) => {
  if (!newValue.speakerId) {
    topicsList.value = [];
    persuasionsList.value = [];
    greetingsList.value = [];
  } else {
    const topicsResponse = await fetchTopicListByNPC(speaker.value.speakerId, speaker.value.speakerType);
    topicsList.value = topicsResponse.topics;
    persuasionsList.value = topicsResponse.persuasions;
    greetingsList.value = topicsResponse.greetings;
    console.log(topicsResponse)
  }
})

const getOrderedEntries = computed(() => {
  return [];
//      return this.$store.getters['getOrderedEntriesByTopic']([this.currentTopic, 'Topic']);
});

const currentAnswers = computed(() => {
  let answers;
  if (speaker.value !== 'Global Dialogue') {
    answers = orderedEntries.value
      .filter((val) => val.TMP_topic === currentTopic.value)
      .filter((topic) =>
        [
          topic['speaker_id'],
          topic['speaker_cell'],
          topic['speaker_faction'],
          topic['speaker_class'],
          topic['speaker_race'],
        ].includes(speaker.value.speakerId),
      );
  } else {
    answers = orderedEntries.value
      .filter((val) => val.TMP_topic === currentTopic.value)
      .filter(
        (topic) =>
          !topic['speaker_id'] &&
          !topic['speaker_cell'] &&
          !topic['speaker_faction'] &&
          !topic['speaker_class'] &&
          !topic['speaker_race'],
      );
  }
  return answers;
});

const currentFilteredAnswers = computed(() => {
  let answers = [...currentAnswers.value];
  if (appliedFiltration.choice) {
    const filteredAnswers = answers
      .filter(
        val => val.filters
          .find(
            filter => 
              filter.function === 'Choice' && 
              filter.value.data === appliedFiltration.choice
          )
      );
    answers = filteredAnswers;
  }
  return answers;
})

const getClipboardDialogue = computed(() => {
  return {};
  // return this.$store.getters['getClipboardDialogue'];
});

const getLastEntryId = computed(() => {
  return '';
  // return this.currentAnswers.at(-1).id;
});

function transformChoiceStringToObjects(input: string, entryId: string) {
    const regex = /"(.*?)"\s*(\d+)/g;
    const results = [];
    let match;

    while ((match = regex.exec(input)) !== null) {
        results.push({
            text: match[1],
            id: parseInt(match[2], 10),
            entryId,
        });
    }

    return results;
}

const topicChoices = computed(() => {
  const choices = [];
  for (const answer of currentAnswers.value) {
    if (answer.script_text?.includes('Choice ')) {
      const regex = /Choice\s+(.*?)(?:\\n|$)/g;
      let match;

      const scriptStrings = answer.script_text.split('\r\n');

      for (const scriptString of scriptStrings) {
        while ((match = regex.exec(scriptString)) !== null) {
          if (answer.id == '206641278520424260') {
            console.log('MATCH STRING', scriptString)
            console.log('MATCH:', match)
          }

          choices.push(...transformChoiceStringToObjects(match[1].trim(), answer.id))
        } 
      }
    }
  }
  return choices;
});

async function setClipboard(entry) {
/*   this.$store.commit('setClipboardDialogue', [entry, this.speaker.speakerId]);
  this.infoMessage = `Entry "${entry.text.slice(0, 20)}${entry.text.length > 20 ? '...' : ''
    }" by speaker "${entry.speaker_id}" copied to clipboard.`;
  navigator.clipboard.writeText(entry.text);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  this.infoMessage = ''; */
}
function addEntry(location) {
/*   if (!this.currentTopic) return;
  if (!location)
    location = this.$store.getters['getBestOrderLocationForNpc']([
      this.speaker.speakerId,
      this.currentTopic,
      this.topicType,
      this.getSpeakerType,
    ]);
  console.log(location);
  if (location[0]) {
    this.$store.commit('addDialogue', [
      this.getSpeakerType,
      this.speaker.speaker_id,
      this.currentTopic,
      this.topicType,
      location[0],
      'next',
      'New entry',
    ]);
  } else if (!location[0] && location[1]) {
    this.$store.commit('addDialogue', [
      this.getSpeakerType,
      this.speaker.speaker_id,
      this.currentTopic,
      this.topicType,
      location[1],
      'prev',
      'New entry',
    ]);
  } */
}
function editDialogue() {
/*   this.$store.commit('editDialogueEntry', [
    this.editedEntry,
    event.target.elements.entryText.value,
  ]);
  this.editedEntry = ''; */
}
async function setCurrentAnswers(selectedTopic: string, selectedTopicType: string) {
  topicType.value = 'Topic';
  currentTopic.value = ' ';
  await new Promise((resolve) => setTimeout(resolve, 160));
  topicType.value = selectedTopicType;
  currentTopic.value = selectedTopic;
}
function deleteEntry(id) {
  // this.$store.commit('deleteDialogueEntry', id);
}
function getSpeakerData(topicType) {
  return [];
  // return this.$store.getters['getDialogueBySpeaker']([this.speaker.speaker_id, topicType]);
}

function pasteDialogueFromClipboard(location) {
/*   let entry = { ...this.getClipboardDialogue, speaker_id: this.speaker.speaker_id };
  this.$store.commit('pasteDialogue', [
    entry,
    this.currentTopic,
    this.topicType,
    location[0],
    'next',
  ]); */
}

const classicViewStore = useClassicView();
const classicViewTopicStore = useClassicViewTopic();
function openClassicView() {
  classicViewTopicStore.setClassicViewTopic(currentTopic.value);
  classicViewStore.setClassicView(true);
}

watch(getSpeakerData, (() => {
/*   this.setCurrentAnswers('', '');
  this.currentTopic = '';
  this.dialogue = await this.$store.dispatch('fetchTopicListByNPC', [
    this.speaker.speakerId,
    this.speaker.speakerType,
  ]); */
}))

async function fetchTopic(topic, loading=false) {
  if (topic.trim()) {
    if (loading) {
      dialogueInfoLoading.value = true;
    }
    try {
      const orderedEntriesResponse = await getOrderedEntriesByTopic(topic);
      orderedEntries.value = orderedEntriesResponse;
    } catch (error) {
      console.error(error);
    } finally {
      if (loading) {
        dialogueInfoLoading.value = false;
      }
    }
  } else {
    orderedEntries.value = [];
  }
}

const dialogueInfoLoading = ref<boolean>(false);
watch(currentTopic, (async (newValue) => {
  fetchTopic(newValue, true);
}))
</script>



<style lang="scss">
.dialogue {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 2px;

  &__filtrations {
    width: 100%;
    position: sticky;
    top: 40px;
    z-index: 5;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    // justify-content: center;
    align-items: center;
    min-height: 45px;
    // margin-bottom: 2px;
    padding: 3px 10px;
  }

  &__filtration {
    display: flex;
    gap: 5px;
    align-items: center;
    border-radius: 4px;
    padding: 5px 10px;
    border: solid 2px rgb(202, 165, 96, 0.4);
    background-color: rgb(202, 165, 96, 0.4);
    color: white;
    position: relative;
    margin-right: 30px;
    &:hover {
      .filtration__cancel {
        color: rgb(202, 96, 96);
      }
    }
    .filtration {
      &__key {

      }
      &__value {
        color: black;
        background-color: rgba(202, 165, 96, 0.8);
        font-family: 'Consolas';
        font-size: 14px;
        padding: 3px;
        border-radius: 5px;
        min-width: 20px;
        text-align: center;
      }
      &__cancel {
        display: flex;
        align-items: center;
        transition: color ease-in 0.15s;
        color: white;
        position: absolute;
        right: -30px;
      }
    }
  }

  &-answers {
    //padding: 0 5px 5px 5px;
    flex-grow: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
    overflow-y: scroll;

    &__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      svg {
        width: 30px;
        height: 30px;
      }
    }

    &__info {
      background: rgba(43, 117, 36, 0.8);
      position: sticky;
      bottom: 0;
      width: 100%;

      &_error {
        background: rgba(110, 32, 32, 0.8);
      }
    }

    &__add {
      position: absolute;
      cursor: pointer;
      left: 5px;
      transition: color 0.15s ease-in;

      &:hover {
        color: rgba(233, 214, 180, 1);
      }
    }

    &__edit {
      position: absolute;
      display: flex;
      align-items: center;
      right: 5px;
    }

    &__header {
      width: 100%;
      position: sticky;
      top: 0;
      z-index: 5;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      border-bottom: 2px solid rgb(202, 165, 96);
      height: 40px;
      min-height: 40px;
      margin-bottom: 2px;
    }

    &__frame {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      //gap: 20px;
      max-width: 100%;
      overflow-y: scroll;
      overflow-x: hidden;
      padding: 5px;
      scroll-behavior: smooth;
      /*       ::-webkit-scrollbar {
        width: 5px;
        scrollbar-width: thin;
        background: rgba(25, 56, 31, 0.02);
        border-radius: 24px;
        &-thumb {
          background-color: rgba(25, 56, 31, 0.4);
        }
      } */
    }

    &-answer {
      flex-grow: 1;
      max-width: 100%;

      &__above {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
        min-height: 1px;
        font-size: 25px;

        transition: all 0.2s ease-out;

        background: rgba(202, 165, 96, 0.4);
        background: linear-gradient(90deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(134, 134, 134, 0.4) 20%,
            rgba(134, 134, 134, 0.4) 80%,
            rgba(0, 0, 0, 0) 100%);

        &:hover {
          .dialogue-answers-answer__above-add {
            height: fit-content;
          }
        }

        &-add {
          cursor: pointer;
          background: rgba(202, 165, 96, 0.2);
          border-radius: 4px;
          user-select: none;
          color: black;
          font-size: 30px;
          width: 100%;
          display: flex;
          justify-content: center;
          transition: all 0.15s ease-out;

          &:hover {
            color: rgb(202, 165, 96);
          }
        }

        &_no-margin {
          margin: 0;
        }
      }

      &-modified {
        color: rgb(126, 126, 179);

        &_dirty {
          color: rgb(206, 206, 206);
        }
      }

      &-wrapper {
        display: flex;
        align-items: center;
        gap: 5px;
        padding-bottom: 20px;
      }

      &_edit {
        border-radius: 8px;
        padding: 10px;
        /*         &:hover {
          background: rgba(202, 165, 96, 0.08);
        } */
      }

      &__text {
        border-left: 2px dotted rgb(202, 165, 96);
        padding-left: 10px;
        margin-left: 20px;

        &_hyperlink {
          cursor: pointer;
          color: rgb(112, 126, 207);

          &:hover {
            color: rgb(159, 169, 223);
          }
        }
      }

      &__ids {
        display: flex;
        width: 100%;
        justify-content: space-between;
        font-size: 15px;
      }
    }
  }

  &-entry-textarea {
    width: 100%;
    font-family: 'Pelagiad';
    background: rgba(202, 165, 96, 0.1);
    min-height: 200px;
    padding: 10px;
    color: rgb(202, 165, 96);
    font-size: 20px;
    border: none;
    border-radius: 8px 8px 8px 8px;
    resize: none;

    &:focus {
      outline: none !important;
    }
  }

  &-entry {
    &__choices {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 50px;
      padding: 10px 10px 10px 30px;
    }
    &__choice {
      display: flex;
      gap: 10px;
      align-items: center;
      .choice {
        &__text {
          color: rgb(165, 96, 96);
          font-size: 18px;
          cursor: pointer;
          &:hover {
            color: rgb(202, 96, 96);
          }
        }
        &__id {
          color: black;
          background-color: rgba(202, 165, 96, 0.8);
          font-family: 'Consolas';
          font-size: 14px;
          padding: 3px;
          border-radius: 5px;
          min-width: 20px;
          text-align: center;
        }
      }
    }
  }

  &-questions {
    min-width: 30%;
    max-width: 300px;
    border-left: 2px solid rgb(202, 165, 96);
    overflow-y: scroll;

    &__topic {
      padding: 10px 10px 0px 10px;
      cursor: pointer;
      color: rgb(112, 126, 207);

      &:hover {
        color: rgb(159, 169, 223);
      }
    }

    &__container {
      padding: 10px 0;
      border-bottom: 2px solid rgb(202, 165, 96);
    }
  }
}

.entry-control-button {
  padding: 0px 15px;

  &__icon {
    fill: rgba(202, 165, 96, 0.3);
    transition: fill 0.15s ease-in-out;
  }

  &:hover {
    .entry-control-button__icon {
      fill: rgb(202, 165, 96);
    }
  }
}

.highlight-even {
  background: rgb(0, 0, 0);
  background: linear-gradient(90deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(92, 85, 44, 0.2) 20%,
      rgba(92, 85, 44, 0.2) 80%,
      rgba(0, 0, 0, 0) 100%);

  &:nth-child(even) {
    background: rgb(0, 0, 0);
    background: linear-gradient(90deg,
        rgba(0, 0, 0, 0) 0%,
        rgba(92, 85, 44, 0.12) 20%,
        rgba(92, 85, 44, 0.12) 80%,
        rgba(0, 0, 0, 0) 100%);
  }
}

.entry-edit-controls {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
}

.icon_gold {
  fill: rgb(202, 165, 96);
  margin-left: 10px;
  min-width: 20px;
  transition: fill 0.2s ease-in;
  cursor: pointer;

  &:hover {
    fill: rgba(233, 214, 180, 1);
  }
}

.icon_gray {
  fill: rgba(255, 255, 255, 0.7);
  margin-left: 10px;
  transition: fill 0.2s ease-in;
  cursor: pointer;

  &:hover {
    fill: rgba(255, 255, 255, 0.5);
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
</style>
