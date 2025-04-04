<template>
  <button class="open-btn" @click="toggleOpenModal">
    <GameIconsOpenFolder />
  </button>
</template>

<script setup lang="ts">
import { usePrimaryModal } from '@/stores/modals';

import GameIconsOpenFolder from '~icons/game-icons/open-folder';
const primaryModalStore = usePrimaryModal();
function toggleOpenModal() {
  primaryModalStore.setActiveModal('Upload');
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
