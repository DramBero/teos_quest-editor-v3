<template>
  <div
    class="dialogue-filters"
    @dragover.prevent
    @dragenter.prevent="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <template
      v-for="speakerType in !onlyFilters ? getOtherSpeakers : []"
      :key="speakerType.value + speakerType.type"
    >
      <div
        class="dialogue-filters__filter dialogue-filters__filter_speaker"
        tabindex="0"
      >
        <span class="filter__if">if </span>
        <span class="filter__function">{{ speakerType.type }} </span>
        <span class="filter__comparison">== </span>
        <span class="filter__value">{{ speakerType.value }}</span>
      </div>
      <button 
        class="filter-delete" 
        @click.stop="handleDeleteFilter(filter.index)" 
        aria-label="Delete filter"
        label="Delete filter"
      >
        <TdesignClose />
      </button>
    </template>

    <template
      v-if="!onlyFilters && answer.data.disposition > 0"
      key="disposition"
    >
      <div
        class="dialogue-filters__filter dialogue-filters__filter_disp"
        tabindex="0"
      >
        <span class="filter__if">if </span>
        <span class="filter__function">Disposition </span>
        <span class="filter__comparison">> </span>
        <span class="filter__value">{{ answer.data.disposition }}</span>
      </div>
      <button
        v-if="false"
        class="filter-delete" 
        @click.stop="handleDeleteFilter(filter.index)" 
        aria-label="Delete filter"
        label="Delete filter"
      >
        <TdesignClose />
      </button>
    </template>

    <div class="filter-wrapper" v-for="(filter, index) in getFiltersByInfoId" :key="index">
      <div 
        v-if="filter.function === 'Choice'" 
        class="dialogue-filters__filter dialogue-filters__filter_choices"
      >
        <div class="choice__id">
          {{ filter.value.data }}
        </div>
        <div class="choice__texts">
          <div 
            v-for="text in getChoiceFilters(filter.value.data)" 
            :key="text" 
            class="choice__text"
          >
            {{ text }}
          </div>
        </div>
      </div>
      <div
        v-else
        class="dialogue-filters__filter"
        tabindex="0"
        @click="handleFilter(filter)"
        @focusout="removeHighlight"
      >
        <span class="filter__if">if </span>
        <span class="filter__function">{{ filter.filter_type === 'Function' ? filter.function + ' ' : filter.filter_type + ' ' }}</span>
        <span class="filter__id">{{ filter.id }} </span>
        <span class="filter__comparison">{{ parseComparison(filter.comparison) }} </span>
        <span class="filter__value">{{ filter.value.data }}</span>
      </div>
      <button 
        class="filter-delete" 
        @click.stop="handleDeleteFilter(filter.index)" 
        aria-label="Delete filter"
        label="Delete filter"
      >
        <TdesignClose />
      </button>
    </div>

    <div class="dialogue-filters__filter" :key="'tempFilter'" tabindex="0" v-show="newFilterType">
      <span class="filter__if">if </span>
      <span class="filter__function">{{ newFilterType }} </span>
      <span class="filter__id">{{ newFilterTopic }} </span>
      <span class="filter__comparison">? </span>
      <span class="filter__value">{{ newFilterIndex }}</span>
      <span>
