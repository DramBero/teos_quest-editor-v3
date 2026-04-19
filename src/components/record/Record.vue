<template>
  <transition name="fade">
    <div
      v-if="showRecord"
      class="record"
      :class="{
        'record_overlay': isOverlayType,
        'record_inline': !isOverlayType,
      }"
      @click="isOverlayType && closeRecord()"
    >
      <button v-if="!isOverlayType" class="record__close" @click="closeAll" title="Close">&times;</button>
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
import { useScriptTabs } from '@/stores/scriptTabs';
import { computed, defineAsyncComponent } from 'vue';

const RecordBook = defineAsyncComponent(
  () => import('@/components/record/RecordBook.vue')
);

const RecordScript = defineAsyncComponent(
  () => import('@/components/record/RecordScript.vue')
);

const selectedRecordStore = useSelectedRecord();
const scriptTabsStore = useScriptTabs();

const selectedRecord = computed(() => selectedRecordStore.getSelectedRecord);

const recordType = computed(() => {
  if (!selectedRecord.value || !selectedRecord.value.length) return null;
  return selectedRecord.value[0]?.type;
});

/** Script tabs are open — show script editor */
const hasScriptTabs = computed(() => scriptTabsStore.hasOpenTabs);

/** Show record panel if either script tabs are open or a book/other record is selected */
const showRecord = computed(() => hasScriptTabs.value || !!selectedRecord.value);

/** Script fills the right area inline; Book is an overlay */
const isOverlayType = computed(() => !hasScriptTabs.value && recordType.value === 'Book');

const getSelectedComponent = computed(() => {
  // Script tabs take priority
  if (hasScriptTabs.value) return RecordScript;
  switch(recordType.value) {
    case 'Book': return RecordBook;
    default: return null;
  }
});

function closeRecord(){
  selectedRecordStore.setSelectedRecord(null);
}

function closeAll() {
  scriptTabsStore.closeAll();
  selectedRecordStore.setSelectedRecord(null);
}
</script>

<style lang="scss">
.record {
  &__close {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 10;
    background: transparent;
    border: none;
    color: rgba(202, 165, 96, 0.6);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: rgba(202, 165, 96, 1);
      background: rgba(202, 165, 96, 0.1);
    }
  }

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