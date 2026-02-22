<template>
  <div
    class="dialogue-filters"
    @dragover.prevent
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @drop="handleDrop"
  >
    <DialogueEntryFilter 
      v-for="speakerType in !onlyFilters ? getOtherSpeakers : []"
      :key="speakerType.value + speakerType.type"
      filterType="speaker"
      :speaker="speakerType"
      @delete="handleDeleteSpeaker(speakerType.type)"
    />
    <DialogueEntryFilter 
      v-if="!onlyFilters && answer.data.disposition > 0"
      key="disposition"
      filterType="disposition"
      :disposition="answer.data.disposition"
      @update:disposition="handleUpdateDisposition"
      @delete="handleUpdateDisposition(0)"
    />

    <div class="filter-wrapper" v-for="(filter, index) in getFiltersByInfoId" :key="index">
      <div 
        v-if="filter.function === 'Choice'" 
        class="dialogue-filters__filter dialogue-filters__filter_choices filter-color--choice"
      >
        <div class="choice__id">
          {{ filter.value.data }}
        </div>
        <div class="choice__texts">
          <div 
            v-for="text in getChoiceFilters(Number(filter.value.data))" 
            :key="text" 
            class="choice__text"
          >
            {{ text }}
          </div>
        </div>
      </div>
      <DialogueEntryFilter 
        v-else
        filterType="filter"
        :filter="filter"
        @update:comparison="(comp) => handleUpdateFilter(index, { comparison: comp })"
        @update:value="(val) => handleUpdateFilter(index, { value: val })"
        @update:id="(id) => handleUpdateFilter(index, { id })"
        @update:filter-type="(ft, fn) => handleUpdateFilter(index, { filter_type: ft, function: fn })"
        @delete="handleDeleteFilter(index)"
      />
    </div>

    <div
      class="dialogue-filters__filter no-pointer-events"
      :key="'newFilter'"
      tabindex="0"
      v-if="dragOver"
    >
      <span class="filter__function">New filter...</span>
    </div>

    <button
      type="button"
      class="filter__add"
      :title="addButtonTooltip"
      :disabled="isAddDisabled"
      @click.prevent="handleAddFilter"
    >
      <TdesignAddCircle />
    </button>
  </div>
</template>

<script setup lang="ts">
import DialogueEntryFilter from '@/components/dialogue/DialogueEntryFilter.vue';
import { useJournalHighlight } from '@/stores/journalHighlights';
import { useSidebar } from '@/stores/sidebar';
import {
  addChoiceFilter,
  deleteFilter,
  addFilter,
  updateFilter,
  updateSpeakerField,
  updateEntryData,
} from '@/api/dialogue.ts';
import { computed, ref } from 'vue';
import TdesignAddCircle from '~icons/tdesign/add-circle';

import ContextMenu from '@imengyu/vue3-context-menu';

import type { InfoEntry } from '@/types/pluginEntries';
import { useFilterClipboard } from '@/stores/filterClipboard';

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

const emit = defineEmits<{
  (e: 'fetchTopic', topic: string): void;
}>();

const dragOver = ref<boolean>(false);
const filterClipboard = useFilterClipboard();

// ---------------------------------------------------------------------------
//  Computed helpers
// ---------------------------------------------------------------------------

const getFiltersByInfoId = computed(() => props.answer?.filters || []);

const slotsUsed = computed(() => getFiltersByInfoId.value.length);
const allSlotsFull = computed(() => slotsUsed.value >= 6);

const getOtherSpeakers = computed(() => {
  if (!props.answer) return [];
  return [
    { type: 'Speaker ID', value: props.answer.speaker_id },
    { type: 'Speaker Cell', value: props.answer.speaker_cell },
    { type: 'Speaker Faction', value: props.answer.speaker_faction },
    { type: 'Speaker Class', value: props.answer.speaker_class },
    {
      type: 'Speaker Sex',
      value: props.answer.data.speaker_sex !== 'Any' ? props.answer.data.speaker_sex : '',
    },
    {
      type: 'Speaker Rank',
      value: (props.answer.data as any).speaker_rank !== -1 ? (props.answer.data as any).speaker_rank : '',
    },
    { type: 'Speaker Race', value: props.answer.speaker_race },
    {
      type: 'Player Rank',
      value: (props.answer.data as any).player_rank !== -1 ? (props.answer.data as any).player_rank : '',
    },
    { type: 'Player Faction', value: (props.answer as any).player_faction },
  ].filter((val) => val.value && val.value !== props.speaker.speakerId);
});