<!--         <icon
          v-if="editMode"
          @click.stop="editFilter(filter, index)"
          name="pen"
          class="filter__edit"
          scale="1"
        ></icon> -->
      </span>
      <div class="comparisons__overlay">
        <div
          @click.prevent
          ref="comparisonsElement"
          class="comparisons"
          @mouseleave="removeHighlight"
          tabindex="0"
          @focusout="removeTempFilter"
        >
          <span
            class="comparisons__item"
            v-for="comparison in comparisons"
            :key="comparison.id"
            @mouseover="comparisonOver(comparison.id)"
            @click="addDropFilter(comparison.id)"
          >
            {{ comparison.text }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="dialogue-filters__filter no-pointer-events"
      :key="'newFilter'"
      tabindex="0"
      v-if="dragOver && !newFilterType"
    >
      <span class="filter__function">New filter...</span>
    </div>

    <button
      v-if="false"
      type="button"
      class="filter__add"
      @click.prevent="handleAddFilter"
    >
      <TdesignAddCircle />
    </button>

<!--     <icon
      v-if="editMode && !newFilterType && !dragOver"
      @click="addFilter()"
      name="plus-circle"
      class="icon_gray"
      scale="1.5"
    ></icon> -->
  </div>
</template>

<script setup lang="ts">
import { useJournalHighlight } from '@/stores/journalHighlights';
import { useSidebar } from '@/stores/sidebar';
import { addChoiceFilter, deleteFilter } from '@/api/idb.js';
import { computed, ref } from 'vue';
import TdesignClose from '~icons/tdesign/close';
import TdesignAddCircle from '~icons/tdesign/add-circle';

import ContextMenu from '@imengyu/vue3-context-menu';

import type { InfoEntry } from '@/types/pluginEntries';

interface SpeakerData {
  speakerId: string;
  speakerType: string;
  speakerName: string;
}

interface TopicChoice {
  id: number;
  text: string;
  entryId: string;
}

const props = defineProps<{
  answer: InfoEntry;
  speaker: SpeakerData;
  onlyFilters: boolean;
  topicChoices: TopicChoice[];
}>();

const emit = defineEmits(['fetchTopic']);

const newFilterTopic = ref<string>('');
const newFilterIndex = ref<string>('');
const newFilterType = ref<string>('');

const dragOver = ref<boolean>(false);
const showComparisons = ref<boolean>(false);
const filterReactivityTrigger = ref<number>(0);

async function handleAddChoiceFilter(choiceId: number) {
  await addChoiceFilter(props.answer.TMP_info_id, choiceId);
  emit('fetchTopic', props.answer.TMP_topic);
}

async function handleDeleteFilter(filterIndex: number) {
  await deleteFilter(props.answer.TMP_info_id, filterIndex);
  emit('fetchTopic', props.answer.TMP_topic);
}

const getUniqueTopicChoices = computed(() => {
  const topicChoices = [...props.topicChoices];
  let topicChoiceIds = [...new Set(topicChoices.map(val => val.id))];
  topicChoiceIds = topicChoiceIds.sort((a, b) => a - b);
  return topicChoiceIds.map((topicId: number) => ({
    id: topicId,
    texts: topicChoices.filter((val) => val.id === topicId).map((val) => val.text),
  }))
})

const getTopicChoiceLabels = computed(() => {
  return getUniqueTopicChoices.value.map((val) => ({
    label: `${val.id}: ${val.texts[0]}`,
    onClick: () => handleAddChoiceFilter(val.id),
  }))
})

function handleAddFilter(e: MouseEvent) {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      { 
        label: "Choice",
        children: getTopicChoiceLabels.value,
      },
      { 
        label: "Player", 
        children: [
          { label: "Health" },
          { label: "Health percent" },
          { label: "Magicka" },
          { label: "Level" },
          { label: "Reputation" },
          { label: "Bounty" },
          { label: "Sex" },
          { label: "Attributes", 
            children: [
              { label: 'Strength' },
              { label: 'Intelligence' },
              { label: 'Willpower' },
              { label: 'Agility' },
              { label: 'Speed' },
              { label: 'Endurance' },
              { label: 'Personality' },
              { label: 'Luck' },
            ]
          },
          {
            label: 'Disease',
            children: [
              { label: 'Common' },
              { label: 'Blight' },
              { label: 'Corprus' }
            ]
          },
          { label: 'Vampire' },
          { label: 'Clothes on' },
          { label: 'Werewolf kills' },
          { label: 'Gold' },
        ]
      },
      { 
        label: "Local",

      },
      { 
        label: "Weather",
        children: [
          { label: 'Clear' },
          { label: 'Cloudy' },
          { label: 'Foggy' },
          { label: 'Overcast' },
          { label: 'Rain' },
          { label: 'Thunder' },
          { label: 'Ash' },
          { label: 'Blight' },
          { label: 'Snow' },
          { label: 'Blizzard' },
        ],
      },
      { 
        label: "NPC",
        children: [
          { label: "Health" },
          { label: "Health percent" },
          { label: "Magicka" },
          { label: "Level" },
          { label: "Reputation" },
          { label: "Werewolf" },
          { label: "Same faction" },
          { label: "Same race" },
          { label: "Same sex" },
        ],
      },
    ]
  }); 
}

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

function getChoiceFilters(choiceId: number) {
  const texts = props.topicChoices
    .filter(val => val.id === choiceId)
    .map(val => val.text);
  return [...new Set(texts)];
};

const getFiltersByInfoId = computed(() => {
  return props.answer?.filters || [];
})

const getOtherSpeakers = computed(() => {
  if (!props.answer) {
    return [];
  }
  return [
    {
      type: 'Speaker ID',
      value: props.answer.speaker_id,
    },
    {
      type: 'Speaker Cell',
      value: props.answer.speaker_cell,
    },
    {
      type: 'Speaker Faction',
      value: props.answer.speaker_faction,
    },
    {
      type: 'Speaker Class',
      value: props.answer.speaker_class,
    },
    {
      type: 'Speaker Sex',
      value: props.answer.data.speaker_sex !== 'Any' ? props.answer.data.speaker_sex : '',
    },
    {
      type: 'Speaker Rank',
      value: props.answer.data.speaker_rank !== -1 ? props.answer.data.speaker_rank : '',
    },
    {
      type: 'Speaker Race',
      value: props.answer.speaker_race,
    },
    {
      type: 'Player Rank',
      value: props.answer.data.player_rank !== -1 ? props.answer.data.player_rank : '',
    },
    {
      type: 'Player Faction',
      value: props.answer.player_faction,
    },
  ].filter((val) => val.value && val.value !== props.speaker.speakerId);
})

const journalHighlightStore = useJournalHighlight();
const sidebarStore = useSidebar();
function handleFilter(filter) {
  if (filter.function === 'JournalType') {
    if (sidebarStore.getActiveItem !== 'Journal') {
      sidebarStore.setActiveItem('Journal');
    }
    journalHighlightStore.setJournalHighlight(filter);
  } else {
    removeHighlight();
  }
}

