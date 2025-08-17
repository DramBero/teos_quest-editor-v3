<template>
  <div 
    :id="`${props.entry.TMP_topic}-${props.entry.data.disposition}`" class="entries-list__child">
    <div class="entry-wrapper">
      <div class="quest-entry" :class="{
        'quest-entry_finished': isFinished,
        'quest-entry_highlighted': getIsHighlighted(props.entry.data.disposition),
        'quest-entry_new': props.entry.TMP_is_active,
      }" draggable @dragstart="startDrag($event, props.entry)">
        <div class="quest-entry__text">
          <editor-content v-if="props.entry.TMP_is_active" :editor="editor" />
          <div v-else>
            {{ props.entry.text }}
          </div>
        </div>
        <div class="quest-entry__index">
          {{ props.entry.data.disposition }}
        </div>
      </div>
    </div>
    <button
      v-if="!prevEntry?.data?.disposition || (props.entry.data.disposition - prevEntry?.data?.disposition) > 1"
      type="button"
      class="quest-entry__add quest-entry__add_top" 
      @click="createEntry(props.entry.prev_id, props.entry.id)"
    >
      <TdesignAdd />
    </button>
    <button
      v-if="!nextEntry?.data?.disposition || (nextEntry?.data?.disposition - props.entry.data.disposition) > 1"
      type="button"
      class="quest-entry__add quest-entry__add_bottom"
      @click="createEntry(props.entry.id, props.entry.next_id)"
    >
      <TdesignAdd />
    </button>
    <div class="entry-controls" v-if="props.entry.TMP_is_active">
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
      <button
        type="button"
        class="entry-controls__btn entry-controls__btn_delete"
        disabled
      >
        <TdesignClose />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { computed, ref, watch } from 'vue';
import TdesignAdd from '~icons/tdesign/add';
import TdesignFlag from '~icons/tdesign/flag';
import TdesignFlagFilled from '~icons/tdesign/flag-filled';
import TdesignClose from '~icons/tdesign/close';

import { editTopicText, addQuestEntry, modifyEntry } from '@/api/idb.js';
import { watchDebounced } from '@vueuse/core';
import { useSelectedQuest } from '@/stores/selectedQuest';

const props = defineProps({
  entry: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  prevEntry: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  nextEntry: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  questId: {
    type: String,
    required: false,
  },
  highlightedId: {
    type: [Number, String],
    required: false,
  },
  highlightedComparison: {
    type: String,
    required: false,
  },
});

const isFinished = ref(false);
const propsIsFinished = computed(() => props.entry.quest_state === 'Finished');
watch(propsIsFinished, (newValue) => {
  isFinished.value = newValue;
}, {
  immediate: true,
});
async function toggleFinished() {
  try {
    await modifyEntry({
      TMP_index: props.entry.TMP_index,
      quest_state: isFinished.value ? '' :'Finished',
    })
    isFinished.value = !isFinished.value;
  } catch (error) {
    console.error(error);
  }
}

const selectedQuestStore = useSelectedQuest();

async function createEntry(prevId: String, nextId: String) {
  const questId = props.entry.TMP_topic;
  if (!questId) return;
  await addQuestEntry(questId, 'New entry', prevId, nextId);
  await selectedQuestStore.fetchQuest(questId);
}

const entryText = ref('');

watch(() => props.entry?.text, (newValue) => {
  entryText.value = newValue;
}, {
  immediate: true,
})

watchDebounced(entryText, (newValue) => {
  editTopicText(props.entry.TMP_info_id, newValue)
}, {
  debounce: 500,
})

const editor = useEditor({
  content: entryText.value,
  extensions: [
    StarterKit,
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
  position: absolute;
  right: 0;
  bottom: 0;
  display: none;
  background-color: white;
  border-radius: 4px;
  padding: 5px;
  align-items: center;
  z-index: 10;
  gap: 15px;
  transform: translate(0, 70%);
  box-shadow: 2px 2px 4px 2px rgba(0, 0, 0, 0.1);
  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
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

.entries-list__child {
  &:hover {
    .entry-controls {
      display: flex;
    }
  }
}
</style>