// Speaker fields that are already set
const speakerIdSet = computed(() => !!props.answer?.speaker_id);
const speakerRaceSet = computed(() => !!props.answer?.speaker_race);
const speakerClassSet = computed(() => !!props.answer?.speaker_class);
const speakerFactionSet = computed(() => !!props.answer?.speaker_faction);
const speakerCellSet = computed(() => !!props.answer?.speaker_cell);
const playerFactionSet = computed(() => !!(props.answer as any)?.player_faction);

const isAddDisabled = computed(() => {
  // Fully disabled only when all slots + all fields are filled
  return allSlotsFull.value
    && speakerIdSet.value
    && speakerRaceSet.value
    && speakerClassSet.value
    && speakerFactionSet.value
    && speakerCellSet.value
    && playerFactionSet.value
    && props.answer.data.disposition > 0
    && !filterClipboard.hasFilter;
});

const addButtonTooltip = computed(() => {
  if (isAddDisabled.value) return 'All filter slots and speaker fields are set';
  return `Filters: ${slotsUsed.value}/6 slots used`;
});

// ---------------------------------------------------------------------------
//  Choice filters
// ---------------------------------------------------------------------------

const getUniqueTopicChoices = computed(() => {
  const topicChoices = [...props.topicChoices];
  let topicChoiceIds = [...new Set(topicChoices.map(val => val.id))];
  topicChoiceIds = topicChoiceIds.sort((a, b) => a - b);
  return topicChoiceIds.map((topicId: number) => ({
    id: topicId,
    texts: topicChoices.filter(val => val.id === topicId).map(val => val.text),
  }));
});

const getTopicChoiceLabels = computed(() =>
  getUniqueTopicChoices.value.map(val => ({
    label: `${val.id}: ${val.texts[0]}`,
    disabled: getFiltersByInfoId.value.some(
      f => f.function === 'Choice' && f.value?.data === val.id,
    ),
    onClick: () => handleAddChoiceFilter(val.id),
  })),
);

function getChoiceFilters(choiceId: number) {
  const texts = props.topicChoices
    .filter(val => val.id === choiceId)
    .map(val => val.text);
  return [...new Set(texts)];
}

// ---------------------------------------------------------------------------
//  Filter CRUD handlers
// ---------------------------------------------------------------------------

function refreshTopic() {
  emit('fetchTopic', props.answer.TMP_topic);
}

async function handleAddChoiceFilter(choiceId: number) {
  await addChoiceFilter(props.answer.TMP_info_id, choiceId);
  refreshTopic();
}

async function handleDeleteFilter(filterIndex: number) {
  await deleteFilter(props.answer.TMP_info_id, filterIndex);
  refreshTopic();
}

async function handleUpdateFilter(
  filterIndex: number,
  patch: Partial<{
    comparison: string;
    id: string;
    value: { type: string; data: number | string };
    filter_type: string;
    function: string;
  }>,
) {
  await updateFilter(props.answer.TMP_info_id, filterIndex, patch);
  refreshTopic();
}

async function handleAddGenericFilter(filterData: {
  filter_type: string;
  function: string;
  comparison: string;
  id: string;
  value: { type: string; data: number | string };
}) {
  await addFilter(props.answer.TMP_info_id, filterData);
  refreshTopic();
}

async function handleUpdateDisposition(value: number) {
  await updateEntryData(props.answer.TMP_info_id, { disposition: value });
  refreshTopic();
}

