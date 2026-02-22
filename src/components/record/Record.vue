<template>
  <transition name="fade">
    <div
      v-if="selectedRecord"
      class="record"
      :class="{
        'record_overlay': isOverlayType,
        'record_inline': !isOverlayType,
      }"
      @click="isOverlayType && closeRecord()"
    >
      <div class="record__content" @click.stop>
        <component
          :is="getSelectedComponent"
          @click.stop
        />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed, defineAsyncComponent } from 'vue';

const RecordBook = defineAsyncComponent(
  () => import('@/components/record/RecordBook.vue')
);

const RecordScript = defineAsyncComponent(
  () => import('@/components/record/RecordScript.vue')
);

const selectedRecordStore = useSelectedRecord();
const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord);

const recordType = computed(() => {
  if (!selectedRecord.value || !selectedRecord.value.length) return null;
  return selectedRecord.value[0]?.type;
});

/** Script fills the right area inline; Book is an overlay */
const isOverlayType = computed(() => recordType.value === 'Book');

const getSelectedComponent = computed(() => {
  switch(recordType.value) {
    case 'Book': return RecordBook;
    case 'Script': return RecordScript;
    default: return null;
  }
});

function closeRecord(){
  selectedRecordStore.setSelectedRecord(null);
}
</script>

<style lang="scss">
.record {
  &__content {
    height: 100%;
  }

  /* Script — fills right area inline next to sidebar */
  &_inline {
    flex: 1;
    min-width: 0;
    height: 100%;
    position: relative;
    z-index: 1;

    .record__content {
      padding: 0;
    }
  }

  /* Book — full overlay with dim background */
  &_overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 50;

    .record__content {
      padding: 10px 0;
    }
  }
}

.fade-enter-to,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0, 0, 0.2, 1);
  opacity: 1;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>