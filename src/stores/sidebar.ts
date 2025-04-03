import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useSidebar = defineStore('sidebar', () => {
  const activeItem = ref('Journal');
  function setActiveItem(itemKey: string) {
    if (activeItem.value === itemKey) {
      activeItem.value = '';
    } else {
      activeItem.value = itemKey;
    }
  }
  const getActiveItem = computed(() => activeItem.value);

  return { activeItem, setActiveItem, getActiveItem };
});
