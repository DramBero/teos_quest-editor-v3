import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useSelectedSpeaker = defineStore('selecledSpeaker', () => {
  const selecledSpeaker = ref<Object>({});
  function setSelectedSpeaker(input: Object) {
    selecledSpeaker.value = input;
  }
  const getSelectedSpeaker = computed(() => selecledSpeaker.value);

  return { selecledSpeaker, setSelectedSpeaker, getSelectedSpeaker };
});
