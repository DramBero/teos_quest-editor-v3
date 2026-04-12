<template>
  <div class="highlight-even" :class="{
    'highlight-even_new': getEntryStatus === 'new',
    'highlight-even_mod': getEntryStatus === 'mod',
  }">
    <button 
      class="dialogue-add dialogue-add_top"
      @click="addDialogue('prev')"
    >
      <TdesignAdd />
    </button>
    <button 
      class="dialogue-add dialogue-add_bottom"
      @click="addDialogue('next')"
    >
      <TdesignAdd />
    </button>
    <button
      class="dialogue-menu"
      @click="showMenu"
    >
      <TdesignMore />
    </button>
    <div class="dialogue-answers-answer__above"></div>
      <div class="dialogue-answers-answer-wrapper">
        <div 
          class="dialogue-answers-answer" 
          :class="{
            'dialogue-answers-answer_modified': props.answer.old_values && props.answer.old_values.length,
          }"
        >
          <div class="dialogue-answers-answer-modified" v-if="getModificationList.length">
            * Modification to {{ getModificationList.join(', ') }}
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
            :topicChoices="props.topicChoices"
            :onlyFilters="false"
            @fetchTopic="emit('updateAll')"
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

        <DialogueEntryResults
          v-if="getLua"
          :code="getLua"
          language="Lua (MWSE)"
          @update="updateLua"
        />
        <DialogueEntryResults
          v-if="getMWScript"
          :code="getMWScript"
          language="MWScript"
          @update="updateMWScript"
        />

        <div class="dialogue-answers-answer__ids" v-if="false">
          <div class="prev-id">{{ props.answer.id }} (id)</div>
          <div class="curr-id">next id: {{ props.answer.next_id || '-' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DialogueEntryFilters from '../dialogue/DialogueEntryFilters.vue';
import DialogueEntryResults from '../dialogue/DialogueEntryResults.vue';

import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { VariableHighlight } from '@/extensions/VariableHighlight';

import { watchDebounced } from '@vueuse/core';
import { editTopicText, addDialogueEntry, deleteJournalEntry, modifyEntry, editScriptText } from '@/api/idb.ts';
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { logger } from '@/services/logger';

import ContextMenu, { type MenuItem } from '@imengyu/vue3-context-menu';

import TdesignAdd from '~icons/tdesign/add';
import TdesignMore from '~icons/tdesign/more';

import type { InfoEntry, DialogueInfoRecord } from '@/types/pluginEntries';

interface SpeakerData {
  speakerId: string;
  speakerType: string;
  speakerName: string;
}

interface TopicChoice {
  entryId: string;
  id: number;
  text: string;
}

const props = defineProps<{
  answer: InfoEntry | DialogueInfoRecord;
  speaker: SpeakerData;
  topicChoices: TopicChoice[];
  topicsList: InfoEntry[][];
  orderedEntries: InfoEntry[];
}>();

const emit = defineEmits<{
  (e: 'applyFilter', filter: unknown): void;
  (e: 'setCurrentAnswers', text: string, type: string): void;
  (e: 'updateAll'): void;
  (e: 'updateChoices'): void;
}>();

import { useRecordStatus } from '@/composables/useRecordStatus';

const { status: getEntryStatus } = useRecordStatus(() => props.answer);

const currentEntry = ref<InfoEntry | null>(null);

watch(() => props.answer, () => {
  currentEntry.value = Object.assign({}, props.answer);
}, {
  immediate: true,
})

const answerText = ref('');

async function addDialogue(direction: 'prev' | 'next') {
  let prevId = '';
  let nextId = '';
  const entryIndex = props.orderedEntries.findIndex((val) => val.id === props.answer.id);
  if (direction === 'prev') {
    nextId = props.answer.id;
    if (entryIndex > 0) {
      prevId = props.orderedEntries[entryIndex - 1]?.id;
    }
  } else if (direction === 'next') {
    prevId = props.answer.id;
    if (entryIndex < props.orderedEntries.length) {
      nextId = props.orderedEntries[entryIndex + 1]?.id;
    }
  }
  await addDialogueEntry(
    props.speaker.speakerId,
    props.answer.TMP_topic,
    props.answer.TMP_type,
    props.speaker.speakerType,
    props.answer.id,
    prevId,
    nextId,
  );
  emit('updateAll');
}

watch(() => props.answer, (newValue) => {
  answerText.value = newValue.text;
}, {
  immediate: true,
})

watchDebounced(answerText, async (newValue) => {
  if (newValue === props.answer.text) return;

  const result = await editTopicText(props.answer.TMP_info_id, newValue);
  if (result) {
    emit('updateChoices');
    
    if (result.TMP_is_active !== props.answer.TMP_is_active) {
      emit('updateAll');
    }
  }
}, {
  debounce: 500,
  maxWait: 2000,
})

const editor = useEditor({
  content: answerText.value,
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'New entry',
    }),
    VariableHighlight,
  ],
  autofocus: props.answer.text === '' ? 'all' : false,
  onUpdate: () => {
    const text = editor.value?.getText() || '';
    if (answerText.value !== text) {
      answerText.value = text;
    }
  },
});

