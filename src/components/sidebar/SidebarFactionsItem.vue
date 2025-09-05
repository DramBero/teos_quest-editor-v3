<template>
  <button
    v-if="props.faction.length"
    class="faction"
    :class="{'faction_selected': getSelectedRecord?.[0]?.id === props.faction[0].id }"
    :disabled="!['Book'].includes(props.faction[0].type)"
    @click="handleSelect"
  >
    <div class="faction-left">
      <div class="faction__title">
        <div v-if="props.faction[0].TMP_is_active && props.faction.length > 1" class="quest-status quest-status_mod">
          Mod
        </div>
        <div v-else-if="faction[0].TMP_is_active" class="quest-status quest-status_new">
          New
        </div>
        {{ props.faction[0].name || props.faction[0].skill_id || props.faction[0].effect_id }}
      </div>
      <span class="faction__id">{{ props.faction[0].id }}</span>
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
    </div>
  </button>
</template>

<script setup lang="ts">
import { useSelectedRecord } from '@/stores/selectedRecord';
import { computed } from 'vue';

const props = defineProps<{
  faction: Array<Object>;
    modificator: String;
}>();

const selectedRecordStore = useSelectedRecord();

function handleSelect() {
  selectedRecordStore.setSelectedRecord(props.faction);
}

const getSelectedRecord = computed(() => selectedRecordStore.getSelectedRecord);
</script>

<style lang="scss">
.faction {
  display: flex;
  justify-content: space-between;
  text-align: left;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 4px;
  border: solid 3px rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.1);
  transition: all .1s ease-in;
  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
  &:disabled {
    pointer-events: none;
  }
  &_selected {
    background-color: rgba(255, 255, 255, 0);
    border: solid 3px rgb(202, 165, 96);
    box-sizing: border-box;
  }
  &-left {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex-grow: 1;
  }
  &__title {
    font-size: 22px;
    color: rgb(202, 165, 96);
    display: flex;
    gap: 7px;
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
    width: fit-content;
    td {
      border: solid 1px rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      color: rgba(255, 255, 255, 0.6);
      width: 50px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>