<template>
  <div 
    :id="`${props.entry.TMP_topic}-${props.entry.data.disposition}`" 
    :key="`${props.entry.TMP_topic}-${props.entry.data.disposition}`" 
    class="entries-list__child"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="entry-wrapper">
      <div class="quest-entry" :class="{
        'quest-entry_finished': isFinished,
        'quest-entry_highlighted': getIsHighlighted(props.entry.data.disposition),
        'quest-entry_new': entryStatus === 'new',
        'quest-entry_mod': entryStatus === 'mod',
      }" draggable @dragstart="startDrag($event, props.entry)">
        <div class="quest-entry__text">
          <editor-content :editor="editor" />
            <EntryDisposition 
              :entry="props.entry"
              :questId
            />
          <button
            v-if="showPrevEntry"
            type="button"
            class="quest-entry__add quest-entry__add_top" 
            @click="createEntry(props.entry.prev_id, props.entry.id)"
          >
            <TdesignAdd />
          </button>
          <button
            v-if="showNextEntry"
            type="button"
            class="quest-entry__add quest-entry__add_bottom"
            @click="createEntry(props.entry.id, props.entry.next_id)"
          >
            <TdesignAdd />
          </button>
        </div>
        <div class="entry-controls">
          <button
            type="button"
            class="entry-controls__btn entry-controls__btn_delete"
            @click="handleDeleteEntry"
          >
            <TdesignClose />
          </button>
          <button
            type="button"
            class="entry-controls__btn"
            :class="{
              'entry-controls__btn_on': isFinished,
              'entry-controls__btn_off': !isFinished
            }"
            @click="toggleFinished"
          >
            <TdesignFlagFilled v-if="isFinished"/>
            <TdesignFlag v-else />
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { VariableHighlight } from '@/extensions/VariableHighlight';
import { computed, ref, watch } from 'vue';
import TdesignAdd from '~icons/tdesign/add';
import TdesignFlag from '~icons/tdesign/flag';
import TdesignFlagFilled from '~icons/tdesign/flag-filled';
import TdesignClose from '~icons/tdesign/close';

import { editTopicText, addQuestEntry, modifyJournalEntry, deleteJournalEntry, ensureDialogueInActive } from '@/api/idb.ts';
import { useRecordStatus } from '@/composables/useRecordStatus';
import { watchDebounced } from '@vueuse/core';
import { useSelectedQuest } from '@/stores/selectedQuest';

import EntryDisposition from '@/components/journal/EntryDisposition.vue';

import type { DialogueInfoRecord, FilterComparison } from '@/types/pluginEntries';
import { logger } from '@/services/logger';

const props = withDefaults(defineProps<{
  entry?: DialogueInfoRecord;
  prevEntry?: DialogueInfoRecord;
  nextEntry?: DialogueInfoRecord;
  questId?: string;
  highlightedId?: number | string;
  highlightedComparison?: FilterComparison | string;
}>(), {
  entry: () => ({}) as DialogueInfoRecord,
  prevEntry: () => ({}) as DialogueInfoRecord,
  nextEntry: () => ({}) as DialogueInfoRecord,
});

const selectedQuestStore = useSelectedQuest();

// Entry status: 'new' (green) | 'mod' (blue) | ''
const { status: entryStatus } = useRecordStatus(
  () => props.entry,
  {
    isNew: () => props.entry?.TMP_is_active ?? false,
    isModified: () => !!(props.entry?.old_entries?.length),
  },
);

async function handleDeleteEntry() {
  try {
    await deleteJournalEntry(props.entry);
    await selectedQuestStore.fetchQuest(props.entry.TMP_topic, { reload: false });
  } catch (error) {
    logger.error('Journal', 'Failed to delete entry', error);
  }
}

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  const transferData = {
    type: 'Journal',
    entry: props.entry
  }
  event.dataTransfer.setData("application/json", JSON.stringify(transferData));
}

function onDragEnd() {
}

