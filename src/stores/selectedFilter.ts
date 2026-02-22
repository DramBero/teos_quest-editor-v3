import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface SelectedFilterData {
  filter: {
    type?: string;
    entry?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const useSelectedFilter = defineStore('selectedFilter', () => {
  const selectedFilter = ref<SelectedFilterData | null>(null);
  function setSelectedFilter(input: SelectedFilterData | null) {
    selectedFilter.value = input;
  }
  const getSelectedFilter = computed(() => selectedFilter.value);

  return { selectedFilter, setSelectedFilter, getSelectedFilter };
});
