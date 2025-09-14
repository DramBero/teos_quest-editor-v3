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
        :minWidth="300"
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
        <form class="window__content add-filter" @submit.prevent>
          <div>
            <label>
              <span>ID:</span>
              <input 
                type="text" 
                class="text-input" 
                placeholder="Enter text"
                :value="getId"
              />
            </label>
          </div>
          <div class="add-filter__comparisons">
            <button 
              type="button"
              @click="selectedComparison = 'Less'"
              class="comparison__btn"
              :class="{'comparison__btn_selected': selectedComparison === 'Less'}"
            >
              {{ '<' }}
            </button>
            <button 
              type="button"
              @click="selectedComparison = 'LessEqual'"
              class="comparison__btn"
              :class="{'comparison__btn_selected': selectedComparison === 'LessEqual'}"
            >
              {{ '<=' }}
            </button>
            <div class="comparison__column">
              <button 
                type="button"
                @click="selectedComparison = 'Equal'"
                class="comparison__btn"
                :class="{'comparison__btn_selected': selectedComparison === 'Equal'}"
              >
                {{ '==' }}
              </button>
              <button 
                type="button"
                @click="selectedComparison = 'NotEqual'"
                class="comparison__btn"
                :class="{'comparison__btn_selected': selectedComparison === 'NotEqual'}"
              >
                {{ '!=' }}
              </button>
            </div>
            <button 
              type="button"
              @click="selectedComparison = 'GreaterEqual'"
              class="comparison__btn"
              :class="{'comparison__btn_selected': selectedComparison === 'GreaterEqual'}"
            >
              {{ '>=' }}
            </button>
            <button 
              type="button"
              @click="selectedComparison = 'Greater'"
              class="comparison__btn"
              :class="{'comparison__btn_selected': selectedComparison === 'Greater'}"
            >
              {{ '>' }}
            </button>
          </div>
          <div>
            <label>
              <span>Value:</span>
              <input
                type="number"
                class="text-input"
                placeholder="Enter number"
                :value="getValue"
              />
            </label>
          </div>
          <button 
            type="submit"
          >
            Create
          </button>
        </form>
      </DraggableResizableVue>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectedFilter } from '@/stores/selectedFilter';
import { useWindowSize } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import TdesignClose from '~icons/tdesign/close';
import { DraggableResizableVue } from 'draggable-resizable-vue3';

const initW = 300;
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

const selectedComparison = ref<string>('');

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
  &__comparisons {
    display: flex;
    gap: 5px;
    align-items: center;
    width: 100%;
    justify-content: center;
    .comparison__btn {
      background-color: rgba(182, 145, 76, 0.3);
      color: black;
      padding: 3px 10px;
      min-width: 40px;
      border-radius: 4px;
      user-select: none;
      &:hover {
        background-color: rgba(182, 145, 76, 0.4);
      }
      &_selected {
        background-color: rgb(182, 145, 76);
        pointer-events: none;
      }
    }
    .comparison__column {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    span {
      font-size: 16px;
      user-select: none;
    }
    input {
      border: solid 1px rgb(182, 145, 76);
    }
  }
}
</style>
