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

const props = withDefaults(defineProps<{
  quest: { id: string; TMP_is_active: boolean };
  selected: boolean;
}>(), {
  quest: () => ({ id: '', TMP_is_active: false }),
  selected: false,
});

const emit = defineEmits<{
  (e: 'select', id: string): void;
}>();

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