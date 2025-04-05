<template>
  <div class="dialogue">
    <div class="dialogue-answers">
      <div class="dialogue-answers__header" v-if="currentTopic">
        <div class="dialogue-answers__add" v-if="editMode" @click="addEntry">Add entry</div>
        <transition name="fadeHeight" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <span v-show="currentTopic.trim().length">{{ currentTopic }}</span>
        </transition>
        <div class="dialogue-answers__edit">
<!--           <icon name="list" color="#E1FF00" class="icon_gold" scale="1" @click="openClassicView"></icon>
          <icon v-if="!editMode" name="pen" color="#E1FF00" class="icon_gold" scale="1" @click="editMode = true"></icon>
          <div v-else>
            <icon name="ban" color="#E1FF00" class="icon_gold" scale="1" @click="
              editMode = false;
            editedEntry = '';
            "></icon>
          </div> -->
        </div>
      </div>
      <div>
        <transition-group name="fadeHeight" class="dialogue-answers__frame" mode="out-in" :style="{ width: '100%' }">
          <div v-for="answer in currentAnswers" :key="answer.id" :class="{ 'highlight-even': !editMode }">
            <div class="dialogue-answers-answer__above" v-if="!editMode"></div>
            <div class="dialogue-answers-answer__above-add" v-if="editMode">
              <button class="entry-control-button" @click="addEntry([answer.prev_id, answer.id])">
                <!-- <icon name="plus" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
              </button>
              <button class="entry-control-button" v-if="Object.keys(getClipboardDialogue).length"
                @click="pasteDialogueFromClipboard([answer.prev_id, answer.id])">
                <!-- <icon name="clipboard" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
              </button>
            </div>
            <form @submit.prevent="editDialogue" class="dialogue-answers-answer-wrapper">
              <div class="dialogue-answers-answer" :class="{
                'dialogue-answers-answer_modified': answer.old_values && answer.old_values.length,
                'dialogue-answers-answer_edit': editMode,
              }">
                <div class="dialogue-answers-answer-modified" v-if="answer.old_values && answer.old_values.length">
                  * Modified in {{ answer.old_values.slice(-1)[0].TMP_dep }}
                  <span class="dialogue-answers-answer-modified_dirty"
                    v-if="checkDirtied(answer.old_values.slice(-1)[0], answer)">
                    (possibly dirtied by CS)
                  </span>
                </div>
                <div class="dialogue-answers-answer__ids" v-if="false">
                  <div class="prev-id">{{ answer.prev_id || '-' }} (before)</div>
                  <div class="curr-id">id: {{ answer.id }}</div>
                </div>

                <DialogueEntryFilters :answer="answer" :speaker="speaker" :editMode="editMode" />

                <div v-if="editedEntry !== answer.id" class="dialogue-answers-answer__text"
                  v-html="getHyperlinkedAnswer(answer.text)" @click="handleAnswerClick($event)"></div>

                <textarea v-else v-text="answer.text" name="entryText" class="dialogue-entry-textarea"></textarea>

                <DialogueEntryResults :editMode="editMode" :code="getLanguage(answer.result, 'Lua (MWSE)')"
                  language="Lua (MWSE)" />
                <DialogueEntryResults :editMode="editMode" :code="getLanguage(answer.result, 'MWScript')"
                  language="MWScript" />

                <div class="dialogue-answers-answer__ids" v-if="false">
                  <div class="prev-id">{{ answer.id }} (id)</div>
                  <div class="curr-id">next id: {{ answer.next_id || '-' }}</div>
                </div>
              </div>
<!--               <icon v-if="editMode && editedEntry !== answer.id" name="pen" color="#E1FF00" class="icon_gold"
                scale="1" @click="editedEntry = answer.id"></icon> -->
              <div class="entry-edit-controls" v-if="editMode && editedEntry == answer.id">
                <button type="submit">
                  <!-- <icon name="save" color="#E1FF00" class="icon_gold" scale="1"></icon> -->
                </button>
<!--                 <icon name="copy" color="#E1FF00" class="icon_gold" scale="1" @click.prevent="setClipboard(answer)">
                </icon> -->
<!--                 <icon name="ban" color="#E1FF00" class="icon_gold" scale="1" @click.prevent="editedEntry = ''"></icon>
                <icon name="trash" color="#E1FF00" class="icon_gold" scale="1"
                  @click.prevent="deleteEntry(answer.id)"></icon> -->
              </div>
            </form>
          </div>
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
// import DialogueEntryFilters from '../dialogue/DialogueEntryFilters.vue';
// import DialogueEntryResults from '../dialogue/DialogueEntryResults.vue';
import { fetchTopicListByNPC, getOrderedEntriesByTopic } from '@/api/idb.js';
import { computed, ref, toRefs, watch } from 'vue';

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
          topic['speaker_rank'],
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
          !topic['speaker_rank'],
      );
  }
  return answers;
});

const getClipboardDialogue = computed(() => {
  return {};
  // return this.$store.getters['getClipboardDialogue'];
});

const getLastEntryId = computed(() => {
  return '';
  // return this.currentAnswers.at(-1).id;
})

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
function getLanguage(code, language) {
/*   if (!code) return '';
  if (language === 'Lua (MWSE)') {
    return code
      .split('\r\n')
      .filter((val) => val.includes(';lua '))
      .map((val) => val.replace(';lua ', ''))
      .join('\r\n');
  } else if (language === 'MWScript') {
    return code
      .split('\r\n')
      .filter((val) => !val.includes(';lua '))
      .join('\r\n');
  } */
}
function checkDirtied(entryOne, entryTwo) {
/*   let entryOneNonId = Object.fromEntries(
    Object.entries(entryOne).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  let entryTwoNonId = Object.fromEntries(
    Object.entries(entryTwo).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  return JSON.stringify(entryOneNonId) === JSON.stringify(entryTwoNonId); */
}
function handleAnswerClick(e) {
/*   if (e.target.className == 'dialogue-answers-answer__text_hyperlink') {
    this.setCurrentAnswers(e.target.innerText, 'Topic');
    this.currentTopic = e.target.innerText;
  } */
}
function getHyperlinkedAnswer(text) {
  let hyperlinkedAnswer = text;
  for (let topic of topicsList.value) {
    if (hyperlinkedAnswer.includes(topic)) {
      hyperlinkedAnswer = hyperlinkedAnswer.replace(
        topic,
        `<span class="dialogue-answers-answer__text_hyperlink">${topic}</span>`,
      );
    }
  }
  return hyperlinkedAnswer;
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
function openClassicView() {
/*   this.$store.commit('setClassicViewTopic', this.currentTopic);
  this.$store.commit('setClassicView', true); */
}

watch(getSpeakerData, (() => {
/*   this.setCurrentAnswers('', '');
  this.currentTopic = '';
  this.dialogue = await this.$store.dispatch('fetchTopicListByNPC', [
    this.speaker.speakerId,
    this.speaker.speakerType,
  ]); */
}))

watch(currentTopic, (async (newValue) => {
  if (newValue.trim()) {
    const orderedEntriesResponse = await getOrderedEntriesByTopic(newValue);
    orderedEntries.value = orderedEntriesResponse;
  } else {
    orderedEntries.value = [];
  }
}))
</script>



<style lang="scss">
.dialogue {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 2px;

  &-answers {
    //padding: 0 5px 5px 5px;
    flex-grow: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-x: hidden;
    overflow-y: scroll;

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
        margin-bottom: 20px;
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
