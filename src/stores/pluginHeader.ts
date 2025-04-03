import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { HeaderEntry } from '@/types/pluginEntries.ts';

export const usePluginHeader = defineStore('pluginHeader', () => {
  const pluginHeader = ref<HeaderEntry | null>(null);
  function setPluginHeader(input: HeaderEntry) {
    pluginHeader.value = input;
  }
  const getPluginHeader = computed(() => pluginHeader.value);

  return { pluginHeader, setPluginHeader, getPluginHeader };
});
