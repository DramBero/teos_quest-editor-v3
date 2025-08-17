import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { fetchQuestByID } from '@/api/idb.js';

export const useSelectedQuest = defineStore('selectedQuest', () => {
  interface selectedQuest {
    entries: Array<Object>;
    entry_ids: Array<number>;
    name: String;
    old_names: String[];
  }
  const selectedQuest = ref<selectedQuest>();
  function setSelectedQuest(value: selectedQuest) {
    selectedQuest.value = value;
  }
  const getSelectedQuest = computed(() => selectedQuest.value);

  const selectedQuestLoaded = ref<Boolean>();
  function setSelectedQuestLoaded(value: Boolean) {
    selectedQuestLoaded.value = value;
  }
  const getSelectedQuestLoaded = computed(() => selectedQuestLoaded.value);

  async function fetchQuest(questId: String) {
    try {
      setSelectedQuestLoaded(false);
      const questResponse = await fetchQuestByID(questId);
      setSelectedQuest(questResponse);
      setSelectedQuestLoaded(true);
    } catch (error) {
      console.error(error);
    }
  } 

  return { 
    selectedQuest, 
    selectedQuestLoaded, 
    setSelectedQuest, 
    setSelectedQuestLoaded, 
    fetchQuest, 
    getSelectedQuest,
    getSelectedQuestLoaded,
  };
});
