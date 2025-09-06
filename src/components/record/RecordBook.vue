<template>
  <div class="record-book" :class="{
    'record-book_scroll': selectedRecord.data.book_type === 'Scroll',
    'record-book_book': selectedRecord.data.book_type === 'Book'
  }">
    <div class="record-book__title">
      {{ selectedRecord.name }}
    </div>
    <div 
      v-if="selectedRecord.data.book_type === 'Scroll'"
      class="record-book__text" 
      v-sanitize-html="{ html: parseText(parsedText), options: sanitizeOptions }"
    >
    </div>
    <div v-else-if="selectedRecord.data.book_type === 'Book'" class="record-book__book">
      <div 
        class="record-book__text record-book__page" 
        ref="leftPage"
        v-sanitize-html="{ html: parseText(pages[currentPage]), options: sanitizeOptions }"
      >
      </div>
      <div 
        class="record-book__text record-book__page" 
        ref="rightPage"
        v-sanitize-html="{ html: parseText(pages[currentPage + 1]), options: sanitizeOptions }"
      >
      </div>
      <button
        v-if="currentPage > 1"
        class="book-pagination book-pagination_prev"
        @click="currentPage = currentPage - 2"
      >
        <TdesignCaretLeft />
      </button>
      <button
        v-if="currentPage < (pages.length - 2)"
        class="book-pagination book-pagination_next"
        @click="currentPage = currentPage + 2"
      >
        <TdesignCaretRight />
      </button>
    </div>
  </div>
  <div class="book-editor">
    <div class="book-editor__header">

    </div>
    <Codemirror
      v-model:value="parsedText"
      :options="cmOptions"
    />
    <div class="book-editor__form" v-if="false">
      <input
        type="text"
        :value="selectedRecord.name"
      >
    </div>
  </div>
  <div class="measurer" ref="measurer" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import sanitize from 'sanitize-html';

import Codemirror from "codemirror-editor-vue3";
import "codemirror/mode/htmlmixed/htmlmixed.js";
import "codemirror/theme/dracula.css";
import { modifyEntry } from '@/api/idb.js';

import TdesignCaretRight from '~icons/tdesign/caret-right';
import TdesignCaretLeft from '~icons/tdesign/caret-left';

import { watchDebounced } from '@vueuse/core';

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord?.[0] || {});

const currentPage = ref<Number>(0);

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
  if (!newText) return '';
  newText = newText.replace(/magic cards/gi, 'pelagiad');
  newText = newText.replace(/--/g, '\u2011\u2011');
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
}, {
  immediate: true,
})

watchDebounced(parsedText, (newValue) => {
  modifyEntry({
    TMP_index: selectedRecord.value.TMP_index,
    text: newValue,
  });
}, {
  debounce: 200,
});

let resizeObserver = null;

const leftPage = useTemplateRef('leftPage');
const rightPage = ref(null);
const measurer = ref(null);

const pages = ref([]);
const pageIndex = ref(0);

function createPages() {
  pages.value = paginateHTML(parseText(parsedText.value || ''), measurer.value);
  // ensure pageIndex is valid and even (left page starts at even index 0)
  if (pageIndex.value >= pages.value.length) pageIndex.value = Math.max(0, pages.value.length - 2);
  if (pageIndex.value % 2 === 1) pageIndex.value--; // keep left on even index
}

function next() {
  if (pageIndex.value < pages.value.length - 2) pageIndex.value += 2;
}
function prev() {
  if (pageIndex.value >= 2) pageIndex.value -= 2;
}

function paginateHTML(htmlString: String, measureEl) {
  if (!measureEl) return [htmlString];
  // prepare measurer style/content
  measureEl.innerHTML = '';
  const words = htmlString.split(/(\s+)/); // keep spaces
  const pagesOut = [];
  let buffer = '';

  for (let i = 0; i < words.length; i++) {
    buffer += words[i];
    measureEl.innerHTML = buffer;
    // if overflow, backtrack: remove last token and finalize page
    if (measureEl.scrollHeight > measureEl.clientHeight) {
      // remove the last token that caused overflow
      const removed = words[i];
      buffer = buffer.slice(0, -removed.length);
      // trim and push
      pagesOut.push(buffer || '');
      // start new buffer with the removed token (if not pure whitespace)
      buffer = removed.trim() ? removed : '';
      // set measure to new buffer for next iteration
      measureEl.innerHTML = buffer;
    }
  }
  if (buffer.trim() || pagesOut.length === 0) pagesOut.push(buffer);
  return pagesOut;
}

function setupMeasurer() {
  if (!measurer.value) return;
  if (!leftPage.value) return;
  const style = getComputedStyle(leftPage.value);
  const m = measurer.value;
  // 26 400
  m.style.width = '27ch';
  m.style.height = '380px';
  m.style.font = style.font;
  m.style.fontSize = style.fontSize;
  m.style.lineHeight = style.lineHeight;
  m.style.whiteSpace = style.whiteSpace;
  m.style.letterSpacing = style.letterSpacing;
  m.style.wordSpacing = style.wordSpacing;
  m.style.overflow = 'scroll';
}

onMounted(() => {
  setupMeasurer();
  createPages();
});

watch(parsedText, () => {
  setupMeasurer();
  createPages();
}, {
  immediate: true,
});
</script>

<style lang="scss">
.measurer {
  opacity: 0;
  pointer-events: none;
}
.record-book {
  padding: 0 0 10px 0;
  max-width: 700px;
  margin: 0 auto;
  color: rgb(49, 44, 28);
  // background-color: rgb(201, 190, 157);
  background-image: url('/images/paper-texture.jpg');
  border-radius: 4px;
  max-height: 62%;
  overflow: hidden;
  display: flex;
  // justify-content: center;
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
  &__book {
    display: flex;
    gap: 20px;
    overflow: scroll;
  }
  &__text {
    font-size: 25px;
    width: 47ch;
    white-space: normal;
    overflow-wrap: break-word;
    height: 100%;
    overflow-y: scroll;
    letter-spacing: -0.2px;
    word-spacing: 0px;
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
    max-width: 650px;
    .record-book__text {
    }
  }
  &__page {
    height: 415px;
    width: 29ch;
    font-size: 19px !important;
    overflow: visible;
    font {
      font-size: 19px !important;
    }
  }
}

.book-editor {
  width: 100%;
  height: 38%;
  position: absolute;
  bottom: 0;
  left: 1;
  background-color: white;
  display: flex;
  .CodeMirror {
    font-size: 16px;
    // max-width: 800px;
  }
  &__form {
    // min-width: 400px;
  }
}

.book-pagination {
  position: absolute;
  top: 30%;
  transform: translateY(-50%);
  svg {
    width: 90px;
    height: 90px;
    color: rgb(202, 165, 96);
  }
  &_prev {
    left: 10px;
  }
  &_next {
    right: 10px;
  }
}
</style>