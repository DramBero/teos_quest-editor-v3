<template>
  <button 
    v-if="!props.selected"
    class="quest-tabs__tab" 
    :class="{
      'quest-tabs__tab_new': props.quest.TMP_is_active,
      'quest-tabs__tab_selected': props.selected,
    }"
    @click="selectTab"
  >
    <span >{{ questId }}</span>
  </button>
  <div
    v-else
    class="quest-tabs__tab" 
    :class="{
      'quest-tabs__tab_new': props.quest.TMP_is_active,
      'quest-tabs__tab_selected': props.selected,
    }"
  >
    <span>{{ questId }}</span>
  </div>
</template>

<script setup lang="ts">
import { useSelectedQuest } from '@/stores/selectedQuest';

import { computed, ref, watch } from 'vue';

const props = defineProps({
  quest: {
    type: Object,
    required: true,
    default: () => ({}),
  },
  selected: {
    type: Boolean,
    required: true,
    default: false,
  }
});

const emit = defineEmits(['select']);

const selectedQuestStore = useSelectedQuest();
const selectedQuest = computed(() => selectedQuestStore.getSelectedQuest);

function selectTab() {
  emit('select', props.quest.id)
}

const questId = ref<string>();

watch(() => props.quest?.id, (newValue: string) => {
  questId.value = newValue;
}, {
  immediate: true,
});
</script>