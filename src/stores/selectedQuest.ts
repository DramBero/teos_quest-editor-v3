import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { fetchQuestByID, fetchAllQuestIDs } from '@/api/idb.js';

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

  const selectedQuestName = ref<String | null>();
  function setSelectedQuestName(value: String | null) {
    console.log('SET NAME:', value)
    selectedQuestName.value = value;
  }
  const getSelectedQuestName = computed(() => selectedQuestName.value);

  interface FetchQuestOptions {
    reload: boolean;
    fetchQuests: boolean;
    updateName: boolean;
  }

  async function fetchQuest(questId: String, options: FetchQuestOptions) {
    try {
      const questResponse = await fetchQuestByID(questId);
      setSelectedQuest(questResponse)
      if (Boolean(options?.reload !== false)) {
        setSelectedQuestLoaded(false);
      }
      if (Boolean(options?.fetchQuests) !== false) {
        fetchQuests();
      }
      if (Boolean(options?.updateName) !== false && questResponse.name) {
        setSelectedQuestName('');
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (options?.reload !== false) {
        setSelectedQuestLoaded(true);
      }
      if (Boolean(options?.updateName) !== false && questResponse.name) {
        setSelectedQuestName(questResponse.name);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const quests = ref<Object>([]);
  async function fetchQuests() {
    try {
      const questsResponse = await fetchAllQuestIDs(true);
      quests.value = questsResponse;
    } catch (error) {
      console.error(error);
    }
  }
  const getQuests = computed(() => quests.value);


  return { 
    selectedQuest, 
    selectedQuestLoaded, 
    setSelectedQuest, 
    setSelectedQuestLoaded, 
    fetchQuest, 
    getSelectedQuest,
    getSelectedQuestLoaded,
    selectedQuestName,
    setSelectedQuestName,
    getSelectedQuestName,
    quests,
    fetchQuests,
    getQuests,
  };
});
