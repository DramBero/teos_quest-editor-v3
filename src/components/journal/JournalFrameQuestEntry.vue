<template>
  <div 
    :id="props.questId + props.entry.data.disposition" class="entries-list__child">
    <div class="entry-wrapper">
      <div class="quest-entry" :class="{
        'quest-entry_finished': props.entry.quest_state === 'Finished',
        'quest-entry_highlighted': getIsHighlighted(props.entry.data.disposition),
      }" draggable @dragstart="startDrag($event, props.entry)">
        <div class="quest-entry__text">
          <editor-content :editor="editor" />
        </div>
        <div class="quest-entry__index">
          {{ props.entry.data.disposition }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { ref, watch } from 'vue';

import { editTopicText } from '@/api/idb.js';
import { watchDebounced } from '@vueuse/core';

const props = defineProps({
  entry: {
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
  onUpdate: () => entryText.value = editor.value.getHTML(),
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