import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useSelectedFilter = defineStore('selectedFilter', () => {
  const selectedFilter = ref<Object | null>(null);
  function setSelectedFilter(input: Object | null) {
    selectedFilter.value = input;
  }
  const getSelectedFilter = computed(() => selectedFilter.value);

  return { selectedFilter, setSelectedFilter, getSelectedFilter };
});