// Sync editor content when props change (important when component is reused)
watch(() => props.answer.text, (newText) => {
  if (editor.value && editor.value.getText() !== newText) {
    editor.value.commands.setContent(newText, false);
    answerText.value = newText;
  }
});

onBeforeUnmount(async () => {
  // Save changes on component destruction (e.g. closing the modal)
  if (answerText.value !== props.answer.text) {
    await editTopicText(props.answer.TMP_info_id, answerText.value);
  }
});

watch(answerText, (newValue) => {
  if (!editor.value || newValue !== '') return;
  editor.value.commands.focus('start');
}, {
  immediate: true,
});

const getModificationList = computed(() => {
  const oldValues = props.answer.old_values || [];
  if (!props.answer.TMP_is_active || !oldValues.length) {
    return [];
  } else {
    return [...oldValues.slice(0, -1)].map(val => (val as any).TMP_dep).reverse();
  }
})

const getIsDirty = computed(() => {
  const oldValues = (props.answer.old_values || []) as any[];
  if (!oldValues.length) {
    return false;
  }
  const entryOneNonId = Object.fromEntries(
    Object.entries(oldValues.slice(-2)[0]).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  const entryTwoNonId = Object.fromEntries(
    Object.entries(props.answer).filter(
      ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
    ),
  );
  return JSON.stringify(entryOneNonId) === JSON.stringify(entryTwoNonId);
});

const getContextMenuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []

  if (!getLua.value) {
    items.push({
      label: 'Add Lua (MWSE)',
      divided: !!getMWScript.value,
      onClick: addLuaScript,
    });
  }

  if (!getMWScript.value) {
    items.push({
      label: 'Add MWScript',
      divided: true,
      onClick: addMWScript,
    });
  }

  if (getEntryStatus.value === 'new') {
    items.push({
      label: 'Delete',
      onClick: () => handleDeleteEntry(false),
    });
  } else if (getEntryStatus.value === 'mod') {
    items.push({
      label: 'Revert changes',
      onClick: () => handleDeleteEntry(true),
    });
  }

  return items;
})

async function handleDeleteEntry(isMod: boolean) {
  await deleteJournalEntry(props.answer, isMod);
  emit('updateAll');
}

