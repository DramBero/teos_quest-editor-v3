<template>
  <div v-if="code">
    <div class="results" :class="{ results_lua: language === 'Lua (MWSE)' }">
      <span
        class="script-language"
        :class="{ 'script-language_lua': language === 'Lua (MWSE)' }"
      >
        {{ language }}
      </span>
      <div ref="editorContainer" class="results__editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { vscodeDarkInlineExtensions } from '@/mwscript/cm6-theme';
import { mwscriptBasic } from '@/mwscript/cm6-mwscript';

const props = defineProps<{
  code?: string;
  language?: string;
  editMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', value: string): void;
}>();

const editorContainer = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);

// Theme imported from @/mwscript/cm6-theme

onMounted(() => {
  if (!editorContainer.value || !props.code) return;

  const extensions = [
    mwscriptBasic(),
    ...vscodeDarkInlineExtensions,
    EditorView.lineWrapping,
    EditorState.readOnly.of(!props.editMode),
  ];

  // Listen for changes if editable
  if (props.editMode) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const val = update.state.doc.toString();
          emit('update', val.replace(/(?<!\r)\n/g, '\r\n'));
        }
      }),
    );
  }

  const state = EditorState.create({
    doc: props.code,
    extensions,
  });

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  });
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
});
</script>

<style lang="scss">
.results {
  border: 1px solid rgba(170, 169, 98, 0.5);
  font-family: 'Fira Code', monospace;
  background: rgb(32, 32, 22);
  position: relative;
  min-width: 50%;
  border-radius: 4px;
  font-size: 14px;
  padding: 0px;
  margin: 10px 30px;
  &:focus {
    background: rgb(59, 59, 59);
  }
  &_lua {
    border: 1px solid rgba(98, 150, 170, 0.5);
    background: rgb(17, 30, 36);
    .dialogue-answers-answer-results__result {
      color: rgb(159, 169, 223);
    }
  }

  &__editor {
    .cm-editor {
      height: auto;
    }
  }
}

.script-language {
  background: rgba(170, 169, 98, 0.2);
  width: 100%;
  display: block;
  color: rgb(237, 238, 167);
  padding: 5px 10px;
  font-size: 16px;
  font-weight: 500;
  &_lua {
    color: rgb(167, 236, 238);
    background: rgba(98, 150, 170, 0.2);
  }
}
</style>
