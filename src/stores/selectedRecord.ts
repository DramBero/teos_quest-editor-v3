import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useSelectedRecord = defineStore('selecledRecord', () => {
  const selectedRecord = ref<Record<string, unknown>[]>();
  function setSelectedRecord(input: Record<string, unknown>[] | null) {
    selectedRecord.value = input ?? undefined;
  }
  const getSelectedRecord = computed(() => selectedRecord.value);

  return { selectedRecord, setSelectedRecord, getSelectedRecord };
});
