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
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord[0]);

function parseText(text: String) {
  const blocks = text.split('<DIV');
  let newText = text;
  newText = newText.replace(/magic cards/gi, 'pelagiad');
  // newText = newText.replace(/<br\s*\/?>/gi, '\r\n');
  return newText;
}

const parsedText = computed(() => parseText(selectedRecord.value.text));
</script>
<style lang="scss">
.record-book {
  padding: 20px;
  max-width: 700px;
  margin: 0 auto;
  color: rgb(49, 44, 28);
  background-color: rgb(201, 190, 157);
  border-radius: 4px;
  &__title {
    font-size: 30px;
    margin-bottom: 20px;
    background-color: rgb(49, 44, 28);
    color: rgb(201, 190, 157);
    text-align: center;
    padding: 5px;
    border-radius: 4px;
  }
  &__text {
    font-size: 25px;
    width: 47ch;
    white-space: normal;
    overflow-wrap: break-word;
    margin: 0 auto;
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