function useLuaResults() {
  const getLua = computed(() => {
    if (!currentEntry.value?.script_text) {
      return '';
    };
    return currentEntry.value.script_text
      .split('\r\n')
      .filter((val) => val.includes(';lua '))
      .map((val) => val.replace(';lua ', ''))
      .join('\r\n');
  });


  async function addLuaScript() {
    const scriptText = `;lua text\r\n${getMWScript.value}`;
    const newEntryResponse = await editScriptText(props.answer.TMP_info_id, scriptText);

    if (newEntryResponse) {
      currentEntry.value = newEntryResponse;
      if (newEntryResponse.TMP_is_active !== props.answer.TMP_is_active) {
         emit('updateAll');
      }
    }
  }

  async function updateLua(newValue: string) {
    const luaScripts = newValue.split('\r\n').map(val => ';lua ' + val).join('\r\n');
    const scriptText = `${luaScripts}\r\n${getMWScript.value}`;
    logger.debug('Script', `SCRIPT TEXT: ${scriptText}`);
    
    const newEntryResponse = await editScriptText(props.answer.TMP_info_id, scriptText);

    if (newEntryResponse) {
      currentEntry.value = newEntryResponse;
      if (newEntryResponse.TMP_is_active !== props.answer.TMP_is_active) {
         emit('updateAll');
      }
    }
  }

  return { getLua, addLuaScript, updateLua };
}

const { getLua, addLuaScript, updateLua } = useLuaResults();

function useMWScriptResults() {
  const getMWScript = computed(() => {
    if (!currentEntry.value?.script_text) {
      return '';
    };
    return currentEntry.value.script_text
      .split('\r\n')
      .filter((val) => !val.includes(';lua '))
      .join('\r\n');
  });

  async function addMWScript() {
    const luaValue = getLua.value.split('\r\n').map(val => `;lua ${val}`).join('\r\n');
    const scriptText = `${luaValue}\r\ntext`;
    
    const newEntryResponse = await editScriptText(props.answer.TMP_info_id, scriptText);

    if (newEntryResponse) {
      currentEntry.value = newEntryResponse;
      if (newEntryResponse.TMP_is_active !== props.answer.TMP_is_active) {
         emit('updateAll');
      }
    }
  }

  async function updateMWScript(newValue: string) {
    const luaValue = getLua.value.split('\r\n').map(val => `;lua ${val}`).join('\r\n');
    const scriptText = `${luaValue}\r\n${newValue}`;
    logger.debug('Script', `SCRIPT TEXT: ${scriptText}`);
    
    const newEntryResponse = await editScriptText(props.answer.TMP_info_id, scriptText);
    emit('updateChoices');

    if (newEntryResponse) {
      currentEntry.value = newEntryResponse;
      if (newEntryResponse.TMP_is_active !== props.answer.TMP_is_active) {
         emit('updateAll');
      }
    }
  }

  return { getMWScript, addMWScript, updateMWScript };
}

const { getMWScript, addMWScript, updateMWScript } = useMWScriptResults();

function showMenu(e: MouseEvent) {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y + 30,
    items: getContextMenuItems.value,
  })
}

function handleAnswerClick(e: any) {
  if (e.target.className == 'dialogue-answers-answer__text_hyperlink') {
    emit('setCurrentAnswers', e.target.innerText, 'Topic');
  }
}

function getHyperlinkedAnswer(text: string) {
  let hyperlinkedAnswer = text;
  for (const topic of props.topicsList) {
    if (hyperlinkedAnswer.includes(topic as any)) {
      hyperlinkedAnswer = hyperlinkedAnswer.replace(
        topic as any,
        `<span class="dialogue-answers-answer__text_hyperlink">${topic}</span>`,
      );
    }
  }
  return hyperlinkedAnswer;
}

function applyFilter(filter: any) {
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

.dialogue-menu {
  position: absolute;
  top: 20px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 5px;
  &:hover {
    background-color: rgba(202, 165, 96, 0.2);
  }
}

.tiptap p.is-editor-empty:first-child::before {
  color: rgba(202, 165, 96, 0.5);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

// --- Morrowind variable highlighting ---
.mw-var {
  border-radius: 2px;
  padding: 0 1px;
  font-weight: 500;

  &--valid {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.08);
  }
  &--invalid {
    color: rgb(220, 120, 100);
    background: rgba(220, 120, 100, 0.1);
  }
  &--pending {
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>