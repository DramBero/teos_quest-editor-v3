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
          <div v-if="props.faction[0].TMP_is_active && props.faction.length > 1" class="quest-status quest-status_mod">
          </div>
          <div v-else-if="faction[0].TMP_is_active" class="quest-status quest-status_new">
          </div>
          <span :title="getName">
            {{ getName }}
          </span>
        </div>
        <span class="faction__id">{{ getId }}</span>
        <input 
          v-if="props.faction[0].type === 'GlobalVariable'"
          type="text" 
          disabled 
          class="faction__value" 
          :value="props.faction[0].value?.data"
        />
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
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed } from 'vue';
import TdesignChatMessageFilled from '~icons/tdesign/chat-message-filled';
import MagicEffects from './MagicEffects.vue';

const props = defineProps<{
  faction: Array<Object>;
    modificator: String;
}>();

const selectedRecordStore = useSelectedRecord();

function handleSelect() {
  if (props.faction[0]?.type !== 'Book') return;
  selectedRecordStore.setSelectedRecord(props.faction);
}

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  const transferEntry = JSON.stringify({
    entry: props.faction[0],
    type: props.faction[0]?.type,
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

function openDialogue(speaker) {
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
    default: return props.faction[0].name;
  } 
});

const getId = computed(() => {
  switch(props.faction[0]?.type) {
    case 'Cell': return `${props.faction[0]?.data?.grid?.[0]}:${props.faction[0]?.data?.grid?.[1]}`;
    case 'PathGrid': return `${props.faction[0]?.data?.grid?.[0]}:${props.faction[0]?.data?.grid?.[1]}`;
    case 'Landscape': return `${props.faction[0].grid?.[0]}:${props.faction[0].grid?.[1]}`;
    case 'MagicEffect': return props.faction[0].description;
    default: return props.faction[0]?.id;
  }
})
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
    font-family: 'Consolas';
    color: rgba(255, 255, 255, 0.5);
  }
  &__value {
    font-size: 18px;
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