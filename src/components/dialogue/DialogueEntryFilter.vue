<template>
  <div
    :class="['dialogue-filters__filter', filterColorClass]"
    tabindex="0"
    @focus="handleFilterClick"
    @blur="handleFocusOut"
  >
    <span class="filter__if">if </span>
    <span class="filter__function">{{ getFunctionName }} </span>

    <!-- ID zone — clickable text or search autocomplete -->
    <span
      v-if="hasIdField && !editingId"
      class="filter__id filter__editable"
      @click.stop="startEditId"
    >{{ getIdValue || '...' }}</span>
    <div
      v-if="hasIdField && editingId"
      class="filter__id-search-wrapper"
      @click.stop
    >
      <input
        ref="idInput"
        v-model="editIdValue"
        class="filter__id-input"
        type="text"
        :placeholder="searchTypes ? 'Search...' : ''"
        @blur="handleIdBlur"
        @keydown.enter.prevent="handleIdEnter"
        @keydown.escape="cancelEditId"
        @keydown.down.prevent="navigateResults(1)"
        @keydown.up.prevent="navigateResults(-1)"
        @input="onIdInput"
      />
      <ul
        v-if="searchResults.length > 0"
        class="filter__search-dropdown"
      >
        <li
          v-for="(result, i) in searchResults"
          :key="result.id"
          :class="['filter__search-item', { 'filter__search-item--active': i === activeResultIndex }]"
          @mousedown.prevent="selectResult(result)"
        >{{ result.id }}</li>
      </ul>
    </div>

    <!-- Comparison zone — cycle on click -->
    <span
      v-if="hasComparison"
      class="filter__comparison filter__editable"
      title="Click to change comparison"
      @click.stop="cycleComparison"
    >{{ getComparison }}</span>

    <!-- Value zone — inline number input or enum dropdown -->
    <span
      v-if="hasValue && !editingValue"
      class="filter__value filter__editable"
      @click.stop="startEditValue"
    >{{ getDisplayValue }}</span>
    <select
      v-if="hasValue && editingValue && enumOptions"
      ref="enumSelect"
      v-model="editValueData"
      class="filter__value-select"
      @change="commitValue"
      @blur="commitValue"
      @click.stop
    >
      <option v-for="opt in enumOptions" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <input
      v-if="hasValue && editingValue && !enumOptions"
      ref="valueInput"
      v-model.number="editValueData"
      class="filter__value-input"
      type="number"
      @blur="commitValue"
      @keydown.enter="commitValue"
      @keydown.escape="cancelEditValue"
      @click.stop
    />

    <!-- ⋮ context menu button -->
    <button class="filter__more" @click.stop="showFilterMenu">
      <TdesignMore />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { InfoFilter } from '@/types/pluginEntries';
import TdesignMore from '~icons/tdesign/more';

import { computed, ref, nextTick } from 'vue';
import { useSelectedQuest } from '@/stores/selectedQuest';
import { useJournalHighlight } from '@/stores/journalHighlights';
import { useFilterClipboard } from '@/stores/filterClipboard';
import { searchByType } from '@/api/search';
import ContextMenu from '@imengyu/vue3-context-menu';

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

const emit = defineEmits<{
  (e: 'update:comparison', comparison: string): void;
  (e: 'update:value', value: { type: string; data: number | string }): void;
  (e: 'update:id', id: string): void;
  (e: 'update:disposition', value: number): void;
  (e: 'update:speaker', field: string, value: string): void;
  (e: 'update:filterType', filterType: string, fn: string): void;
  (e: 'delete'): void;
}>();

// --- Color class by filter category ---

const PLAYER_FUNCTIONS = new Set([
  'PcHealth', 'PcHealthPercent', 'PcMagicka', 'PcLevel', 'PcReputation',
  'PcCrimeLevel', 'PcSex', 'PcGold', 'PcExpelled', 'PcVampire',
  'PcCommonDisease', 'PcBlightDisease', 'PcCorprus', 'PcClothingModifier',
  'PcStrength', 'PcIntelligence', 'PcWillpower', 'PcAgility',
  'PcSpeed', 'PcEndurance', 'PcPersonality', 'PcLuck', 'PcFatigue',
  'WerewolfKills',
  'PcAcrobatics', 'PcAlchemy', 'PcAlteration', 'PcArmorer', 'PcAthletics',
  'PcAxe', 'PcBlock', 'PcBluntWeapon', 'PcConjuration', 'PcDestruction',
  'PcEnchant', 'PcHandToHand', 'PcHeavyArmor', 'PcIllusion', 'PcLightArmor',
  'PcLongBlade', 'PcMarksman', 'PcMediumArmor', 'PcMercantile',
  'PcMysticism', 'PcRestoration', 'PcSecurity', 'PcShortBlade',
  'PcSneak', 'PcSpear', 'PcSpeechcraft', 'PcUnarmored',
]);

