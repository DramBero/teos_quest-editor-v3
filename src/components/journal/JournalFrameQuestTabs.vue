<template>
  <div class="quest-tabs">
    <JournalFrameQuestTabsItem 
      v-for="quest in props.quests" 
      :key="quest.id"
      :quest
      :selected="model === quest.id"
      @select="handleTabSelect"
    />
    <button
      type="button"
      class="quest-tabs__tab quest-tabs__tab_add" 
      @click="addQuest"
    >
      <TdesignAdd />
    </button>
  </div>
</template>

<script setup lang="ts">
import JournalFrameQuestTabsItem from '@/components/journal/JournalFrameQuestTabsItem.vue';
import { addJournalQuest } from '@/api/idb.js';
import TdesignClose from '~icons/tdesign/close';
import TdesignAdd from '~icons/tdesign/add';

interface QuestForTabs {
  id: string,
  TMP_is_active: boolean,
}

const props = defineProps<{
  quests: QuestForTabs[];
  questName: string;
}>();

const model = defineModel<string>();

function handleTabSelect(value: string) {
  model.value = value;
}

const emit = defineEmits(['update']);

async function addQuest() {
  try {
    await addJournalQuest('New_Quest', props.questName);
    emit('update');
  } catch (error) {
    console.error(error);
  }
}
</script>

<style lang="scss">
@mixin dot-bg($bg-color, $dot-color) {
  background-image: radial-gradient($dot-color 1px, transparent 1px), radial-gradient($dot-color 1px, transparent 1px);
  background-size: 10px 10px;
  background-position: 0 0, 5px 5px;
  background-color: $bg-color;
}

  .quest-tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    padding-top: 10px;
    overflow: hidden;
    &:hover {
      .quest-tabs__tab_add {
        opacity: 0.7;
      }
    }
    &__tab {
      border-radius: 8px 8px 0 0;
      font-size: 14px;
      position: relative;
      padding: 5px;
      // box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.25);
      background-color: rgb(189, 172, 138);
      border: solid 2px rgb(189, 172, 138);
      transition: all .1s ease-in;
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: 'Consolas';
      &::after {
        content: '';
        position: absolute;
        top: 100%;
        width: calc(100% + 4px);
        height: 200px;
        left: -2px;
        @include dot-bg(rgb(189, 172, 138), rgb(174, 158, 125));
        border: solid 6px rgb(189, 172, 138);
        box-sizing: border-box;
        pointer-events: none;
        // box-shadow: 2px 11px 2px 2px rgba(0, 0, 0, 0.25);
      }
      &:hover {
        transform: translateY(-3px);
      }
      &_new {
        background-color: rgb(112, 193, 130);
        border: solid 2px rgb(89, 170, 106);
        border-bottom: none;
        &::after {
          position: absolute;
          top: 100%;
          width: calc(100% + 4px);
          height: 200px;
          @include dot-bg(rgba(89, 170, 106, 1), rgb(78, 158, 95));
          border: solid 6px rgb(89, 170, 106);
          border-top: none;
          // box-shadow: 2px 11px 2px 2px rgba(0, 0, 0, 0.25);
          box-sizing: border-box;
        }
        &:hover {
          // background-color: rgba(89, 170, 106, 1);
        }
      }
      &_selected {
        // background-color: rgb(240, 235, 214);
        // color: rgb(240, 235, 214);
        border: solid 2px rgb(240, 235, 214);
        &::after {
          background-color: rgb(240, 235, 214);
          @include dot-bg(rgb(240, 235, 214), rgb(240, 235, 214));
          border: solid 6px rgb(240, 235, 214);
        }
        :hover {
          transform: none !important;
        }
      }
      &_add {
        background-color: rgb(202, 165, 96, 1);
        border-radius: 8px;
        border-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        opacity: 0;
        height: 25px;
        width: 25px;
        position: relative;
        margin: 5px;
        &::after {
          background-color: transparent;
          background-image: none;
          border: none;
        }
        &:hover {
          transform: none;
          background-color: rgb(202, 165, 96, 1);
          opacity: 1 !important;
        }
        svg {
          color: black;
          height: 20px;
          width: 20px;
        }
      }
    }
  }

  .tab {
    &__delete {
      // color: rgb(202, 96, 96);
      background-color: rgb(202, 96, 96);
      color: white;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      svg {
        width: 15px;
        height: 15px;
      }
    }
  }
</style>