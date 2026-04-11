<template>
  <button
    v-if="props.faction.length"
    type="button"
    class="faction draggable"
    :class="{'faction_selected': getSelectedRecord?.[0]?.id && getSelectedRecord?.[0]?.id === props.faction[0].id }"
    @click="handleSelect"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="faction-top">
      <div class="faction-left">
        <div class="faction__title">
          <TStatusDot :status="recordStatus" />
          <span :title="getName">
            {{ getName }}
          </span>
        </div>
        <span class="faction__id">{{ getId }}</span>
        <div 
          v-if="props.faction[0].type === 'GlobalVariable'"
          class="faction__gvar"
          @click.stop
        >
          <div class="faction__gvar-row">
            <input
              type="number"
              class="faction__gvar-value" 
              :value="props.faction[0].value?.data"
              :disabled="!isActiveEntry"
              :title="isActiveEntry ? 'Edit value' : 'Read-only (master file)'"
              @change="onGlobalValueChange($event)"
            />
            <select
              class="faction__gvar-type"
              :value="props.faction[0].value?.type"
              :disabled="!isActiveEntry"
              @change="onGlobalTypeChange($event)"
            >
              <option value="Short">Short</option>
              <option value="Long">Long</option>
              <option value="Float">Float</option>
            </select>
          </div>
        </div>
        <textarea 
          v-if="props.faction[0].type === 'GameSetting'"
          type="text" 
          disabled 
          :value="props.faction[0].value?.data"
        />
      </div>
      <div class="faction-right">
        <table class="faction-deps">
          <tbody>
            <tr v-for="dep in faction" :key="dep.TMP_dep">
              <td>
                {{ dep.TMP_dep }}
              </td>
            </tr>
          </tbody>
        </table>
        <button
          v-if="[
            'Npc',
            'Creature',
            'Cell',
            'Race',
            'Faction',
            'Class'
          ].includes(props.faction[0]?.type)"
          type="button"
          class="faction__message"
          @click.stop="openDialogue(props.faction[0])"
        >
          <TdesignChatMessageFilled />
        </button>
      </div>
    </div>
    <MagicEffects 
      v-if="['Enchanting', 'Spell', 'Alchemy'].includes(props.faction[0]?.type)"
      :effects="props.faction[0].effects"
    />
  </button>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { useScriptTabs } from '@/stores/scriptTabs';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed } from 'vue';
import TdesignChatMessageFilled from '~icons/tdesign/chat-message-filled';
import MagicEffects from './MagicEffects.vue';
import TStatusDot from '@/components/ui/TStatusDot.vue';
import { useRecordArrayStatus } from '@/composables/useRecordStatus';
import { collection } from '@/api/collection';
import { modifyEntry } from '@/api/import-export';
import type { BaseEntry } from '@/types/pluginEntries';

const props = defineProps<{
  faction: Record<string, unknown>[];
  modificator: string;
}>();

const { status: recordStatus } = useRecordArrayStatus(() => props.faction);

const isActiveEntry = computed(() => {
  return !!props.faction[0]?.TMP_is_active;
});

const selectedRecordStore = useSelectedRecord();
const scriptTabsStore = useScriptTabs();

async function handleSelect() {
  const type = props.faction[0]?.type;
  if (type === 'StartScript') {
    await openStartScriptTarget();
    return;
  }
  if (type === 'Script') {
    scriptTabsStore.openTab(props.faction[0]);
    return;
  }
  if (type !== 'Book') return;
  selectedRecordStore.setSelectedRecord(props.faction);
}

/** Look up the Script record referenced by a StartScript entry and open it */
async function openStartScriptTarget() {
  const entry = props.faction[0];
  const scriptName = entry?.script || entry?.id || '';
  if (!scriptName) return;
  const scripts = await collection({ type: 'Script' })
    .filter((s) => (s as Record<string, unknown>).id === scriptName)
    .first()
    .acrossPlugins();
  if (scripts) {
    const scriptEntry = Array.isArray(scripts) ? scripts[0] : scripts;
    if (scriptEntry) {
      scriptTabsStore.openTab(scriptEntry as Record<string, unknown>);
    }
  }
}

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  const entry = props.faction[0];
  const transferEntry = JSON.stringify({
    entry,
    type: entry?.type,
    draggable_type: entry?.type,
    draggable_id: entry?.TMP_id ?? entry?.id ?? '',
  })
  event.dataTransfer.setData("application/json", transferEntry);
}

function onDragEnd() {
}

const getSelectedRecord = computed(() => selectedRecordStore.getSelectedRecord);

const selectedSpeakerStore = useSelectedSpeaker();

const getSpeakerType = computed(() => {
  switch(props.faction[0]?.type) {
    case 'Npc':
    case 'Creature':
      return 'npc';
    default: return props.faction[0]?.type?.toLowerCase();
  }
})

