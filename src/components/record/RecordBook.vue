<template>
  <div class="record-book" :class="{
    'record-book_scroll': selectedRecord.data.book_type === 'Scroll',
    'record-book_book': selectedRecord.data.book_type === 'Book'
  }">
    <div class="record-book__title">
      {{ selectedRecord.name }}
    </div>
    <div class="record-book__text" v-sanitize-html="{ html: parseText(parsedText), options: sanitizeOptions }">
    </div>
  </div>
  <div class="book-editor">
    <Codemirror
      v-model:value="parsedText"
      :options="cmOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed, ref, watch } from 'vue';
import sanitize from 'sanitize-html';

import Codemirror from "codemirror-editor-vue3";
import "codemirror/mode/htmlmixed/htmlmixed.js";
import "codemirror/theme/dracula.css";
import { modifyEntry } from '@/api/idb.js';

import { watchDebounced } from '@vueuse/core';

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord?.[0] || {});

const sanitizeOptions: sanitize.IOptions = {
  allowedTags: ['div', 'br', 'font', 'img', 'span'],
  allowedAttributes: {
    'div': ['align', 'color'],
    'font': ['face', 'size', 'color'],
    'img': ['src', 'width', 'height'],
    'span': ['class'],
  }
}

function parseText(text: String) {
  let newText = text;
  newText = newText.replace(/magic cards/gi, 'pelagiad');
  newText = newText.replace(/%[\w]+(?=\W|$)/g, (match) => {
    return `<span class="variable">${match}</span>`;
  });
  return newText;
}

const cmOptions = {
  mode: 'text/html',
  theme: 'dracula',
  lineWrapping: true,
}

const parsedText = ref<String>();
watch(selectedRecord, () => {
  parsedText.value = selectedRecord.value.text;
})

watchDebounced(parsedText, (newValue) => {
  modifyEntry({
    TMP_index: selectedRecord.value.TMP_index,
    text: newValue,
  });
}, {
  debounce: 200,
});

</script>
<style lang="scss">
.record-book {
  padding: 20px 0;
  max-width: 700px;
  margin: 0 auto;
  color: rgb(49, 44, 28);
  // background-color: rgb(201, 190, 157);
  background-image: url('/images/paper-texture.jpg');
  border-radius: 4px;
  height: 60%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  &__title {
    font-size: 30px;
    background-color: rgba(49, 44, 28, 0.9);
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    padding: 5px;
    width: 100%;
  }
  &__text {
    font-size: 25px;
    width: 47ch;
    white-space: normal;
    overflow-wrap: break-word;
    height: 100%;
    overflow-y: scroll;
    font {
      font-size: 25px !important;
    }
    img {
      border: dashed 3px black;
    }
    &::-webkit-scrollbar {
      &-thumb {
        background-color: rgb(58, 45, 20) !important;
      }

      &-trail {
        background-color: rgba(58, 45, 20, 0.2);
      }
    }
    .variable {
      color: rgb(59, 167, 150);
    }
  }
  &_scroll {
    .record-book__text {
    }
  }
  &_book {
    .record-book__text {
      width: 29ch;
    }
  }
}

.book-editor {
  width: 100%;
  height: 40%;
  position: absolute;
  bottom: 0;
  left: 1;
  background-color: white;
  .CodeMirror {
    font-size: 16px;
  }
}
</style>