async function handleDeleteSpeaker(speakerType: string) {
  const SPEAKER_FIELD_MAP: Record<string, string> = {
    'Speaker ID': 'speaker_id',
    'Speaker Race': 'speaker_race',
    'Speaker Class': 'speaker_class',
    'Speaker Faction': 'speaker_faction',
    'Speaker Cell': 'speaker_cell',
    'Player Faction': 'player_faction',
  };
  const DATA_FIELD_MAP: Record<string, Record<string, unknown>> = {
    'Speaker Sex': { speaker_sex: 'Any' },
    'Speaker Rank': { speaker_rank: -1 },
    'Player Rank': { player_rank: -1 },
  };

  const field = SPEAKER_FIELD_MAP[speakerType];
  if (field) {
    await updateSpeakerField(
      props.answer.TMP_info_id,
      field as 'speaker_id' | 'speaker_race' | 'speaker_class' | 'speaker_faction' | 'speaker_cell' | 'player_faction',
      '',
    );
  } else if (DATA_FIELD_MAP[speakerType]) {
    await updateEntryData(props.answer.TMP_info_id, DATA_FIELD_MAP[speakerType] as Record<string, number | string>);
  }
  refreshTopic();
}

async function handleAddSpeakerField(
  field: 'speaker_id' | 'speaker_race' | 'speaker_class' | 'speaker_faction' | 'speaker_cell' | 'player_faction',
  defaultValue = '',
) {
  const value = defaultValue || prompt(`Enter ${field}:`) || '';
  if (!value) return;
  await updateSpeakerField(props.answer.TMP_info_id, field, value);
  refreshTopic();
}

async function handleAddDataField(
  field: 'disposition' | 'speaker_rank' | 'player_rank',
  defaultValue = 1,
) {
  const raw = prompt(`Enter ${field}:`, String(defaultValue));
  if (raw === null) return;
  const value = parseInt(raw, 10);
  if (isNaN(value)) return;
  await updateEntryData(props.answer.TMP_info_id, { [field]: value });
  refreshTopic();
}

async function handleAddSpeakerSex() {
  const raw = prompt('Enter sex (Male / Female):', 'Male');
  if (!raw) return;
  const normalized = raw.trim();
  if (normalized !== 'Male' && normalized !== 'Female') return;
  await updateEntryData(props.answer.TMP_info_id, { speaker_sex: normalized });
  refreshTopic();
}

async function handlePasteFilter() {
  const copied = filterClipboard.getCopiedFilter;
  if (!copied) return;
  await handleAddGenericFilter({
    filter_type: copied.filter_type,
    function: copied.function,
    comparison: copied.comparison,
    id: copied.id,
    value: { type: copied.value?.type ?? 'Integer', data: copied.value?.data ?? 0 },
  });
}

// ---------------------------------------------------------------------------
//  Filter creation helpers (for ⊕ context menu onClick)
// ---------------------------------------------------------------------------

function makeFilterFunction(fn: string, defaultValue = 0) {
  return () => handleAddGenericFilter({
    filter_type: 'Function',
    function: fn,
    comparison: 'GreaterEqual',
    id: '',
    value: { type: 'Integer', data: defaultValue },
  });
}

function makeFilterType(filterType: string, fnName: string, id = '') {
  return () => handleAddGenericFilter({
    filter_type: filterType,
    function: fnName,
    comparison: 'GreaterEqual',
    id,
    value: { type: 'Integer', data: 0 },
  });
}

function makeWeatherFilter(weatherValue: number) {
  return () => handleAddGenericFilter({
    filter_type: 'Function',
    function: 'Weather',
    comparison: 'Equal',
    id: '',
    value: { type: 'Integer', data: weatherValue },
  });
}

// ---------------------------------------------------------------------------
//  ⊕ Context menu
// ---------------------------------------------------------------------------