const showPrevEntry = computed(() => {
  if (props.entry.data.disposition < 2) {
    return false;
  }
  if (!props.prevEntry?.data?.disposition) {
    return true;
  }
  if ((props.entry.data.disposition - props.prevEntry?.data?.disposition) > 1) {
    return true;
  }
  return false;
});

const showNextEntry = computed(() => {
  if (!props.nextEntry?.data?.disposition) {
    return true;
  }
  if ((props.nextEntry?.data?.disposition - props.entry.data.disposition) > 1) {
    return true;
  }
  return false;
})

const isFinished = ref(false);
const propsIsFinished = computed(() => props.entry.quest_state === 'Finished');
watch(propsIsFinished, (newValue) => {
  isFinished.value = newValue;
}, {
  immediate: true,
});
async function toggleFinished() {
  try {
    await modifyJournalEntry(props.entry, {
      quest_state: isFinished.value ? null : 'Finished',
    });
    isFinished.value = !isFinished.value;
    await selectedQuestStore.fetchQuest(props.entry.TMP_topic, { reload: false });
  } catch (error) {
    logger.error('Journal', 'Failed to toggle finished state', error);
  }
}

async function createEntry(prevId: String, nextId: String) {
  const questId = props.entry.TMP_topic;
  if (!questId) return;
  await addQuestEntry(questId, 'New entry', prevId, nextId);
  await selectedQuestStore.fetchQuest(questId, { reload: false });
}

const entryText = ref('');

watch(() => props.entry?.text, (newValue) => {
  entryText.value = newValue;
}, {
  immediate: true,
})

watchDebounced(entryText, async (newValue) => {
  const result = await editTopicText(props.entry.TMP_info_id, newValue);

  // Ensure the parent Dialogue record is in the active plugin (idempotent)
  await ensureDialogueInActive(props.entry.TMP_topic);

  if (!props.entry.TMP_is_active) {
    await selectedQuestStore.fetchQuest(props.entry.TMP_topic, { reload: false, fetchQuests: false });
  }
  // Refresh quest list (so dot appears / quest shows in active filter)
  await selectedQuestStore.fetchQuests();
}, {
  debounce: 500,
})

const editor = useEditor({
  content: entryText.value,
  extensions: [
    StarterKit,
    VariableHighlight,
  ],
  onUpdate: () => entryText.value = editor.value ? editor.value.getText() : '',
})

function startDrag(event, entry) {
  event.dataTransfer.setData('type', 'Journal');
  event.dataTransfer.setData('topic', entry.TMP_topic);
  event.dataTransfer.setData('disposition', entry.data.disposition);
}

function getIsHighlighted(entryId) {
  let intEntryId = parseInt(entryId);
  let intHighlightedId = parseInt(props.highlightedId);
  switch (props.highlightedComparison) {
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
.entry-controls {
  // position: absolute;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  border-radius: 4px;
  align-items: center;
  z-index: 10;
  border-left: solid 1px rgba(0, 0, 0, 0.1);
  opacity: 0.7;
  transition: all .15s ease-in;
  border-bottom: 2px dashed rgba(0, 0, 0, 0.1);
  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    &_on {
      svg {
        color: rgba(89, 170, 106, 1);
      }
    }
    &_off {
      svg {
        color: hsl(133, 0%, 51%);
      }
    }
    &_delete {
      svg {
        color: rgb(150, 50, 30);
      }
    }
    svg {
      transition: color .3s ease-in;
    }
  }
}

.entry-finished-flag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  opacity: 0.7;
  svg {
    color: rgb(202, 165, 96);
  }
}

.entries-list__child {
  &:hover {
    .entry-controls {
      opacity: 1;
    }
  }
}

.input-disposition {
  padding: 5px;
  font-family: 'Pelagiad';
  font-size: 18px;
  display: flex;
  justify-content: center;
  text-align: center;
  border-radius: 8px;
  outline: none;
  border: solid 1px rgba(0, 0, 0, 0.1);
  width: 50px;
  height: fit-content;
  // float: right;
  margin: 5px;
  background-color: transparent;
}
</style>