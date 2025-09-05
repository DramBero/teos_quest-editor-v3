<template>
  <transition name="fade">
    <div v-if="selectedRecord" class="record" @click="closeRecord">
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
          @click.stop
        />
      </div>
    </div>
  </transition>
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
  position: absolute;
  &__close {
    position: absolute;
    right: 10px;
    top: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    svg {
      color: rgb(202, 165, 96);
      width: 30px;
      height: 30px;
      transition: fill 0.15s ease-in;
      &:hover {
        color: rgb(223, 200, 157);
      }
    }
  }
  &__content {
    padding: 50px 0;
    height: 100%;
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