function handleAddFilter(e: MouseEvent) {
  const slotDisabled = allSlotsFull.value;
  const speakerIdOverrides = speakerIdSet.value;

  const items = [];

  // Paste filter (top of menu if available)
  if (filterClipboard.hasFilter) {
    const pasteDisabled = slotDisabled; // pasted filters are always slot-based
    items.push({
      label: 'Paste filter',
      disabled: pasteDisabled,
      divided: true,
      onClick: handlePasteFilter,
    });
  }

  // ── Frequent conditions (top-level for quick access) ──

  // Choice (only if topic has choices)
  if (getTopicChoiceLabels.value.length) {
    items.push({
      label: 'Choice',
      disabled: slotDisabled,
      children: getTopicChoiceLabels.value.map(c => ({
        ...c,
        disabled: slotDisabled || c.disabled,
      })),
    });
  }

  items.push(
    {
      label: 'Journal',
      disabled: slotDisabled,
      onClick: () => makeFilterType('Journal', 'JournalType')(),
    },
    {
      label: 'Item',
      disabled: slotDisabled,
      onClick: () => makeFilterType('Item', 'ItemType')(),
    },
    {
      label: 'Dead',
      disabled: slotDisabled,
      onClick: () => makeFilterType('Dead', 'DeadType')(),
    },
    {
      label: 'Global',
      disabled: slotDisabled,
      onClick: () => makeFilterType('Global', 'Global')(),
    },
    {
      label: 'Local',
      disabled: slotDisabled,
      divided: true,
      onClick: () => handleAddGenericFilter({
        filter_type: 'Local',
        function: 'CompareLocal',
        comparison: 'GreaterEqual',
        id: '',
        value: { type: 'Float', data: 0 },
      }),
    },
  );

  // ── Disposition ──

  items.push({
    label: 'Disposition',
    disabled: props.answer.data.disposition > 0,
    onClick: () => handleAddDataField('disposition', 50),
  });

  // ── Speaker (who speaks) ──

  items.push({
    label: 'Speaker',
    children: [
      {
        label: 'Speaker ID',
        disabled: speakerIdSet.value,
        onClick: () => handleAddSpeakerField('speaker_id'),
      },
      {
        label: 'Speaker Cell',
        disabled: speakerCellSet.value,
        onClick: () => handleAddSpeakerField('speaker_cell'),
      },
      {
        label: 'Speaker Class',
        disabled: speakerClassSet.value || speakerIdOverrides,
        onClick: () => handleAddSpeakerField('speaker_class'),
      },
      {
        label: 'Speaker Faction',
        disabled: speakerFactionSet.value || speakerIdOverrides,
        onClick: () => handleAddSpeakerField('speaker_faction'),
      },
      {
        label: 'Speaker Race',
        disabled: speakerRaceSet.value || speakerIdOverrides,
        onClick: () => handleAddSpeakerField('speaker_race'),
      },
      {
        label: 'Speaker Rank',
        disabled: (props.answer.data as any).speaker_rank > 0,
        onClick: () => handleAddDataField('speaker_rank'),
      },
      {
        label: 'Speaker Sex',
        disabled: props.answer.data.speaker_sex !== 'Any',
        divided: true,
        onClick: () => handleAddSpeakerSex(),
      },
      {
        label: 'Not ID',
        disabled: slotDisabled,
        onClick: () => makeFilterType('NotId', 'NotIdType')(),
      },
      {
        label: 'Not Faction',
        disabled: slotDisabled,
        onClick: () => makeFilterType('NotFaction', 'NotFaction')(),
      },
      {
        label: 'Not Class',
        disabled: slotDisabled,
        onClick: () => makeFilterType('NotClass', 'NotClass')(),
      },
      {
        label: 'Not Race',
        disabled: slotDisabled,
        onClick: () => makeFilterType('NotRace', 'NotRace')(),
      },
      {
        label: 'Not Cell',
        disabled: slotDisabled,
        onClick: () => makeFilterType('NotCell', 'NotCell')(),
      },
    ],
  });

  // ── NPC stats ──

  items.push({
    label: 'NPC',
    disabled: slotDisabled,
    children: [
      { label: 'Health', disabled: slotDisabled, onClick: makeFilterFunction('HealthPercent') },
      { label: 'Level', disabled: slotDisabled, onClick: makeFilterFunction('Level') },
      { label: 'Reputation', disabled: slotDisabled, onClick: makeFilterFunction('Reputation') },
      { label: 'Werewolf', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('Werewolf') },
      { label: 'Same faction', disabled: slotDisabled, onClick: makeFilterFunction('SameFaction') },
      { label: 'Same race', disabled: slotDisabled, onClick: makeFilterFunction('SameRace') },
      { label: 'Same sex', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('SameSex') },
      { label: 'Detected', disabled: slotDisabled, onClick: makeFilterFunction('Detected') },
      { label: 'Alarmed', disabled: slotDisabled, onClick: makeFilterFunction('Alarmed') },
      { label: 'Attacked', disabled: slotDisabled, onClick: makeFilterFunction('Attacked') },
      { label: 'Talked to PC', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('TalkedToPc') },
      { label: 'Fight', disabled: slotDisabled, onClick: makeFilterFunction('Fight') },
      { label: 'Flee', disabled: slotDisabled, onClick: makeFilterFunction('Flee') },
      { label: 'Alarm', disabled: slotDisabled, onClick: makeFilterFunction('Alarm') },
      { label: 'Hello', disabled: slotDisabled, onClick: makeFilterFunction('Hello') },
      { label: 'Friend Hit', disabled: slotDisabled, onClick: makeFilterFunction('FriendHit') },
      { label: 'Should Attack', disabled: slotDisabled, onClick: makeFilterFunction('ShouldAttack') },
      { label: 'Creature Target', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('CreatureTarget') },
      { label: 'Faction Rank Diff', disabled: slotDisabled, onClick: makeFilterFunction('FactionRankDifference') },
      { label: 'Rank Requirement', disabled: slotDisabled, onClick: makeFilterFunction('RankRequirement') },
      { label: 'Reaction Low', disabled: slotDisabled, onClick: makeFilterFunction('ReactionLow') },
      { label: 'Reaction High', disabled: slotDisabled, onClick: makeFilterFunction('ReactionHigh') },
    ],
  });

  // ── Player stats ──

  items.push({
    label: 'Player',
    children: [
      { label: 'Health', disabled: slotDisabled, onClick: makeFilterFunction('PcHealth') },
      { label: 'Health %', disabled: slotDisabled, onClick: makeFilterFunction('PcHealthPercent') },
      { label: 'Magicka', disabled: slotDisabled, onClick: makeFilterFunction('PcMagicka') },
      { label: 'Level', disabled: slotDisabled, onClick: makeFilterFunction('PcLevel') },
      { label: 'Reputation', disabled: slotDisabled, onClick: makeFilterFunction('PcReputation') },
      { label: 'Bounty', disabled: slotDisabled, onClick: makeFilterFunction('PcCrimeLevel') },
      { label: 'Sex', disabled: slotDisabled, onClick: makeFilterFunction('PcSex') },
      { label: 'Gold', disabled: slotDisabled, onClick: makeFilterFunction('PcGold') },
      { label: 'Fatigue', disabled: slotDisabled, onClick: makeFilterFunction('PcFatigue') },
      { label: 'Expelled', disabled: slotDisabled, onClick: makeFilterFunction('PcExpelled') },
      {
        label: 'Attributes',
        disabled: slotDisabled,
        children: [
          { label: 'Strength', disabled: slotDisabled, onClick: makeFilterFunction('PcStrength') },
          { label: 'Intelligence', disabled: slotDisabled, onClick: makeFilterFunction('PcIntelligence') },
          { label: 'Willpower', disabled: slotDisabled, onClick: makeFilterFunction('PcWillpower') },
          { label: 'Agility', disabled: slotDisabled, onClick: makeFilterFunction('PcAgility') },
          { label: 'Speed', disabled: slotDisabled, onClick: makeFilterFunction('PcSpeed') },
          { label: 'Endurance', disabled: slotDisabled, onClick: makeFilterFunction('PcEndurance') },
          { label: 'Personality', disabled: slotDisabled, onClick: makeFilterFunction('PcPersonality') },
          { label: 'Luck', disabled: slotDisabled, onClick: makeFilterFunction('PcLuck') },
        ],
      },
      {
        label: 'Disease',
        disabled: slotDisabled,
        children: [
          { label: 'Common', disabled: slotDisabled, onClick: makeFilterFunction('PcCommonDisease') },
          { label: 'Blight', disabled: slotDisabled, onClick: makeFilterFunction('PcBlightDisease') },
          { label: 'Corprus', disabled: slotDisabled, onClick: makeFilterFunction('PcCorprus') },
        ],
      },
      {
        label: 'Skills',
        disabled: slotDisabled,
        children: [
          // Combat
          { label: 'Block', disabled: slotDisabled, onClick: makeFilterFunction('PcBlock') },
          { label: 'Armorer', disabled: slotDisabled, onClick: makeFilterFunction('PcArmorer') },
          { label: 'Heavy Armor', disabled: slotDisabled, onClick: makeFilterFunction('PcHeavyArmor') },
          { label: 'Medium Armor', disabled: slotDisabled, onClick: makeFilterFunction('PcMediumArmor') },
          { label: 'Blunt Weapon', disabled: slotDisabled, onClick: makeFilterFunction('PcBluntWeapon') },
          { label: 'Long Blade', disabled: slotDisabled, onClick: makeFilterFunction('PcLongBlade') },
          { label: 'Axe', disabled: slotDisabled, onClick: makeFilterFunction('PcAxe') },
          { label: 'Spear', disabled: slotDisabled, onClick: makeFilterFunction('PcSpear') },
          { label: 'Athletics', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('PcAthletics') },
          // Magic
          { label: 'Enchant', disabled: slotDisabled, onClick: makeFilterFunction('PcEnchant') },
          { label: 'Destruction', disabled: slotDisabled, onClick: makeFilterFunction('PcDestruction') },
          { label: 'Alteration', disabled: slotDisabled, onClick: makeFilterFunction('PcAlteration') },
          { label: 'Illusion', disabled: slotDisabled, onClick: makeFilterFunction('PcIllusion') },
          { label: 'Conjuration', disabled: slotDisabled, onClick: makeFilterFunction('PcConjuration') },
          { label: 'Mysticism', disabled: slotDisabled, onClick: makeFilterFunction('PcMysticism') },
          { label: 'Restoration', disabled: slotDisabled, onClick: makeFilterFunction('PcRestoration') },
          { label: 'Alchemy', disabled: slotDisabled, onClick: makeFilterFunction('PcAlchemy') },
          { label: 'Unarmored', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('PcUnarmored') },
          // Stealth
          { label: 'Security', disabled: slotDisabled, onClick: makeFilterFunction('PcSecurity') },
          { label: 'Sneak', disabled: slotDisabled, onClick: makeFilterFunction('PcSneak') },
          { label: 'Acrobatics', disabled: slotDisabled, onClick: makeFilterFunction('PcAcrobatics') },
          { label: 'Light Armor', disabled: slotDisabled, onClick: makeFilterFunction('PcLightArmor') },
          { label: 'Short Blade', disabled: slotDisabled, onClick: makeFilterFunction('PcShortBlade') },
          { label: 'Marksman', disabled: slotDisabled, onClick: makeFilterFunction('PcMarksman') },
          { label: 'Mercantile', disabled: slotDisabled, onClick: makeFilterFunction('PcMercantile') },
          { label: 'Speechcraft', disabled: slotDisabled, onClick: makeFilterFunction('PcSpeechcraft') },
          { label: 'Hand-to-Hand', disabled: slotDisabled, onClick: makeFilterFunction('PcHandToHand') },
        ],
      },
      { label: 'Vampire', disabled: slotDisabled, onClick: makeFilterFunction('PcVampire') },
      { label: 'Clothes on', disabled: slotDisabled, onClick: makeFilterFunction('PcClothingModifier') },
      { label: 'Werewolf kills', divided: true, disabled: slotDisabled, onClick: makeFilterFunction('WerewolfKills') },
      {
        label: 'Player Faction',
        disabled: playerFactionSet.value,
        onClick: () => handleAddSpeakerField('player_faction'),
      },
      {
        label: 'Player Rank',
        disabled: (props.answer.data as any).player_rank > 0,
        onClick: () => handleAddDataField('player_rank'),
      },
    ],
  });

  // ── Weather ──

  // ── Variables ──

  items.push({
    label: 'Variables',
    disabled: slotDisabled,
    children: [
      { label: 'Compare Global', disabled: slotDisabled, onClick: makeFilterFunction('CompareGlobal') },
      { label: 'Compare Local', disabled: slotDisabled, onClick: makeFilterFunction('CompareLocal') },
      { label: 'Variable Compare', disabled: slotDisabled, onClick: makeFilterFunction('VariableCompare') },
    ],
  });

  items.push({
    label: 'Weather',
    disabled: slotDisabled,
    children: [
      { label: 'Clear', disabled: slotDisabled, onClick: makeWeatherFilter(0) },
      { label: 'Cloudy', disabled: slotDisabled, onClick: makeWeatherFilter(1) },
      { label: 'Foggy', disabled: slotDisabled, onClick: makeWeatherFilter(2) },
      { label: 'Overcast', disabled: slotDisabled, onClick: makeWeatherFilter(3) },
      { label: 'Rain', disabled: slotDisabled, onClick: makeWeatherFilter(4) },
      { label: 'Thunder', disabled: slotDisabled, onClick: makeWeatherFilter(5) },
      { label: 'Ash', disabled: slotDisabled, onClick: makeWeatherFilter(6) },
      { label: 'Blight', disabled: slotDisabled, onClick: makeWeatherFilter(7) },
      { label: 'Snow', disabled: slotDisabled, onClick: makeWeatherFilter(8) },
      { label: 'Blizzard', disabled: slotDisabled, onClick: makeWeatherFilter(9) },
    ],
  });

  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items,
  });
}

