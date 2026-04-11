import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { fetchQuestByID, fetchAllQuestIDs } from '@/api/idb.ts';
import { logger } from '@/services/logger';
import type { DialogueInfoRecord } from '@/types/pluginEntries';

export const useSelectedQuest = defineStore('selectedQuest', () => {
  interface SelectedQuest {
    entries: DialogueInfoRecord[];
    entry_ids: string[];
    name: string;
    old_names: string[];
  }

  interface FetchQuestOptions {
    reload?: boolean;
    fetchQuests?: boolean;
    updateName?: boolean;
  }

  const selectedQuest = ref<SelectedQuest>();
  function setSelectedQuest(value: SelectedQuest) {
    selectedQuest.value = value;
  }
  const getSelectedQuest = computed(() => selectedQuest.value);

  const selectedQuestLoaded = ref<boolean>();
  function setSelectedQuestLoaded(value: boolean) {
    selectedQuestLoaded.value = value;
  }
  const getSelectedQuestLoaded = computed(() => selectedQuestLoaded.value);

  const selectedQuestName = ref<string | null>();
  function setSelectedQuestName(value: string | null) {
    logger.debug('Quest', `SET NAME: ${value}`)
    selectedQuestName.value = value;
  }
  const getSelectedQuestName = computed(() => selectedQuestName.value);

  async function fetchQuest(questId: string, options?: FetchQuestOptions) {
    try {
      if (options?.reload !== false) {
        setSelectedQuestLoaded(false);
      }
      const questResponse = await fetchQuestByID(questId);
      setSelectedQuest(questResponse);
      if (options?.reload !== false) {
        setSelectedQuestLoaded(true);
      }
      if (options?.fetchQuests !== false) {
        fetchQuests();
      }
      if (options?.updateName !== false && questResponse.name) {
        setSelectedQuestName(questResponse.name);
      }
    } catch (error) {
      logger.error('Quest', 'Failed to fetch quest', error);
    }
  }

  const quests = ref<Record<string, unknown>[]>([]);
  async function fetchQuests() {
    try {
      const questsResponse = await fetchAllQuestIDs(true);
      quests.value = questsResponse;
    } catch (error) {
      logger.error('Quest', 'Failed to fetch quests', error);
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
