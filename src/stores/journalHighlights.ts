import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { InfoFilter } from '@/types/pluginEntries';

export const useJournalHighlight = defineStore('journalHighlight', () => {
  const journalHighlight = ref<InfoFilter | null>(null);
  function setJournalHighlight(filter: InfoFilter | null) {
    journalHighlight.value = filter;
  }
  const getJournalHighlight = computed(() => journalHighlight.value);

  return { journalHighlight, setJournalHighlight, getJournalHighlight };
});
