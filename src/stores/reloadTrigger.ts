import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useReloadTrigger = defineStore('reloadTrigger', () => {
  const reload = ref<boolean>(false);
  async function triggerReload() {
    reload.value = true;
    await new Promise((resolve) => setTimeout(resolve, 10));
    reload.value = false;
  }
  const getReloadTrigger = computed(() => reload.value);

  return { reload, triggerReload, getReloadTrigger };
});
