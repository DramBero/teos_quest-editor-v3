import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { InfoFilter } from '@/types/pluginEntries';

export const useFilterClipboard = defineStore('filterClipboard', () => {
    const copiedFilter = ref<InfoFilter | null>(null);

    function copyFilter(filter: InfoFilter) {
        copiedFilter.value = JSON.parse(JSON.stringify(filter));
    }

    function clearFilter() {
        copiedFilter.value = null;
    }

    const getCopiedFilter = computed(() => copiedFilter.value);
    const hasFilter = computed(() => copiedFilter.value !== null);

    return { copiedFilter, copyFilter, clearFilter, getCopiedFilter, hasFilter };
});
