<template>
  <button class="open-btn" @click="savePlugin">
    <GameIconsSave />
  </button>
</template>

<script setup lang="ts">
import { usePrimaryModal } from '@/stores/modals';
import { pluginToJSON } from '@/api/idb.ts';
import { save_objects } from '@/tes3_wasm/tes3_wasm.js';
import GameIconsSave from '~icons/game-icons/save';
import { computed } from 'vue';
import { usePluginHeader } from '@/stores/pluginHeader';

const pluginHeaderStore = usePluginHeader();
const getTitle = computed<string>(() => pluginHeaderStore.getPluginHeader?.TMP_dep || '');

async function savePlugin() {
  try {
    const plugin = await pluginToJSON();
    const file = save_objects(plugin);

    const blob = new Blob([file], { type: 'application/octet-stream' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getTitle.value;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
  }
}
</script>

<style lang="scss">
.open-btn {
  font-family: 'Pelagiad';
  font-size: 23px;
  display: flex;
  align-items: center;
  padding: 10px 15px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.2);

  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