const NPC_FUNCTIONS = new Set([
  'HealthPercent', 'Level', 'Reputation', 'Werewolf',
  'SameFaction', 'SameRace', 'SameSex', 'Detected', 'Alarmed',
  'Attacked', 'TalkedToPc', 'Fight', 'Flee', 'Alarm', 'Hello',
  'FriendHit', 'ShouldAttack', 'CreatureTarget',
  'ReactionLow', 'ReactionHigh', 'RankRequirement', 'FactionRankDifference',
]);

const filterColorClass = computed(() => {
  if (props.filterType === 'disposition') return 'filter-color--disposition';
  if (props.filterType === 'speaker') return 'filter-color--speaker';
  if (props.filterType !== 'filter' || !props.filter) return '';

  const ft = props.filter.filter_type;
  const fn = props.filter.function;

  // Not* exclusion types
  if (ft.startsWith('Not')) return 'filter-color--not';

  // Type-based
  if (ft === 'Journal') return 'filter-color--journal';
  if (ft === 'Item') return 'filter-color--item';
  if (ft === 'Dead') return 'filter-color--dead';
  if (ft === 'Global') return 'filter-color--global';
  if (ft === 'Local') return 'filter-color--local';

  // Function-based
  if (fn === 'Choice') return 'filter-color--choice';
  if (fn === 'Weather') return 'filter-color--weather';
  if (fn === 'SameFaction' || fn === 'RankRequirement') return 'filter-color--faction';
  if (PLAYER_FUNCTIONS.has(fn)) return 'filter-color--player';
  if (NPC_FUNCTIONS.has(fn)) return 'filter-color--npc';

  return '';
});

// --- Comparisons ---

const COMPARISONS = [
  { id: 'Equal', text: ' == ' },
  { id: 'NotEqual', text: ' != ' },
  { id: 'Greater', text: ' > ' },
  { id: 'GreaterEqual', text: ' >= ' },
  { id: 'Less', text: ' < ' },
  { id: 'LessEqual', text: ' <= ' },
] as const;

const hasComparison = computed(() => {
  if (props.filterType === 'disposition') return false;
  if (props.filterType === 'speaker') return false;
  if (props.filterType === 'filter') {
    // Not* types don't have comparisons
    const ft = props.filter?.filter_type;
    if (ft && ft.startsWith('Not')) return false;
    return true;
  }
  return false;
});

const getComparison = computed(() => {
  if (props.filterType !== 'filter') return ' == ';
  return COMPARISONS.find(c => c.id === props.filter?.comparison)?.text ?? ' == ';
});

function cycleComparison() {
  if (props.filterType !== 'filter' || !props.filter) return;
  const currentIdx = COMPARISONS.findIndex(c => c.id === props.filter!.comparison);
  const nextIdx = (currentIdx + 1) % COMPARISONS.length;
  emit('update:comparison', COMPARISONS[nextIdx].id);
}

// --- Function name ---

const getFunctionName = computed(() => {
  if (props.filterType === 'filter') {
    if (props.filter?.filter_type === 'Function') {
      return props.filter?.function;
    }
    return props.filter?.filter_type;
  } else if (props.filterType === 'disposition') {
    return 'Disposition';
  } else if (props.filterType === 'speaker') {
    return props.speaker?.type;
  }
  return 'UNKNOWN';
});

// --- ID field ---

const ID_FILTER_TYPES = new Set([
  'Journal', 'Item', 'Dead', 'Global', 'Local', 'NotLocal',
  'NotId', 'NotFaction', 'NotClass', 'NotRace', 'NotCell',
]);