function removeHighlight() {
  journalHighlightStore.setJournalHighlight(null);
}

function addFilter() {
  /*
      this.$store.commit('setSelectedFilter', {});
      this.$store.commit('setSelectedInfoId', this.answer.info_id);
      this.$store.commit('setSelectedFilterIndex', '');
      this.$store.commit('setPrimaryModal', 'NewFilter');
      this.filterReactivityTrigger++;
  */
}

function addDropFilter(comparison) {
/*
      if (this.newFilterType === 'Journal') {
        let filter = {
          comparison: comparison,
          function: 'JournalType',
          filter_type: 'Journal',
          id: this.newFilterTopic,
          value: {
            Integer: this.newFilterIndex,
          },
        };
        this.$store.commit('addFilter', [filter, this.answer.info_id]);
      }
      this.removeTempFilter();
      this.filterReactivityTrigger++;
*/
}

function editFilter(filter, index) {
  /*
      this.$store.commit('setSelectedFilter', filter);
      this.$store.commit('setSelectedInfoId', this.answer.info_id);
      this.$store.commit('setSelectedFilterIndex', index);
      this.$store.commit('setPrimaryModal', 'NewFilter');
  */
}

function parseComparison(comparison) {
  switch (comparison) {
    case 'Equal':
      return ' == ';
    case 'GreaterEqual':
      return ' >= ';
    case 'LessEqual':
      return ' <= ';
    case 'Less':
      return ' < ';
    case 'Greater':
      return ' > ';
    case 'NotEqual':
      return ' != ';
    default:
      return comparison;
  }
}

function handleDragLeave(event) {
  dragOver.value = false;
}

function handleDragEnter(event) {
  dragOver.value = true;
  //dialogue-filters
}

function handleDrop(event) {
/*
  if (event.dataTransfer.getData('type') === 'Journal') {
    this.dragOver = false;
    (this.newFilterTopic = event.dataTransfer.getData('topic')),
      (this.newFilterIndex = event.dataTransfer.getData('disposition'));
    this.newFilterType = event.dataTransfer.getData('type');
    this.showComparisons = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.$refs.comparisonsElement.focus();
  }
*/
}

function comparisonOver(comparison: string) {
  const filter = {
    id: newFilterTopic.value,
    value: {
      data: newFilterIndex.value,
      type: 'Integer',
    },
    comparison: comparison,
  };
  journalHighlightStore.setJournalHighlight(filter);
}

function removeTempFilter() {
  newFilterIndex.value = '';
  newFilterTopic.value = '';
  newFilterType.value = '';
}
</script>

<style lang="scss">
.dialogue-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  &__filter {
    display: inline-block;
    cursor: pointer;
    align-items: center;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    padding: 5px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    width: fit-content;
    //position: relative;
    &_disp {
      background: rgba(255, 255, 255, 0.2);
      color: rgb(185, 185, 166);
    }
    &_speaker {
      background: rgba(121, 105, 82, 0.6);
      color: rgb(185, 185, 166);
    }
    &_choices {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(165, 96, 96, 0.1);
      border: solid 1px rgba(165, 165, 165, 0.5);
      .choice {
        &__id {
          color: black;
          background-color: rgba(202, 165, 96, 0.8);
          font-family: 'Consolas';
          font-size: 14px;
          padding: 3px;
          border-radius: 5px;
          min-width: 20px;
          text-align: center;
        }
        &__texts {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        &__text {
          color: rgb(165, 96, 96);
          border-top: solid 1px rgba(165, 165, 165, 0.5);
          padding: 3px;
          &:first-child {
            border-top: none;
          }
        }
      }
    }
  }
}

.filter {
  &__if {
    color: rgb(56, 134, 60);
  }
  &__edit {
    margin-left: 15px;
    transition: all 0.2s ease-out;
    &:hover {
      fill: rgba(0, 0, 0, 0.5);
    }
  }
  &__add {
    display: flex;
    align-items: center;
    margin-left: 7px;
    svg {
      width: 26px;
      height: 26px;
    }
    &:hover {
      svg {
        color: white;
      }
    }
  }
  &-wrapper {
    display: flex;
    align-items: center;
  }
  &-delete {
    //padding: 5px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    svg {
      color: rgb(202, 96, 96);
    }
    &:hover {
      svg {
        color: white;
      }
    }
    &__icon {
      fill: rgb(202, 165, 96);
    }
  }
}

.comparisons {
  /*   position: absolute;
  top: 0;
  left: 0; */
  //transform: translate(50%, -50%);
  //z-index: 2;
  //width: 200px;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.8);
  border: 2px solid rgb(202, 165, 96);
  border-radius: 8px;
  //padding: 15px;
  align-items: center;
  justify-content: stretch;
  overflow: hidden;
  &__overlay {
    position: fixed;
    width: 100%;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  &__item {
    color: rgb(185, 185, 166);
    padding: 5px 50px;
    width: 100%;
    text-align: center;
    cursor: pointer;
    transition: all 0.05s linear;
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
      //color: black;
    }
  }
}

.no-pointer-events {
  pointer-events: none;
}
</style>
