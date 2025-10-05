<template>
  <div>
    <div class="window" :class="{ window_dialogue: dialogue }">
      <DraggableResizableVue
        class="window-frame"
        :prevent-deactivation="true"
        v-model:w="w"
        v-model:h="h"
        v-model:x="x"
        v-model:y="y"
        :initW
        :initH
        :minHeight="500"
        :minWidth="400"
        :drag-handle="'.drag-handle'"
        :parent="true"
        :resizable="false"
      >
        <div class="window-header drag-handle">
          <div class="window-header__left"></div>
          <div class="window-header__name">
            {{ `Add filter` }}
          </div>
          <div class="window-header__right">
            <div class="window-header__close" @click="closeModal">
              <!-- <icon name="times" scale="1.3"></icon> -->
              <TdesignClose />
            </div>
          </div>
        </div>
        <div class="window__content add-filter" @submit.prevent>
          <Vueform :default="getDefaultValues">
            <SelectElement 
              name="function"
              label="Filter"
              :native="false"
              :items="[
                'Caius',
                'Vulpes'
              ]"
            />
            <UISearch 
              name="id"
              :searchTypes="[props.filter?.type || props.filter?.filter?.type]"
              :value="getId"
            />
            <ComparisonSelect 
              v-model="selectedComparison"
            />
            <TextElement 
              name="value"
              label="Value"
              input-type="number"
              :value="getValue"
            />
          </Vueform>
          <button 
            type="submit"
          >
            Create
          </button>
        </div>
      </DraggableResizableVue>
    </div>
  </div>
</template>

<script setup lang="ts">
type Comparison = 'Less' | 'LessEqual' | 'Equal' | 'NotEqual' | 'GreaterEqual' | 'Greater' | null;

import { useSelectedFilter } from '@/stores/selectedFilter';
import { useWindowSize } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import TdesignClose from '~icons/tdesign/close';
import { DraggableResizableVue } from 'draggable-resizable-vue3';
import ComparisonSelect from '@/components/ComparisonSelect.vue';
import UISearch from '@/components/ui/UISearch.vue';

const initW = 400;
const initH = 500;

const w = ref<number>(initW);
const h = ref<number>(initH);
const x = ref<number>(0);
const y = ref<number>(0);

const windowSize = useWindowSize();
const getInitCenter = computed(() => {
  const initX = Math.round(windowSize.width.value / 2) - Math.round(initW / 2);
  const initY = Math.round(windowSize.height.value / 2) - Math.round(initH / 2);
  return { initX, initY }
});

onMounted(() => {
  x.value = getInitCenter.value.initX;
  y.value = getInitCenter.value.initY;
})

const selectedComparison = ref<Comparison>(null);

const props = defineProps<{
  filter: Object | null;
}>();

const selectedFilterStore = useSelectedFilter();
function closeModal() {
  selectedFilterStore.setSelectedFilter(null);
}

const getId = computed(() => {
  if (!props.filter?.filter) {
    return null;
  }
  switch(props.filter?.filter?.type) {
    case 'Journal': return props.filter.filter.entry?.TMP_topic;
    default: return props.filter.filter.entry?.TMP_id || null;
  }
});

const getValue = computed(() => {
  switch(props.filter?.filter?.type) {
    case 'Journal': return props.filter.filter.entry?.data?.disposition;
    default: return null;
  }
});

const getDefaultValues = computed(() => {
  return {
    id: getId.value,
    value: getValue.value,
  }
});
</script>

<style lang="scss">
.window {
  position: fixed;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 89;
  font-family: 'Pelagiad';
  font-size: 20px;
  color: rgb(202, 165, 96);
  &-frame {
    background-color: rgba(0, 0, 0, 0.95);
    box-shadow: 0px 0px 9px 5px rgba(0, 0, 0, 0.15);
    border: 2px solid rgb(202, 165, 96);
    border-radius: 4px;
    overflow: hidden;
    pointer-events: all;
  }
  &_dialogue {
    width: 70%;
    height: 70%;
  }
  &-header {
    background-color: rgba(0, 0, 0, 0);
    display: flex;
    justify-content: center;
    //border: 2px solid rgb(182, 145, 76);
    &__left {
      background-color: rgb(182, 145, 76);
      flex-grow: 1;
    }
    &__right {
      background-color: rgb(182, 145, 76);
      flex-grow: 1;
      position: relative;
    }
    &__name {
      background-color: rgba(0, 0, 0, 0);
      border-top: 2px solid rgb(182, 145, 76);
      border-radius: 2px;
      user-select: none;
      padding: 8px 20px;
      height: 35px;
      transition: all 0.2s ease-in;
    }
    &__close {
      color: black;
      display: flex;
      align-items: center;
      top: 1px;
      height: 99%;
      cursor: pointer;
      position: absolute;
      border: 2px solid rgb(202, 165, 96);
      user-select: none;
      background-color: rgb(202, 165, 96);
      border-radius: 4px;
      padding: 0 10px;
      right: 0px;
      &:hover {
        background-color: rgba(202, 165, 96, 0.3);
        color: rgba(0, 0, 0, 0.7);
      }
    }
  }
  &__content {
    border: 2px solid rgb(202, 165, 96);
    // padding: 5px;
    height: 100%;
    max-height: calc(100% - 35px);
  }
}

.fadeHeight-enter-active,
.fadeHeight-leave-active {
  transition: all 0.15s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fadeHeight-enter,
.fadeHeight-leave-to {
  opacity: 0%;
}

.add-filter {
  padding: 25px 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
