<template>
  <div class="dialogue">
    <div class="dialogue-answers">
      <div class="dialogue-answers__header" v-if="currentTopic.trim().length">
        <div></div>
        <transition name="fade" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <span v-if="currentTopic.trim().length">{{ currentTopic }}</span>
        </transition>
        <div class="dialogue-answers__edit">
          <button @click="openClassicView">
            <TdesignList />
          </button>
        </div>
      </div>
      <form
        v-else-if="newTopicMode"
        class="dialogue-answers__header"
        @reset.prevent="newTopicModeOff"
        @submit.prevent="addNewTopic"
      >
        <div></div>
        <transition name="fade" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <template v-if="!currentTopic.trim().length && newTopicMode">
            <input 
              type="text"
              ref="topicName"
              placeholder="New topic"
              name="topicName"
              class="text-input"
              v-model="newTopicName"
              autocomplete="off"
            />
          </template>
        </transition>
        <div class="dialogue-answers__edit">
          <button type="submit">
            <TdesignCheck />
          </button>
          <button type="reset">
            <TdesignClose />
          </button>
        </div>
      </form>
      <div v-else class="dialogue-answers__header">

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
        <transition-group name="fade" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <DialogueEntry 
            v-for="answer in currentFilteredAnswers" 
            :key="answer.id"
            :answer
            :editMode
            :speaker="props.speaker"
            :topicChoices
            :topicsList
            :orderedEntries
            @setCurrentAnswers="setCurrentAnswers"
            @applyFilter="applyFilter"
            @updateAll="handleUpdateAll"
          />
          <div class="dialogue-answers-answer__above dialogue-answers-answer__above_no-margin"
            :key="'separator'">
          </div>
        </transition-group>
      </div>
      <div class="dialogue-answers__info dialogue-answers__info_error" v-if="false">
        {{ 'error_text' }}
      </div>
      <div class="dialogue-answers__info" v-if="infoMessage">
        {{ infoMessage }}
      </div>
    </div>
    <div class="dialogue-questions">
      <button
        type="button"
        class="dialogue-questions__add"
        @click="handleAddTopic"
      >
        <TdesignAdd />
      </button>
      <div class="dialogue-questions__container" v-if="greetingsList?.length">
        <button 
          v-for="(question, index) in greetingsList" 
          :key="index"
          class="dialogue-questions__topic" 
          :class="{
            'dialogue-questions__topic_new': question[0].TMP_is_active,
            'dialogue-questions__topic_mod': question.length > 1 && question[0].TMP_is_active,
            'dialogue-questions__topic_selected': question[0].TMP_topic === currentTopic,
          }"
          @click="setCurrentAnswers(question[0].TMP_topic, 'Greeting')"
        >
          {{ question[0].TMP_topic }}
        </button>
      </div>
      <div class="dialogue-questions__container" v-if="persuasionsList?.length">
        <button 
          v-for="(question, index) in persuasionsList" 
          :key="index"
          class="dialogue-questions__topic" 
          :class="{
            'dialogue-questions__topic_new': question[0].TMP_is_active,
            'dialogue-questions__topic_mod': question.length > 1 && question[0].TMP_is_active,
            'dialogue-questions__topic_selected': question[0].TMP_topic === currentTopic,
          }"
          @click="setCurrentAnswers(question[0].TMP_topic, 'Persuasion')"
        >
          {{ question[0].TMP_topic }}
        </button>
      </div>
      <button 
        v-for="(question, index) in topicsList" 
        :key="index"
        class="dialogue-questions__topic" 
        :class="{
          'dialogue-questions__topic_new': question[0].TMP_is_active,
          'dialogue-questions__topic_mod': question.length > 1 && question[0].TMP_is_active,
          'dialogue-questions__topic_selected': question[0].TMP_topic === currentTopic,
        }"
        @click="setCurrentAnswers(question[0].TMP_topic, 'Topic')"
      >
        {{ question[0].TMP_topic }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import DialogueEntry from '@/components/dialogue/DialogueEntry.vue';
import { fetchTopicListByNPC, getOrderedEntriesByTopic, addDialogueEntry } from '@/api/idb.js';
import { computed, reactive, ref, toRefs, useTemplateRef, watch } from 'vue';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';
import { useClassicView, useClassicViewTopic } from '@/stores/classicView';
import TdesignClose from '~icons/tdesign/close';
import TdesignList from '~icons/tdesign/list';
import TdesignAdd from '~icons/tdesign/add';
import TdesignCheck from '~icons/tdesign/check';
import ContextMenu from '@imengyu/vue3-context-menu';

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

async function fetchTopics() {
  if (!speaker.value.speakerId) {
    topicsList.value = [];
    persuasionsList.value = [];
    greetingsList.value = [];
  } else {
    const topicsResponse = await fetchTopicListByNPC(speaker.value.speakerId, speaker.value.speakerType);
    topicsList.value = topicsResponse.topics;
    persuasionsList.value = topicsResponse.persuasions;
    greetingsList.value = topicsResponse.greetings;
  }
}

watch(speaker, fetchTopics);

async function addDialogue(
  topicName: string,
  topicType: string,
) {
  await addDialogueEntry(
    props.speaker.speakerId,
    topicName,
    topicType,
    props.speaker.speakerType,
  );
  setCurrentAnswers(topicName, topicType);
  fetchTopics();
}

const currentAnswers = computed(() => {
  let answers;
  if (speaker.value.speakerName !== 'Global Dialogue') {
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
    if (/choice:?\s+/i.test(answer.script_text)) {
      const regex = /choice:?\s+(.*?)(?:\\n|$)/gi;
      let match;

      const scriptStrings = answer.script_text.split('\r\n');

      for (const scriptString of scriptStrings) {
        while ((match = regex.exec(scriptString)) !== null) {
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

async function setCurrentAnswers(selectedTopic: string, selectedTopicType: string) {
  topicType.value = 'Topic';
  currentTopic.value = ' ';
  await new Promise((resolve) => setTimeout(resolve, 160));
  topicType.value = selectedTopicType;
  currentTopic.value = selectedTopic;
}

const newTopicMode = ref(false);
const newTopicName = ref('');

const topicNameRef = useTemplateRef('topicName')
function createNewTopic() {
  currentTopic.value = '';
  newTopicMode.value = true;
  if (topicNameRef.value) {
    topicNameRef.value.focus();
  }
}

function addNewTopic() {
  if (!newTopicName.value.trim()) {
    return;
  }
  addDialogue(newTopicName.value, 'Topic');
  newTopicModeOff();
}

function newTopicModeOff() {
  newTopicMode.value = false;
  newTopicName.value = '';
}

function handleAddTopic(e: MouseEvent) {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      {
        label: "Topic",
        onClick: createNewTopic,
      },
      {
        label: "Greeting",
        children: [
          {
            label: 'Greeting 0 (priority)',
            onClick: () => {
              addDialogue('Greeting 0', 'Greeting');
            }
          },
          {
            label: 'Greeting 1 (priority quest)',
            onClick: () => {
              addDialogue('Greeting 1', 'Greeting');
            }
          },
          {
            label: 'Greeting 2 (vamp/nude)',
            onClick: () => {
              addDialogue('Greeting 2', 'Greeting');
            }
          },
          {
            label: 'Greeting 3 (MT/creatures)',
            onClick: () => {
              addDialogue('Greeting 3', 'Greeting');
            }
          },
          {
            label: 'Greeting 4 (desease/writ)',
            onClick: () => {
              addDialogue('Greeting 4', 'Greeting');
            }
          },
          {
            label: 'Greeting 5 (quests)',
            onClick: () => {
              addDialogue('Greeting 5', 'Greeting');
            }
          },
          {
            label: 'Greeting 6 (faction)',
            onClick: () => {
              addDialogue('Greeting 6', 'Greeting');
            }
          },
          {
            label: 'Greeting 7 (class)',
            onClick: () => {
              addDialogue('Greeting 7', 'Greeting');
            }
          },
          {
            label: 'Greeting 8 (clothes)',
            onClick: () => {
              addDialogue('Greeting 8', 'Greeting');
            }
          },
          {
            label: 'Greeting 9 (location)',
            onClick: () => {
              addDialogue('Greeting 9', 'Greeting');
            }
          },
        ],
      },
      {
        label: "Persuasion",
        children: [
          {
            label: 'Bribe Fail',
            onClick: () => {
              addDialogue('Bribe Fail', 'Persuasion');
            }
          },
          {
            label: 'Bribe Success',
            onClick: () => {
              addDialogue('Bribe Success', 'Persuasion');
            }
          },
          {
            label: 'Admire Fail',
            onClick: () => {
              addDialogue('Admire Fail', 'Persuasion');
            }
          },
          {
            label: 'Admire Success',
            onClick: () => {
              addDialogue('Admire Success', 'Persuasion');
            }
          },
          {
            label: 'Intimidate Fail',
            onClick: () => {
              addDialogue('Intimidate Fail', 'Persuasion');
            }
          },
          {
            label: 'Intimidate Success',
            onClick: () => {
              addDialogue('Intimidate Success', 'Persuasion');
            }
          },
          {
            label: 'Taunt Fail',
            onClick: () => {
              addDialogue('Taunt Fail', 'Persuasion');
            }
          },
          {
            label: 'Taunt Success',
            onClick: () => {
              addDialogue('Taunt Success', 'Persuasion');
            }
          },
          {
            label: 'Info Refusal',
            onClick: () => {
              addDialogue('Info Refusal', 'Persuasion');
            }
          },
          {
            label: 'Service Refusal',
            onClick: () => {
              addDialogue('Service Refusal', 'Persuasion');
            }
          },
        ],
      },
    ]
  });
}

async function fetchTopic(topic: string, loading=false) {
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

async function handleUpdateAll() {
  fetchTopics();
  fetchTopic(currentTopic.value, false);
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
      gap: 10px;
      button {
        &:hover {
          opacity: 0.7;
        }
      }
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
      margin-bottom: 15px;
      .text-input {
        color: rgb(202, 165, 96);
        font-size: 20px;
        &::placeholder {
          color: rgba(202, 165, 96, 0.5);
        }
      }
    }

    &__frame {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      //gap: 20px;
      text-align: center;
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
      margin-right: 50px;
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
    &__add {
      background-color: rgba(202, 165, 96, 0.6);
      color: black;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      width: 35px;
      height: 35px;
      position: absolute;
      bottom: 20px;
      right: 20px;
      transition: all .15s ease-in;
      &:hover {
        background-color: rgba(202, 165, 96, 1);
      }
    }
    &__topic {
      padding: 5px 10px 5px 10px;
      width: 100%;
      text-align: left;
      cursor: pointer;
        color: rgb(202, 165, 96);
        &:hover {
          color: rgb(223, 200, 157);
        }
      &_new {
        color: rgb(89, 170, 106);
        &:hover {
          color: rgb(156, 207, 167);
        }
      }
      &_mod {
        color: rgb(112, 126, 207);
        &:hover {
          color: rgb(159, 169, 223);
        }
      }
      &_selected {
        background-color: rgba(255, 255, 255, 0.2);
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

.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fade-enter,
.fade-leave-to {
  opacity: 0%;
}
</style>
