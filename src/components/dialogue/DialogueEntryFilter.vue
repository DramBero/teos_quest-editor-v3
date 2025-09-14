<template>
  <div
    class="dialogue-filters__filter"
    tabindex="0"
    @focus="handleFilterClick"
    @blur="handleFocusOut"
  >
    <span class="filter__if">if </span>
    <span class="filter__function">{{ getFunctionName }} </span>
    <span class="filter__comparison">{{ getComparison }} </span>
    <span class="filter__value">{{ getValue }}</span>
    <button>
      <TdesignMore />
    </button>
  </div>
  <button
    v-if="false"
    class="filter-delete" 
    aria-label="Delete filter"
    label="Delete filter"
  >
    <TdesignClose />
  </button>
</template>

<script setup lang="ts">
import type { InfoFilter } from '@/types/pluginEntries';
import TdesignClose from '~icons/tdesign/close';
import TdesignMore from '~icons/tdesign/more';


import { computed } from 'vue';
import { useSelectedQuest } from '@/stores/selectedQuest';
import { useJournalHighlight } from '@/stores/journalHighlights';

interface FilterSpeaker {
  type: string;
  value: string;
}

const props = defineProps<{
  filter?: InfoFilter;
  filterType: 'filter' | 'disposition' | 'speaker';
  speaker?: FilterSpeaker;
  disposition?: number;
}>();

const comparisons = [
  {
    id: 'Less',
    text: '<',
  },
  {
    id: 'LessEqual',
    text: '<=',
  },
  {
    id: 'Equal',
    text: '==',
  },
  {
    id: 'NotEqual',
    text: '!=',
  },
  {
    id: 'GreaterEqual',
    text: '>=',
  },
  {
    id: 'Greater',
    text: '>',
  },
]

const getComparison = computed(() => {
  if (props.filterType === 'filter') {
    const comparisonText = comparisons.find(val => val.id === props.filter?.comparison)?.text;
    return ` ${comparisonText} `;
  } else {
    return ' == '
  }
})

const getFunctionName = computed(() => {
  if (props.filterType === 'filter') {
    if (props.filter?.filter_type === 'Function') {
      return `${props.filter?.function} ${props.filter?.id}`;
    } else {
      return `${props.filter?.filter_type} ${props.filter?.id}`;
    }
  } else if (props.filterType === 'disposition') {
    return 'Disposition';
  } else if (props.filterType === 'speaker') {
    return props.speaker?.type;
  } else {
    return 'UNKNOWN';
  }
});

const getValue = computed(() => {
  if (props.filterType === 'filter') {
    return props.filter?.value.data;
  } else if (props.filterType === 'disposition') {
    return props.disposition;
  } else if (props.filterType === 'speaker') {
    return props.speaker?.value;
  } else {
    return 'UNKNOWN';
  }
});

const selectedQuestStore = useSelectedQuest();
const journalHighlightStore = useJournalHighlight();

const getSelectedQuestId = computed(() => {
  if (!selectedQuestStore.getSelectedQuest){
    return '';
  }
  if (!selectedQuestStore.getSelectedQuest.entries || !selectedQuestStore.getSelectedQuest.entries.length) {
    return '';
  } else {
    return selectedQuestStore.getSelectedQuest.entries[0]?.TMP_topic;
  }
})

async function handleFilterClick() {
  if (props.filterType === 'filter' && props.filter?.filter_type === 'Journal') {
    if (getSelectedQuestId.value !== props.filter?.id) {
      await selectedQuestStore.fetchQuest(props.filter?.id, {
        fetchQuests: true,
        updateName: true,
        reload: false
      });
    }
    journalHighlightStore.setJournalHighlight(props.filter);
  }

}

function handleFocusOut() {
  journalHighlightStore.setJournalHighlight(null);
}

</script>