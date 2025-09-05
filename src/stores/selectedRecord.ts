import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useSelectedRecord = defineStore('selecledRecord', () => {
  const selectedRecord = ref<Object[]>();
  function setSelectedRecord(input: Object[]) {
    selectedRecord.value = input;
  }
  const getSelectedRecord = computed(() => selectedRecord.value);

  return { selectedRecord, setSelectedRecord, getSelectedRecord };
});


