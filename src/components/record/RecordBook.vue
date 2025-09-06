<template>
  <div 
    class="record-book__wrapper"
    :class="{'record-book__wrapper_vertical-split': !getSidebarItem,}"
  >
    <div class="record-book" :class="{
      'record-book_scroll': isScroll,
      'record-book_book': !isScroll,
    }">
      <div class="record-book__title">
        {{ entry.name }}
      </div>
      <div 
        v-if="isScroll"
        class="record-book__text" 
        v-sanitize-html="{ html: parseText(parsedText), options: sanitizeOptions }"
      >
      </div>
      <div v-else-if="!isScroll" class="record-book__book">
        <div class="page-number page-number_left">
          {{ (currentPage * 2) + 1 }}
        </div>
        <div 
          class="record-book__text record-book__page" 
          ref="leftPage"
          v-sanitize-html="{ html: parseText(parsedText), options: sanitizeOptions }"
        >
        </div>
        <div 
          class="record-book__text record-book__page" 
          ref="rightPage"
          v-sanitize-html="{ html: parseText(parsedText), options: sanitizeOptions }"
        >
        </div>
        <button
          v-if="currentPage > 0"
          class="book-pagination book-pagination_prev"
          @click="currentPage = currentPage - 1"
        >
          <TdesignCaretLeft />
        </button>
        <button
          class="book-pagination book-pagination_next"
          @click="currentPage = currentPage + 1"
        >
          <TdesignCaretRight />
        </button>
        <div class="page-number page-number_right">
          {{ (currentPage * 2) + 2 }}
        </div>
      </div>
    </div>
    <div class="book-editor">
      <div class="book-editor__header">
        <input
          type="text"
          class="text-input"
          v-model="entry.name"
        >
        <div class="book-editor__controls">
          <button
            :class="{'btn_selected': currentTab === 'editor'}"
            @click="currentTab = 'editor'"
          >
            Editor
          </button>
          <button
            :class="{'btn_selected': currentTab === 'settings'}"
            @click="currentTab = 'settings'"
          >
            Settings
          </button>
        </div>
      </div>
      <Codemirror
        v-if="currentTab === 'editor'"
        v-model:value="parsedText"
        :options="cmOptions"
        :extensions
      />
      <div 
        v-if="currentTab === 'editor' && lintingProblems.length"
        class="status-bar"
        :class="`status-bar_${lintingProblems[0].type}`"
      >
        <div class="status-bar__icon">
          <TdesignErrorTriangle v-if="lintingProblems[0].type == 'warning'"/>
        </div>
        <div class="status-bar__line">
          Line {{ lintingProblems[0].line }}:
        </div>
        <div class="status-bar__text">
          {{ lintingProblems[0].text }}
        </div>
      </div>
      <div v-else-if="currentTab === 'settings'" class="form">
        <div class="form-field">
          <label>
            <span>Is a scroll:</span>
            <input
              type="checkbox"
              class="checkbox"
              :checked="isScroll"
              @input="handleIsScrollChange"
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Skill:</span>
            <input
              type="text"
              class="text-input"
              :value="selectedRecord.data.skill"
              disabled
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Script:</span>
            <input
              type="text"
              class="text-input"
              :value="selectedRecord.script || 'None'"
              disabled
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Enchanting:</span>
            <input
              type="text"
              class="text-input"
              :value="selectedRecord.enchanting || 'None'"
              disabled
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Enchantment:</span>
            <input
              type="number"
              class="text-input"
              :value="selectedRecord.data.enchantment"
              disabled
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Value:</span>
            <input
              type="number"
              class="text-input"
              :value="selectedRecord.data.value"
              disabled
            >
          </label>
        </div>
        <div class="form-field">
          <label>
            <span>Weight:</span>
            <input
              type="number"
              class="text-input"
              :value="getWeight"
              disabled
            >
          </label>
        </div>
      </div>
    </div>
  </div>
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
import TdesignErrorTriangle from '~icons/tdesign/error-triangle';

import { watchDebounced } from '@vueuse/core';
import { useSidebar } from '@/stores/sidebar';

