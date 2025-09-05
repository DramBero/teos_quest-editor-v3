<template>
  <span v-if="disabled">
    {{ props.default }}
  </span>
  <editor-content
    v-else
    :editor="editor"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    classList="quest-name-edit"
  />
</template>

<script setup lang="ts">
import StarterKit from '@tiptap/starter-kit';
import { useEditor, EditorContent, Extension } from '@tiptap/vue-3';
import { ref, watch } from 'vue';

const props = defineProps<{
  default: String;
  disabled: Boolean;
}>();

const questName = ref<String>();
watch(() => props.default, () => {
  questName.value = props.default;
}, {
  immediate: true,
});

watch(questName, () => {
  
});

const DisableEnter = Extension.create({
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
    };
  },
});

const editor = useEditor({
  content: questName.value,
  extensions: [
    StarterKit,
    DisableEnter,
  ],
  onUpdate: () => questName.value = editor.value ? editor.value.getText() : '',
});
</script>

<style lang="scss">
.quest-name-edit {
  width: 100%;
  padding: 4px;
  cursor: text;
  border-radius: 4px;
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>