const FILTER_SEARCH_TYPES: Record<string, { types: string[]; dialogueType?: string }> = {
  Journal: { types: ['Dialogue'], dialogueType: 'Journal' },
  Item: {
    types: ['Book','Clothing','Armor','Weapon','MiscItem','RepairItem',
            'Apparatus','Lockpick','Probe','Ingredient','Alchemy'],
  },
  Dead: { types: ['Npc', 'Creature'] },
  Global: { types: ['GlobalVariable'] },
  NotId: { types: ['Npc', 'Creature'] },
  NotFaction: { types: ['Faction'] },
  NotClass: { types: ['Class'] },
  NotRace: { types: ['Race'] },
  NotCell: { types: ['Cell'] },
};

const hasIdField = computed(() => {
  if (props.filterType !== 'filter') return false;
  return ID_FILTER_TYPES.has(props.filter?.filter_type ?? '');
});

const searchTypes = computed(() => {
  const ft = props.filter?.filter_type ?? '';
  return FILTER_SEARCH_TYPES[ft] ?? null;
});

const getIdValue = computed(() => props.filter?.id ?? '');

const editingId = ref(false);
const editIdValue = ref('');
const idInput = ref<HTMLInputElement>();
const searchResults = ref<{ id: string }[]>([]);
const activeResultIndex = ref(-1);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function startEditId() {
  editIdValue.value = getIdValue.value;
  editingId.value = true;
  searchResults.value = [];
  activeResultIndex.value = -1;
  nextTick(() => {
    idInput.value?.focus();
    idInput.value?.select();
  });
}

function commitId() {
  editingId.value = false;
  searchResults.value = [];
  activeResultIndex.value = -1;
  if (editIdValue.value !== getIdValue.value) {
    emit('update:id', editIdValue.value);
  }
}

function cancelEditId() {
  editingId.value = false;
  searchResults.value = [];
  activeResultIndex.value = -1;
}

function handleIdBlur() {
  // Small delay to allow mousedown on results to fire first
  setTimeout(() => {
    if (editingId.value) commitId();
  }, 150);
}

function handleIdEnter() {
  if (activeResultIndex.value >= 0 && activeResultIndex.value < searchResults.value.length) {
    selectResult(searchResults.value[activeResultIndex.value]);
  } else {
    commitId();
  }
}

function selectResult(result: { id: string }) {
  editIdValue.value = result.id;
  commitId();
}

function navigateResults(direction: number) {
  if (searchResults.value.length === 0) return;
  activeResultIndex.value = Math.max(-1, Math.min(
    searchResults.value.length - 1,
    activeResultIndex.value + direction,
  ));
}

async function onIdInput() {
  if (!searchTypes.value) return; // plain text mode, no search
  const query = editIdValue.value;
  activeResultIndex.value = -1;

  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  if (!query || query.length < 2) {
    searchResults.value = [];
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      const results = await searchByType(
        searchTypes.value!.types,
        query,
        searchTypes.value!.dialogueType,
      );
      searchResults.value = results.map(r => ({ id: r.TMP_id }));
    } catch {
      searchResults.value = [];
    }
  }, 200);
}

// --- Value field ---

const WEATHER_OPTIONS = [
  { value: 0, label: 'Clear' },
  { value: 1, label: 'Cloudy' },
  { value: 2, label: 'Foggy' },
  { value: 3, label: 'Overcast' },
  { value: 4, label: 'Rain' },
  { value: 5, label: 'Thunder' },
  { value: 6, label: 'Ash' },
  { value: 7, label: 'Blight' },
  { value: 8, label: 'Snow' },
  { value: 9, label: 'Blizzard' },
];

const BOOL_OPTIONS = [
  { value: 0, label: 'No (0)' },
  { value: 1, label: 'Yes (1)' },
];

const SEX_OPTIONS = [
  { value: 0, label: 'Male (0)' },
  { value: 1, label: 'Female (1)' },
];

const BOOL_FUNCTIONS = new Set([
  'SameSex', 'SameRace', 'SameFaction', 'PcExpelled',
  'Alarmed', 'Attacked', 'ShouldAttack', 'Detected', 'TalkedToPc',
  'Werewolf', 'PcVampire', 'PcCommonDisease', 'PcBlightDisease', 'PcCorprus',
]);

const hasValue = computed(() => {
  if (props.filterType === 'disposition') return true;
  if (props.filterType === 'speaker') return false;
  if (props.filterType === 'filter') {
    const ft = props.filter?.filter_type;
    if (ft && ft.startsWith('Not')) return false;
    return true;
  }
  return false;
});