// ---------------------------------------------------------------------------
//  Drag & Drop
// ---------------------------------------------------------------------------

const journalHighlightStore = useJournalHighlight();

function handleDragLeave(event: DragEvent) {
  const parent = event.currentTarget as HTMLElement;
  if (!parent?.contains(event.relatedTarget as Node)) {
    dragOver.value = false;
  }
}

function handleDragEnter() {
  dragOver.value = true;
}

function handleDrop(event: DragEvent) {
  dragOver.value = false;
  if (!event.dataTransfer) return;

  try {
    const transferedData = JSON.parse(event.dataTransfer.getData('application/json'));

    // Legacy path: already-formed filter payload (e.g. from journal)
    if (transferedData?.filter_type) {
      handleAddGenericFilter(transferedData);
      return;
    }

    // New path: sidebar element with draggable_type / draggable_id
    const dragType = transferedData?.draggable_type as string | undefined;
    const dragId   = (transferedData?.draggable_id ?? '') as string;
    if (!dragType) return;

    const actions = getSidebarDropActions(dragType, dragId);
    if (!actions || actions.length === 0) return;

    if (actions.length === 1) {
      // Single option — execute immediately
      actions[0].handler();
    } else {
      // Multiple options — show context menu at drop position
      ContextMenu.showContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: actions.map(a => ({
          label: a.label,
          onClick: a.handler,
        })),
      });
    }
  } catch {
    // Ignore invalid JSON
  }
}

