<template>
  <div class="record" v-if="selectedRecord">
    <button
      type="button"
      class="record__close"
      @click="closeRecord"
    >
      <TdesignClose />
    </button>
    <div class="record__content">
      <component
        :is="getSelectedComponent"
      />
    </div>
  </div>
  <div v-else>

  </div>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed, defineAsyncComponent } from 'vue';
import TdesignClose from '~icons/tdesign/close';

const RecordBook = defineAsyncComponent(
  () => import('@/components/record/RecordBook.vue')
);

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord);

const getSelectedComponent = computed(() => {
  if (!selectedRecord.value && !selectedRecord.value.length) return null;
  switch(selectedRecord.value[0]?.type) {
    case 'Book': return RecordBook;
    default: return null;
  }
});

function closeRecord(){
  selectedRecordStore.setSelectedRecord(null);
}
</script>

<style lang="scss">
.record {
  width: 100%;
  height: 100%;
  background-color: rgb(201, 190, 157);
  position: absolute;
  &__close {
    position: absolute;
    right: 10px;
    top: 10px;
    svg {
      height: 30px;
      width: 30px;
    }
  }
  &__content {
    padding-top: 50px;
    height: 100%;
    overflow-y: scroll;
  }
}
</style>