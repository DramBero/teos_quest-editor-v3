<template>
  <div class="highlight-even" :class="{
    'highlight-even_new': props.answer.TMP_is_active,
    'highlight-even_mod': props.answer.old_values && props.answer.old_values.length > 1,
  }">
    <button 
      class="dialogue-add dialogue-add_top"
      @click="addDialogue('top')"
    >
      <TdesignAdd />
    </button>
    <button 
      class="dialogue-add dialogue-add_bottom"
      @click="addDialogue('bottom')"
    >
      <TdesignAdd />
    </button>
    <div class="dialogue-answers-answer__above" v-if="!props.editMode"></div>
      <div class="dialogue-answers-answer__above-add" v-if="props.editMode">
        <button class="entry-control-button" @click="addEntry([props.answer.prev_id, props.answer.id])">
        <!-- <icon name="plus" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
        </button>
        <button class="entry-control-button" v-if="Object.keys(getClipboardDialogue).length"
        @click="pasteDialogueFromClipboard([props.answer.prev_id, props.answer.id])">
        <!-- <icon name="clipboard" class="entry-control-button__icon" color="#E1FF00" scale="1"></icon> -->
        </button>
      </div>
      <form @submit.prevent="editDialogue" class="dialogue-answers-answer-wrapper">
        <div 
          class="dialogue-answers-answer" 
          :class="{
            'dialogue-answers-answer_modified': props.answer.old_values && props.answer.old_values.length,
            'dialogue-answers-answer_edit': props.editMode,
          }"
        >
          <div class="dialogue-answers-answer-modified" v-if="props.answer.old_values && props.answer.old_values.length > 1">
            * Modified in {{ props.answer.old_values.slice(-2)[0].TMP_dep }}
            <span class="dialogue-answers-answer-modified_dirty"
              v-if="getIsDirty">
              (possibly dirtied by CS)
            </span>
          </div>
          <div class="dialogue-answers-answer__ids" v-if="false">
            <div class="prev-id">{{ props.answer.prev_id || '-' }} (before)</div>
            <div class="curr-id">id: {{ props.answer.id }}</div>
          </div>

          <DialogueEntryFilters 
            :answer="props.answer" 
            :speaker="props.speaker" 
            :editMode="props.editMode" 
            :topicChoices="props.topicChoices"
            @fetchTopic="fetchTopic"
          />

          <div class="dialogue-answers-answer__text">
            <editor-content :editor="editor" />
          </div>

<!--         <div v-if="editedEntry !== props.answer.id" class="dialogue-answers-answer__text"
            v-html="getHyperlinkedAnswer(props.answer.text)" @click="handleAnswerClick($event)"></div> -->

          <div class="dialogue-entry__choices">
            <div 
            v-for="choice, choiceIndex in topicChoices.filter(val => val.entryId === props.answer.id)"
            :key="choiceIndex"
            class="dialogue-entry__choice"
            @click="applyFilter({key: 'choice', value: choice.id})"
            >
            <div class="choice__id">
                {{ choice.id }}
            </div>
            <div class="choice__text">
                {{ choice.text }}
            </div>
          </div>
        </div>

        <DialogueEntryResults :editMode="props.editMode" :code="getLanguage(props.answer.script_text, 'Lua (MWSE)')"
            language="Lua (MWSE)" />
        <DialogueEntryResults :editMode="props.editMode" :code="getLanguage(props.answer.script_text, 'MWScript')"
            language="MWScript" />

        <div class="dialogue-answers-answer__ids" v-if="false">
            <div class="prev-id">{{ props.answer.id }} (id)</div>
            <div class="curr-id">next id: {{ props.answer.next_id || '-' }}</div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import DialogueEntryFilters from '../dialogue/DialogueEntryFilters.vue';
import DialogueEntryResults from '../dialogue/DialogueEntryResults.vue';

import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

import { watchDebounced } from '@vueuse/core';
import { editTopicText, addDialogueEntry } from '@/api/idb.js';
import { computed, ref, watch } from 'vue';

import TdesignAdd from '~icons/tdesign/add';

const props = defineProps({
  answer: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  speaker: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  editMode: {
    type: Boolean,
    required: false,
    default: false,
  },
  topicChoices: {
    type: Array,
    required: false,
    default: () => [],
  },
  topicsList: {
    type: Array,
    required: false,
    default: () => [],
  },
})

const answerText = ref('');

function addDialogue() {
  addDialogueEntry(props.speaker.speakerId, props.answer.TMP_topic, props.answer.TMP_type, props.speaker.speakerType);
}

watch(() => props.answer, (newValue) => {
  answerText.value = newValue.text;
}, {
  immediate: true,
})

watchDebounced(answerText, (newValue) => {
  editTopicText(props.answer.TMP_info_id, newValue)
}, {
  debounce: 500,
})

const editor = useEditor({
  content: answerText.value,
  extensions: [
    StarterKit,
  ],
  onUpdate: () => answerText.value = editor.value.getHTML(),
})

function getLanguage(code, language) {
  if (!code) return '';
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
  }
}

const getIsDirty = computed(() => {
  if (!props.answer.old_values?.length) {
    return false;
  }
  const entryOneNonId = Object.fromEntries(
    Object.entries(props.answer.old_values.slice(-2)[0]).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  const entryTwoNonId = Object.fromEntries(
    Object.entries(props.answer).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  return JSON.stringify(entryOneNonId) === JSON.stringify(entryTwoNonId);
})

const emit = defineEmits(['applyFilter', 'setCurrentAnswers']);

function handleAnswerClick(e) {
  if (e.target.className == 'dialogue-answers-answer__text_hyperlink') {
    emit('setCurrentAnswers', e.target.innerText, 'Topic');
    currentTopic.value = e.target.innerText;
  }
}

function getHyperlinkedAnswer(text) {
  let hyperlinkedAnswer = text;
  for (const topic of props.topicsList) {
    if (hyperlinkedAnswer.includes(topic)) {
      hyperlinkedAnswer = hyperlinkedAnswer.replace(
        topic,
        `<span class="dialogue-answers-answer__text_hyperlink">${topic}</span>`,
      );
    }
  }
  return hyperlinkedAnswer;
}

function addEntry() {

}

function applyFilter(filter) {
  emit('applyFilter', filter);
}
</script>

<style lang="scss">
.tiptap {
  outline: none !important;
}

.highlight-even {
  position: relative;
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
  &_new {
    background-color: rgba(54, 92, 44, 0.3);
    &:nth-child(even) {
      background-color: rgba(54, 92, 44, 0.3);
    }
  }
  &_mod {
    background-color: rgba(44, 51, 92, 0.3);
    &:nth-child(even) {
      background-color: rgba(44, 51, 92, 0.3);
    }
  }
}

.dialogue-add {
  position: absolute;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  &:hover {
    background-color: rgba(182, 145, 76, 0.1);
    opacity: 1;
  }
  &_top {
    top: -12px;
  }
  &_bottom {
    bottom: -12px;
  }
}
</style>