const enumOptions = computed(() => {
  if (props.filterType !== 'filter') return null;
  const fn = props.filter?.function;
  if (fn === 'Weather') return WEATHER_OPTIONS;
  if (fn === 'PcSex') return SEX_OPTIONS;
  if (fn && BOOL_FUNCTIONS.has(fn)) return BOOL_OPTIONS;
  return null;
});

const getDisplayValue = computed(() => {
  if (props.filterType === 'disposition') return props.disposition;
  if (props.filterType === 'speaker') return props.speaker?.value;
  if (props.filterType === 'filter') {
    const val = props.filter?.value?.data;
    // Show enum label for Weather
    if (props.filter?.function === 'Weather') {
      const opt = WEATHER_OPTIONS.find(o => o.value === val);
      return opt ? opt.label : val;
    }
    return val;
  }
  return '';
});

const editingValue = ref(false);
const editValueData = ref<number | string>(0);
const valueInput = ref<HTMLInputElement>();
const enumSelect = ref<HTMLSelectElement>();

function startEditValue() {
  if (props.filterType === 'disposition') {
    editValueData.value = props.disposition ?? 0;
  } else if (props.filter) {
    editValueData.value = props.filter.value?.data ?? 0;
  }
  editingValue.value = true;
  nextTick(() => {
    valueInput.value?.focus();
    valueInput.value?.select();
    enumSelect.value?.focus();
  });
}

function commitValue() {
  editingValue.value = false;
  const numValue = typeof editValueData.value === 'string'
    ? parseFloat(editValueData.value)
    : editValueData.value;

  if (props.filterType === 'disposition') {
    if (numValue !== props.disposition) {
      emit('update:disposition', numValue);
    }
    return;
  }

  if (props.filter) {
    const currentVal = props.filter.value?.data;
    if (numValue !== currentVal) {
      emit('update:value', {
        type: props.filter.value?.type ?? 'Integer',
        data: numValue,
      });
    }
  }
}

function cancelEditValue() {
  editingValue.value = false;
}

// --- Context menu (⋮) ---

const filterClipboard = useFilterClipboard();

// --- Not-toggle mapping ---
// Maps filter_type → its negated version and vice-versa
// Each entry: [filter_type, function] ↔ [negated_filter_type, negated_function]
const NOT_TOGGLE_MAP: Record<string, { filter_type: string; function: string }> = {
  // Normal → Not
  'Local': { filter_type: 'NotLocal', function: '' },
  // Not → Normal (reverse)
  'NotLocal': { filter_type: 'Local', function: 'CompareLocal' },
  'NotId': { filter_type: 'NotId', function: 'NotIdType' }, // no positive pair, stays Not
  'NotFaction': { filter_type: 'NotFaction', function: 'NotFaction' },
  'NotClass': { filter_type: 'NotClass', function: 'NotClass' },
  'NotRace': { filter_type: 'NotRace', function: 'NotRace' },
  'NotCell': { filter_type: 'NotCell', function: 'NotCell' },
};

// Only Local has a true toggle (Local ↔ NotLocal)
const NEGATABLE_TYPES = new Set(['Local']);
const DENEGATABLE_TYPES = new Set(['NotLocal']);

function showFilterMenu(e: MouseEvent) {
  const items = [];

  if (props.filterType === 'filter' && props.filter) {
    // Negate / Remove negation (only for Local ↔ NotLocal)
    const ft = props.filter.filter_type;
    if (NEGATABLE_TYPES.has(ft)) {
      const target = NOT_TOGGLE_MAP[ft];
      items.push({
        label: 'Negate (Not)',
        onClick: () => emit('update:filterType', target.filter_type, target.function),
      });
    } else if (DENEGATABLE_TYPES.has(ft)) {
      const target = NOT_TOGGLE_MAP[ft];
      items.push({
        label: 'Remove negation',
        onClick: () => emit('update:filterType', target.filter_type, target.function),
      });
    }

    items.push({
      label: 'Copy',
      onClick: () => filterClipboard.copyFilter(props.filter!),
    });
  }

  items.push({
    label: 'Delete',
    onClick: () => emit('delete'),
  });

  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items,
  });
}

// --- Journal highlight on focus ---

const selectedQuestStore = useSelectedQuest();
const journalHighlightStore = useJournalHighlight();