// ── Item types that map to the "Item" filter ──
const ITEM_TYPES = new Set([
  'Book', 'Clothing', 'Armor', 'Weapon', 'MiscItem', 'RepairItem',
  'Apparatus', 'Lockpick', 'Probe', 'Ingredient', 'Alchemy',
]);

interface DropAction {
  label: string;
  handler: () => void;
}

/**
 * Map a sidebar record type + id to possible filter actions.
 */
function getSidebarDropActions(dragType: string, dragId: string): DropAction[] | null {
  // --- NPC ---
  if (dragType === 'Npc') {
    return [
      { label: 'Speaker ID',  handler: () => handleAddSpeakerField('speaker_id', dragId) },
      { label: 'Not ID',      handler: () => handleAddGenericFilter({ filter_type: 'NotId', function: 'NotIdType', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
      { label: 'Dead',        handler: () => handleAddGenericFilter({ filter_type: 'Dead', function: 'DeadType', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- Creature ---
  if (dragType === 'Creature') {
    return [
      { label: 'Dead', handler: () => handleAddGenericFilter({ filter_type: 'Dead', function: 'DeadType', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- Faction ---
  if (dragType === 'Faction') {
    return [
      { label: 'Speaker Faction', handler: () => handleAddSpeakerField('speaker_faction', dragId) },
      { label: 'Not Faction',     handler: () => handleAddGenericFilter({ filter_type: 'NotFaction', function: 'NotFaction', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
      { label: 'Player Faction',  handler: () => handleAddSpeakerField('player_faction', dragId) },
    ];
  }
  // --- Race ---
  if (dragType === 'Race') {
    return [
      { label: 'Speaker Race', handler: () => handleAddSpeakerField('speaker_race', dragId) },
      { label: 'Not Race',     handler: () => handleAddGenericFilter({ filter_type: 'NotRace', function: 'NotRace', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- Class ---
  if (dragType === 'Class') {
    return [
      { label: 'Speaker Class', handler: () => handleAddSpeakerField('speaker_class', dragId) },
      { label: 'Not Class',     handler: () => handleAddGenericFilter({ filter_type: 'NotClass', function: 'NotClass', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- Cell ---
  if (dragType === 'Cell') {
    return [
      { label: 'Speaker Cell', handler: () => handleAddSpeakerField('speaker_cell', dragId) },
      { label: 'Not Cell',     handler: () => handleAddGenericFilter({ filter_type: 'NotCell', function: 'NotCell', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- GlobalVariable ---
  if (dragType === 'GlobalVariable') {
    return [
      { label: 'Global', handler: () => handleAddGenericFilter({ filter_type: 'Global', function: 'Global', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 0 } }) },
    ];
  }
  // --- Item types ---
  if (ITEM_TYPES.has(dragType)) {
    return [
      { label: 'Item', handler: () => handleAddGenericFilter({ filter_type: 'Item', function: 'ItemType', comparison: 'GreaterEqual', id: dragId, value: { type: 'Integer', data: 1 } }) },
    ];
  }

  return null;
}
</script>

<style lang="scss">
.filter-color--choice {
  background: rgba(202, 140, 60, 0.22) !important;
  border-color: rgba(202, 140, 60, 0.35) !important;
}

.dialogue-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  &__filter {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 5px 10px;
    margin: 5px;
    color: rgba(255, 255, 255, 0.65);
    height: fit-content;
    width: fit-content;
    button {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      &:hover {
        background-color: rgba(255, 255, 255, 0.12);
      }
      svg {
        width: 16px;
        height: 16px;
      }
    }
    &_choices {
      display: flex;
      align-items: center;
      gap: 5px;
      border-color: rgba(202, 140, 60, 0.35);
      .choice {
        &__id {
          color: rgba(255, 255, 255, 0.9);
          background-color: rgba(202, 165, 96, 0.35);
          font-family: 'Fira Code', monospace;
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
          color: rgba(255, 255, 255, 0.7);
          border-top: solid 1px rgba(255, 255, 255, 0.12);
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
    color: rgb(120, 200, 130);
  }
  &__add {
    display: flex;
    align-items: center;
    margin-left: 7px;
    svg {
      width: 26px;
      height: 26px;
    }
    &:hover:not(:disabled) {
      svg {
        color: white;
      }
    }
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
  &-wrapper {
    display: flex;
    align-items: center;
  }
  &-delete {
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
  }
}

.no-pointer-events {
  pointer-events: none;
}
</style>
