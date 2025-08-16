<template>
  <button 
    v-if="!props.selected"
    class="quest-tabs__tab" 
    :class="{
      'quest-tabs__tab_new': props.quest.TMP_is_active,
      'quest-tabs__tab_selected': props.selected,
    }"
    @click="selectTab"
  >
    <span >{{ questId }}</span>
  </button>
  <div
    v-else
    class="quest-tabs__tab" 
    :class="{
      'quest-tabs__tab_new': props.quest.TMP_is_active,
      'quest-tabs__tab_selected': props.selected,
    }"
  >
    <editor-content :editor="editor" />
    <button
      type="button"
      class="tab__delete"
    >
      <TdesignClose />
    </button>
  </div>
</template>

<script setup lang="ts">
import TdesignClose from '~icons/tdesign/close';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { watchDebounced } from '@vueuse/core';

import StarterKit from '@tiptap/starter-kit';
import { ref, watch } from 'vue';

const props = defineProps({
  quest: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  selected: {
    type: Boolean,
    required: true,
    default: false,
  }
});

const emit = defineEmits(['select']);

function selectTab() {
  emit('select', props.quest.id)
}

const questId = ref<string>();

watch(() => props.quest?.id, (newValue: string) => {
  questId.value = newValue;
}, {
  immediate: true,
});

const editor = useEditor({
  content: questId.value,
  extensions: [
    StarterKit,
  ],
  onUpdate: () => questId.value = editor.value ? editor.value.getHTML() : '',
})
</script>