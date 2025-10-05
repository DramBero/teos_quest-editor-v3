<template>
  <SelectElement 
    :name="props.name"
    :label="getLabel"
    :placeholder="getLabel"
    :native="false"
    search
    :append-new-option="false"
    :delay="200"
    v-model="model"
    allow-absent
    :items="async function (query: string) {
      return await getItems(query)
    }"
    ref="select"
  />
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { searchByType } from '@/api/idb.ts';
import { filterInPlace } from '@tresjs/core/utils';

const props = defineProps<{
  searchTypes: string[];
  name: string;
  value: string;
}>();

const model = defineModel<string>('');

const select = useTemplateRef('select');

watch(() => props.value, () => {
  model.value = props.value || 'test';
  if (select.value) {
    select.value.update(props.value);
    //select.value.updateItems(true);
  }
}, {
  immediate: true,
})

const actorEntries = ['Npc', 'Creature'];
const itemEntries = [
  'Book',
  'Clothing',
  'Armor',
  'Weapon',
  'MiscItem',
  'RepairItem',
  'Apparatus',
  'Lockpick',
  'Probe',
  'Ingredient',
  'Alchemy',
];

const getLabel = computed(() => {
  if (!props.searchTypes) {
    return '';
  }
  if (props.searchTypes.length < 1) {
    return 'UNDEFINED';
  } else if (props.searchTypes[0] === 'journal') {
    return 'Quest ID';
  } else if (actorEntries.includes(props.searchTypes[0])) {
    return 'NPC/Creature';
  } else if (itemEntries.includes(props.searchTypes[0])) {
    return 'Item';
  } else {
    return props.searchTypes[0];
  }
});

async function getItems(query: string) {
  const searchString = query || props.value;
  if (searchString?.length > 2) {
    let speakerTypes = props.searchTypes;
    let dialogueType = '';
    if (props.searchTypes[0] === 'journal') {
      speakerTypes = ['Dialogue'];
      dialogueType = 'Journal';
    }
    const response = await searchByType(speakerTypes, searchString, dialogueType);
    console.log('RESPONSE:', response)
    return response.map(val => ({
      label: val.id,
      value: val,
    }))
  }
}
</script>