const currentTab = ref<'editor' | 'settings'>('editor');

const sidebarStore = useSidebar();

const getSidebarItem = computed(() => {
  return sidebarStore.getActiveItem;
})

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord?.[0] || {});

const currentPage = ref<Number>(0);

const sanitizeOptions: sanitize.IOptions = {
  allowedTags: ['div', 'br', 'font', 'img', 'span', 'p'],
  allowedAttributes: {
    'div': ['align', 'color', 'class'],
    'font': ['face', 'size', 'color'],
    'img': ['src', 'width', 'height'],
    'span': ['class'],
  }
}

function parseText(text: String) {
  let newText = text;
  if (!newText) return '';
  // newText = newText.replace(/magic cards/gi, 'pelagiad');
  newText = newText.replace(/<p>/gi, '<br><br>');
  newText = newText.replace(/--/g, '\u2011\u2011');
  newText = newText.replace(/“/g, '"');
  newText = newText.replace(/”/g, '"');
  newText = newText.replace(/%[\w]+(?=\W|$)/g, (match) => {
    return `<span class="variable">${match}</span>`;
  });
  if (!isScroll.value) {
    newText = newText + '<div class="bottom-padding bottom-padding_book"></div>';
  } else {
    newText = newText + '<div class="bottom-padding"></div>';
  }
  return newText;
}

const cmOptions = {
  mode: 'text/html',
  theme: 'dracula',
  lineWrapping: true,
  spellcheck: true,
}

const getWeight = computed(() => {
  return Math.round(selectedRecord.value.data.weight * 100) / 100;
});

const parsedText = ref<String>();
const entry = ref<Object>({});
const isScroll = ref<Boolean>(false);
watch(selectedRecord, () => {
  parsedText.value = selectedRecord.value.text;
  currentPage.value = 0;
  entry.value = JSON.parse(JSON.stringify(selectedRecord.value));
  isScroll.value = selectedRecord.value.data?.book_type === 'Scroll';
}, {
  immediate: true,
});

watchDebounced(isScroll, (newValue) => {
  modifyEntry({
    TMP_index: selectedRecord.value.TMP_index,
    data: {
      ...selectedRecord.value.data,
      book_type: newValue ? 'Scroll' : 'Book',
    },
  });
}, {
  debounce: 200,
});

const lintingProblems = computed(() => {
  const problems = [];
  if (!parsedText.value) return [];
  const lines = parsedText.value.split(/\r\n|\n|\r/);
  for (let i = 0; i < lines.length; i++) {
    const col = lines[i].indexOf(' - ');
    if (col !== -1) {
      problems.push({
        key: 'hyphens',
        type: 'warning',
        text: 'Text contains single hyphens. Replace them with double hyphens (" - ").',
        line: i + 1,
        priority: 0,
      })
    }
  }
  return problems.sort((a, b) => b.priority - a.priority);
});

watchDebounced(parsedText, (newValue) => {
  modifyEntry({
    TMP_index: selectedRecord.value.TMP_index,
    text: newValue,
  });
}, {
  debounce: 200,
});

watchDebounced(entry, (newValue) => {
  modifyEntry({
    TMP_index: entry.value.TMP_index,
    name: entry.value.name,
  });
}, {
  debounce: 200,
  deep: true,
});

function handleIsScrollChange(event) {
  isScroll.value = event.target.checked;
}

const leftPage = useTemplateRef('leftPage');
const rightPage = useTemplateRef('rightPage');

const offset = -9;

async function updatePages() {
  await new Promise((resolve) => setTimeout(resolve, 1));
  if (isScroll.value === 'scroll') return;
  if (!rightPage.value || !leftPage.value) return;
  leftPage.value.scrollTop = (currentPage.value * 2) * leftPage.value.clientHeight - offset;
  rightPage.value.scrollTop = ((currentPage.value * 2) + 1) * rightPage.value.clientHeight - offset;
}

watch(currentPage, updatePages, {immediate: true});
watch(parsedText, updatePages, {immediate: true});
watch(isScroll, updatePages, {immediate: true});