function openDialogue(speaker: Record<string, unknown>) {
  selectedSpeakerStore.setSelectedSpeaker({
    speakerId: speaker.id || speaker.name,
    speakerType: getSpeakerType.value,
    speaker: speaker, 
  });
}

const getName = computed(() => {
  switch(props.faction[0]?.type) {
    case 'Skill': return props.faction[0].skill_id;
    case 'Cell': return props.faction[0].name || props.faction[0].region;
    case 'MagicEffect': return props.faction[0].effect_id;
    case 'Enchanting': return props.faction[0].id;
    case 'Script': return props.faction[0].id;
    case 'GlobalVariable': return props.faction[0].id;
    case 'StartScript': return props.faction[0].script || props.faction[0].id;
    default: return props.faction[0].name;
  } 
});

const getId = computed(() => {
  switch(props.faction[0]?.type) {
    case 'Cell': return `${props.faction[0]?.data?.grid?.[0]}:${props.faction[0]?.data?.grid?.[1]}`;
    case 'PathGrid': return `${props.faction[0]?.data?.grid?.[0]}:${props.faction[0]?.data?.grid?.[1]}`;
    case 'Landscape': return `${props.faction[0].grid?.[0]}:${props.faction[0].grid?.[1]}`;
    case 'MagicEffect': return props.faction[0].description;
    case 'Script': return '';
    case 'GlobalVariable': return '';
    case 'StartScript': return '⚡ Startup Script';
    default: return props.faction[0]?.id;
  }
})

// ---------- GlobalVariable inline editing ----------

async function onGlobalValueChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const raw = Number(input.value);
  if (isNaN(raw)) return;

  const entry = props.faction[0] as Record<string, unknown>;
  const currentType = (entry.value as Record<string, unknown>)?.type || 'Short';
  let clamped = raw;
  if (currentType === 'Short') clamped = Math.max(-32768, Math.min(32767, Math.round(raw)));
  else if (currentType === 'Long') clamped = Math.round(raw);

  (entry.value as Record<string, unknown>).data = clamped;
  input.value = String(clamped);
  await modifyEntry(entry as unknown as BaseEntry);
}

async function onGlobalTypeChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const newType = select.value; // Short | Long | Float
  const entry = props.faction[0] as Record<string, unknown>;
  const valObj = entry.value as Record<string, unknown>;
  valObj.type = newType;

  // Clamp existing value to new type range
  let current = Number(valObj.data) || 0;
  if (newType === 'Short') current = Math.max(-32768, Math.min(32767, Math.round(current)));
  else if (newType === 'Long') current = Math.round(current);
  valObj.data = current;

  await modifyEntry(entry as unknown as BaseEntry);
}
</script>

<style lang="scss">
.faction {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 4px;
  border: solid 3px rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.1);
  // transition: all .1s ease-in;
  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
  &:disabled {
    pointer-events: none;
  }
  &-top {
    display: flex;
    justify-content: space-between;
  }
  &_selected {
    background-color: rgba(202, 165, 96, 0.1);
    border: solid 3px rgb(202, 165, 96);
    box-sizing: border-box;
  }
  &-left {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex-grow: 1;
  }
  &-right {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  &__title {
    font-size: 22px;
    color: rgb(202, 165, 96);
    display: flex;
    align-items: center;
    gap: 7px;
    span {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  &__message {
    svg {
      width: 30px;
      height: 30px;
      color: rgba(255, 255, 255, 0.8);
      // transition: color .15s ease-in;
    }
    &:hover {
      svg {
        color: rgba(202, 165, 96, 1);
      }
    }
  }
  &__id {
    font-size: 15px;
    font-family: 'Fira Code', monospace;
    color: rgba(255, 255, 255, 0.5);
  }
  &__value {
    font-size: 18px;
  }
  &__gvar {
    margin-top: 4px;
    &-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    &-value {
      flex: 1;
      min-width: 0;
      padding: 4px 8px;
      font-size: 14px;
      font-family: 'Fira Code', monospace;
      color: #e0e0e0;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      outline: none;
      transition: border-color 0.2s;
      &:focus {
        border-color: rgba(202, 165, 96, 0.6);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      /* Hide number spinner arrows */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      -moz-appearance: textfield;
      appearance: textfield;
    }
    &-type {
      padding: 4px 6px;
      font-size: 12px;
      font-family: 'Fira Code', monospace;
      color: #c0c0c0;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
      &:focus {
        border-color: rgba(202, 165, 96, 0.6);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      option {
        background: #2a2a3e;
        color: #e0e0e0;
      }
    }
  }
  textarea {
    font-size: 15px;
    width: 100%;
    color: black;
    height: 100px;
  }
  table {
    // max-width: 50px;
    align-self: flex-start;
    width: fit-content;
    td {
      border: solid 1px rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      color: rgba(255, 255, 255, 0.6);
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.draggable:active {
  cursor: grabbing;
}
</style>