<template>
  <div class="record-book" :class="{
    'record-book_scroll': selectedRecord.data.book_type === 'Scroll',
    'record-book_book': selectedRecord.data.book_type === 'Book'
  }">
    <div class="record-book__title">
      {{ selectedRecord.name }}
    </div>
    <div class="record-book__text" v-html="parsedText">
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed } from 'vue';

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord?.[0] || {});

function parseText(text: String) {
  let newText = text;
  newText = newText.replace(/magic cards/gi, 'pelagiad');
  return newText;
}

const parsedText = computed(() => parseText(selectedRecord.value.text));
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
  height: 100%;
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
</style>