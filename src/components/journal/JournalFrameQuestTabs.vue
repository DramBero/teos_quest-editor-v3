<template>
  <div class="quest-tabs">
    <button 
      v-for="quest in props.quests" 
      :key="quest.id" 
      class="quest-tabs__tab" 
      :class="{
        'quest-tabs__tab_new': quest.TMP_is_active,
        'quest-tabs__tab_selected': model === quest.id,
      }"
      @click="model = quest.id"
    >
      {{ quest.id }}
      <!-- <TdesignMore /> -->
    </button>
<!--     <button class="quest-tabs__tab quest-tabs__tab_add">
      <TdesignAddCircle />
    </button> -->
  </div>
</template>

<script setup lang="ts">
import TdesignMore from '~icons/tdesign/more';
import TdesignAddCircle from '~icons/tdesign/add-circle';

interface QuestForTabs {
  id: string,
  TMP_is_active: boolean,
}

const props = defineProps<{
  quests: QuestForTabs[]
}>();

const model = defineModel<string>();
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
    &__tab {
      border-radius: 8px 8px 0 0;
      font-size: 16px;
      position: relative;
      padding: 5px;
      // box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.25);
      background-color: rgb(189, 172, 138);
      border: solid 2px rgb(189, 172, 138);
      transition: all .1s ease-in;
      display: flex;
      align-items: center;
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
        pointer-events: none;
        // background-color: rgb(240, 235, 214);
        // color: rgb(240, 235, 214);
        border: solid 2px rgb(240, 235, 214);
        &::after {
          background-color: rgb(240, 235, 214);
          @include dot-bg(rgb(240, 235, 214), rgb(240, 235, 214));
          border: solid 6px rgb(240, 235, 214);
        }
      }
      &_add {
        background-color: rgba(0, 0, 0, 0.7);
        border-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        &::after {
          background-color: rgba(0, 0, 0, 0.7) !important;
          background-image: none;
          border: none;
        }
        svg {
          color: rgba(202, 165, 96);
          height: 20px;
          width: 20px;
        }
      }
    }
  }
</style>