const getSelectedQuestId = computed(() => {
  if (!selectedQuestStore.getSelectedQuest) return '';
  if (!selectedQuestStore.getSelectedQuest.entries?.length) return '';
  return selectedQuestStore.getSelectedQuest.entries[0]?.TMP_topic ?? '';
});

async function handleFilterClick() {
  if (props.filterType === 'filter' && props.filter?.filter_type === 'Journal') {
    if (getSelectedQuestId.value !== props.filter?.id) {
      await selectedQuestStore.fetchQuest(props.filter?.id, {
        fetchQuests: true,
        updateName: true,
        reload: false,
      });
    }
    journalHighlightStore.setJournalHighlight(props.filter);
  }
}

function handleFocusOut() {
  journalHighlightStore.setJournalHighlight(null);
}
</script>

<style lang="scss" scoped>
// --- Filter color classes (light-on-dark) ---
// Each sets background + a slightly lighter border + light text
.filter-color {
  &--choice {
    background: rgba(202, 140, 60, 0.22) !important;
    border-color: rgba(202, 140, 60, 0.35) !important;
  }
  &--journal {
    background: rgba(80, 140, 180, 0.25) !important;
    border-color: rgba(80, 140, 180, 0.4) !important;
  }
  &--global {
    background: rgba(140, 100, 180, 0.22) !important;
    border-color: rgba(140, 100, 180, 0.35) !important;
  }
  &--local {
    background: rgba(140, 100, 180, 0.16) !important;
    border-color: rgba(140, 100, 180, 0.28) !important;
  }
  &--disposition {
    background: rgba(90, 160, 90, 0.2) !important;
    border-color: rgba(90, 160, 90, 0.33) !important;
  }
  &--item {
    background: rgba(170, 130, 70, 0.22) !important;
    border-color: rgba(170, 130, 70, 0.35) !important;
  }
  &--dead {
    background: rgba(180, 70, 70, 0.22) !important;
    border-color: rgba(180, 70, 70, 0.35) !important;
  }
  &--weather {
    background: rgba(100, 170, 210, 0.2) !important;
    border-color: rgba(100, 170, 210, 0.33) !important;
  }
  &--speaker {
    background: rgba(160, 140, 100, 0.22) !important;
    border-color: rgba(160, 140, 100, 0.35) !important;
  }
  &--player {
    background: rgba(70, 150, 140, 0.2) !important;
    border-color: rgba(70, 150, 140, 0.33) !important;
  }
  &--npc {
    background: rgba(200, 140, 80, 0.18) !important;
    border-color: rgba(200, 140, 80, 0.3) !important;
  }
  &--not {
    background: rgba(140, 100, 100, 0.2) !important;
    border-color: rgba(140, 100, 100, 0.33) !important;
  }
  &--faction {
    background: rgba(130, 130, 70, 0.22) !important;
    border-color: rgba(130, 130, 70, 0.35) !important;
  }
}

// --- Editable zones ---
.filter__editable {
  cursor: pointer;
  border-radius: 2px;
  padding: 1px 3px;
  border-bottom: 2px dashed rgba(255, 255, 255, 0.25);
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.12);
    border-bottom-color: rgba(255, 255, 255, 0.5);
  }
}

// --- Search wrapper ---
.filter__id-search-wrapper {
  position: relative;
  display: inline-block;
}

.filter__search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  max-height: 200px;
  overflow-y: auto;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  margin-top: 2px;
  padding: 2px 0;
  z-index: 1000;
  list-style: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.filter__search-item {
  padding: 4px 8px;
  cursor: pointer;
  color: #c9c9c9;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover,
  &--active {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
}

// --- Inputs (editing mode) ---
.filter__id-input,
.filter__value-input {
  font-size: inherit;
  font-family: inherit;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 0;
  color: inherit;
  padding: 1px 3px;
  max-width: 100px;
  outline: none;

  &:focus {
    border-bottom-color: rgba(255, 255, 255, 0.8);
  }
}

.filter__value-input {
  max-width: 60px;
}

.filter__value-select {
  font-size: inherit;
  font-family: inherit;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 0;
  color: inherit;
  padding: 1px 3px;
  outline: none;
  cursor: pointer;

  option {
    background: #1a1a1a;
    color: #c9c9c9;
  }
}

// --- More button (⋮) — same hover as editable ---
.filter__more {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.12);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}
</style>