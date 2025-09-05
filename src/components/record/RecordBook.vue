<template>
  <div class="record-book">
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
  &__title {
    font-size: 25px;
    margin-bottom: 20px;
    background-color: rgb(49, 44, 28);
    color: rgb(201, 190, 157);
    text-align: center;
    padding: 5px;
    border-radius: 4px;
  }
  &__text {
    font {
      font-size: 20px !important;
    }
  }
}
</style>