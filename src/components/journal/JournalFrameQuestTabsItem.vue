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
    <editor-content
      v-if="allowEdit"
      :editor="editor"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />
    <span v-else>{{ questId }}</span>
    <button
      v-if="allowEdit"
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
import { useSelectedQuest } from '@/stores/selectedQuest';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from "@tiptap/core";

import { computed, ref, watch } from 'vue';

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

const selectedQuestStore = useSelectedQuest();
const selectedQuest = computed(() => selectedQuestStore.getSelectedQuest);

const allowEdit = computed(() => {
  return props.quest.TMP_is_active && !selectedQuest.value?.entries?.length;
})

function selectTab() {
  emit('select', props.quest.id)
}

const questId = ref<string>();

watch(() => props.quest?.id, (newValue: string) => {
  questId.value = newValue;
}, {
  immediate: true,
});

const DisableEnter = Extension.create({
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
      Space: () => true,
    };
  },
});

const editor = useEditor({
  content: questId.value,
  extensions: [
    StarterKit,
    DisableEnter,
  ],
  autofocus: 'all',
  parseOptions: {
    preserveWhitespace: 'full',
  },
  onUpdate: () => questId.value = editor.value ? editor.value.getText() : '',
})
</script>