// el.scrollTop = el.clientHeight;

</script>

<style lang="scss">
.measurer {
  opacity: 0;
  pointer-events: none;
}
.record-book {
  padding: 10px;
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  max-width: 700px;
  margin: 0 auto;
  color: rgb(49, 44, 28);
  // background-color: rgb(201, 190, 157);
  background-image: url('/images/paper-texture.jpg');
  border-radius: 4px;
  overflow: visible;
  display: flex;
  // justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  gap: 10px;  
  &__wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    .record-book {
      height: 60%;
      @media (max-width: 1500px) {
        max-height: 900px;
        transform: scale(0.8);
      }
    }
    .book-editor {
      height: 40%;
    }
    &_vertical-split {
      flex-direction: row;
      align-items: center;
      .record-book {
        height: fit-content;
        width: 50%;
        max-height: 100%;
        @media (max-width: 1500px) {
          transform: scale(1);
        }
      }
      .book-editor {
        margin: 10px;
        margin-top: 100px;
        height: 90%;
        width: 50%;
        border: solid 2px #cb9;
        border-radius: 4px;
      }
    }
  }
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
    // gap: 20px;
    overflow: hidden;
  }
  &__text {
    font-size: 25px;
    font-weight: 600;
    width: 50ch;
    white-space: normal;
    overflow-wrap: break-word;
    height: 100%;
    overflow-y: scroll;
    // letter-spacing: 0.3px;
    line-height: 22px;
    // word-spacing: 0px;
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
      line-height: 32px;
      min-height: 400px;
    }
  }
  &_book {
    max-width: 650px;
    .record-book__text {
    }
  }
  &__page {
    height: 440px;
    width: 269px;
    font-size: 19px !important;
    overflow: hidden;
    padding: 0 10px;
    box-sizing: content-box;
    &:nth-child(2) {
      border-right: solid 1px rgba(0, 0, 0, 0.5);
    }
    font {
      font-size: 19px !important;
    }
  }
}

.book-editor {
  background-color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  &__header {
    background-color: #cb9;
    display: flex;
    justify-content: space-between;
    gap: 2px;
    padding: 0 20px;
    .text-input {
      width: 400px;
      border-radius: 0;
      background-color: rgba(255, 255, 255, 0.2);
      color: black;
      font-size: 20px;
    }
    button {
      padding: 5px;
      font-size: 20px;
      background-color: rgba(255, 255, 255, 0.2);
    }
    .btn_selected {
      background-color: rgba(0, 0, 0, 0.7);
      color: #cb9;
    }
  }
  &__controls {
    display: flex;
    gap: 5px;
  }
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
  top: 50%;
  transform: translateY(-50%);
  height: 100%;
  &:hover {
    background-color: rgba(202, 165, 96, 0.1);
  }
  svg {
    width: 90px;
    height: 90px;
    color: rgb(202, 165, 96);
  }
  &_prev {
    left: -50px;
  }
  &_next {
    right: -50px;
  }
}

.bottom-padding {
  height: 40px;
  &_book {
    height: 440px;
  }
}

.form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-auto-rows: min-content;
  padding: 20px;
  font-size: 20px;
  gap: 15px;
  align-items: center;
  row-gap: 10px;
  background-color: rgba(204, 187, 153, 0.5);
  height: 100%;
  &-field {
    label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      input[type='checkbox'] {
        width: 20px;
        height: 20px;
      }
      &:has(input[type='checkbox']) {
        flex-direction: row;
        gap: 5px;
      }
    }
  }
}

.page-number {
  font-size: 20px;
  align-self: flex-end;
  width: 20px;
}

.status-bar {
  display: flex;
  gap: 10px;
  padding: 5px 10px;
  font-size: 14px;
  font-family: 'Consolas';
  background-color: rgb(68, 86, 121);
  border-top: solid 2px rgb(45, 97, 201);
  color: white;
  align-items: center;
  &_warning {
    background-color: rgb(101, 84, 60);
    border-top: solid 2px rgb(162, 122, 66);
    svg {
      color: rgb(255, 149, 0);
    }
  }
}
</style>