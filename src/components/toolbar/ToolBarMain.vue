<template>
  <div>
    <div class="toolbar">
      <div class="file-controls">
        <ToolBarOpen />
        <!-- <ToolBarSave v-if="getTitle"/> -->
      </div>
      <div class="header-controls" v-if="getTitle">
        <div class="header-controls__title">
          {{ getTitle }}
        </div>
        <div class="header-controls__info"></div>
      </div>
      <div class="file-controls" v-if="false">
        <button class="open-btn">
          Header
        </button>
        <button class="open-btn">
          GMST
        </button>
      </div>
    </div>
    <div class="pseudoheader"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ToolBarOpen from './ToolBarOpen.vue';
import { usePluginHeader } from '@/stores/pluginHeader';

const pluginHeaderStore = usePluginHeader();
const getTitle = computed<string>(() => pluginHeaderStore.getPluginHeader?.TMP_dep || '');


</script>

<style lang="scss">
.toolbar {
  position: fixed;
  top: 0;
  width: 100%;
  height: 50px;
  background-color: #cb9;
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  z-index: 3;
  display: flex;
  font-family: 'Pelagiad';
}

.pseudoheader {
  height: 50px;
  width: 100vw;
}

.file-controls {
  height: 100%;
  display: flex;
}

.header-controls {
  margin-left: 50px;
  height: 100%;
  display: flex;
  align-items: center;

  &__title {
    font-size: 25px;
  }
}
</style>
