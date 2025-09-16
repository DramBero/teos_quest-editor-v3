<template>
  <div class="frame">
    <div class="frame-dialogue__wrapper">
      <div class="frame-controls">
        <div class="frame-controls-left">
          <div class="frame-controls-types__secondary" :style="{ gap: '10px' }" @click="openClassicView()">
            Classic view
          </div>
          <div class="frame-controls-types__secondary" :style="{ gap: '10px' }" @click="openGlobalDialogue()">
            Global
          </div>
        </div>
        <div class="frame-controls-types">
          <template v-for="speakerType in speakerTypes.filter(val => speakerTypeAmounts[val] > 0)" :key="speakerType">
            <button 
              class="frame-controls-types__type" 
              :class="{
                'frame-controls-types__type_active': currentSpeakerType === speakerType,
              }" 
              @click="currentSpeakerType = speakerType"
              :title="getTitle(speakerType)"
            >
              <component 
                :is="speakerTypeIcon(speakerType)"
              />
              {{ speakerTypeAmounts[speakerType] }}
            </button>
          </template>
        </div>
      </div>

      <div name="fadeHeight" class="frame-dialogue" mode="out-in" :style="{ width: '100%' }">
        <DialogueFrameCard 
          v-for="speaker in currentSpeakers"
          :key="speaker"
          :speakerId="speaker"
          :speakerType="currentSpeakerType"
        />
      </div>
    </div>
    <Record />
  </div>
</template>

<script setup lang="ts">
import DialogueFrameCard from '@/components/dialogue/DialogueFrameCard.vue';
import Record from '../record/Record.vue';
import { fetchAllDialogueBySpeaker, fetchSpeakersAmountBySpeakerType } from '@/api/idb.ts';
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { usePrimaryModal } from '@/stores/modals';
import { useClassicView } from '@/stores/classicView';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';

type SpeakerType = 'npc' | 'cell' | 'class' | 'faction' | 'rank' | 'global';

const GameIconsOrganigram = defineAsyncComponent(
  () => import('~icons/game-icons/organigram/GameIconsOrganigram.vue')
);
const GameIconsCharacter = defineAsyncComponent(
  () => import('~icons/game-icons/character/GameIconsCharacter.vue')
);
const GameIconsMedievalVillage01 = defineAsyncComponent(
  () => import('~icons/game-icons/medieval-village-01/GameIconsMedievalVillage01.vue')
);
const GameIconsAnvilImpact = defineAsyncComponent(
  () => import('~icons/game-icons/anvil-impact/GameIconsAnvilImpact.vue')
);
const GameIconsSaberToothedCatHead = defineAsyncComponent(
  () => import('~icons/game-icons/saber-toothed-cat-head/GameIconsSaberToothedCatHead.vue')
);

function speakerTypeIcon(speakerType) {
  switch(speakerType) {
    case 'npc': return GameIconsCharacter;
    case 'cell': return GameIconsMedievalVillage01;
    case 'class': return GameIconsAnvilImpact;
    case 'faction': return GameIconsOrganigram;
    case 'rank': return GameIconsSaberToothedCatHead;
    default: return GameIconsOrganigram;
  }
}

function getTitle(speakerType) {
  switch(speakerType) {
    case 'npc': return 'Actor';
    case 'cell': return 'Cell';
    case 'class': return 'Class';
    case 'faction': return 'Faction';
    case 'rank': return 'Race';
    default: return 'N/A';
  }
}

const speakerTypes = ref<SpeakerType[]>(['npc', 'cell', 'class', 'faction', 'rank']);
const currentSpeakerType = ref<SpeakerType>('npc');
const speakerSearch = ref<string>('');

const speakerTypeAmounts = ref<Record<SpeakerType, number>>({
  npc: 0,
  cell: 0,
  faction: 0,
  class: 0,
  rank: 0,
  global: 0,
});

const currentSpeakers = ref([]);
watch(currentSpeakerType,
  async (newValue: SpeakerType) => {
    try {
      const speakersResponse = await fetchAllDialogueBySpeaker(newValue);
      currentSpeakers.value = [];
      for (const speaker of speakersResponse) {
        currentSpeakers.value = [...currentSpeakers.value, speaker]
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
    } catch(error) {
      console.error(error);
    }
  },
  { immediate: true },
)
const selectedSpeakerStore = useSelectedSpeaker();
function openGlobalDialogue() {
  selectedSpeakerStore.setSelectedSpeaker({
    speakerId: 'Global',
    speakerType: 'Global',
    speakerName: 'Global Dialogue',
  });
}

onMounted(async () => {
  for (const speakerType of speakerTypes.value) {
    try {
      const speakerLength = await fetchSpeakersAmountBySpeakerType(speakerType);
      speakerTypeAmounts.value[speakerType] = speakerLength;
    } catch (error) {
      console.error(error);
    }
  }
})

async function getSpeakerLength(speakerType: SpeakerType) {
  await fetchSpeakersAmountBySpeakerType(speakerType)
    .then((response: number) => {
      return response;
    })
}

function toggleType(speakerType: SpeakerType) {
  return null;
}

const classicViewStore = useClassicView();
function openClassicView() {
  classicViewStore.setClassicView(true);
}

const primaryModalStore = usePrimaryModal();
function addDialogue() {
  primaryModalStore.setActiveModal('NewDialogue');
}

function openGeneric() {
  // this.$store.commit('setDialogueModal', 'Global Dialogue');
}
</script>

<style lang="scss">
.frame {
  display: flex;
  position: relative;
  transition: all 0.3s cubic-bezier(1, 1, 1, 1);
  height: 100%;
  width: 100%;
  flex-direction: column;

  &-controls {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    position: sticky;
    top: 0;
    background-color: rgba(202, 165, 96, 0.1);
    backdrop-filter: blur(8px);
    border-bottom: solid 3px rgba(202, 165, 96, 0.2);
    z-index: 10;
    &-left {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    &-types {
      display: flex;
      gap: 15px;
      &__secondary {
        font-size: 20px;
        color: rgb(255, 239, 210);
        cursor: pointer;
        transition: color 0.15s ease-in;
        background: rgba(202, 165, 96, 0.3);
        border: 2px solid rgb(202, 165, 96);
        border-radius: 4px;
        padding: 5px 10px;
        &:hover {
          color: rgb(223, 200, 157);
        }
      }

      &__type {
        display: flex;
        align-items: center;
        gap: 5px;
        color: rgb(221, 221, 221);
        font-size: 22px;
        &_active {
          color: rgb(202, 165, 96);
        }
        &:hover {
          opacity: 0.7;
        }
      }

/*       &__type {
        min-width: 90px;
        user-select: none;
        border-radius: 4px;
        cursor: pointer;
        height: 40px;
        border: 2px solid rgb(120, 120, 120);
        background: rgba(0, 0, 0, 0.85);
        color: rgb(120, 120, 120);
        font-family: 'Pelagiad';
        font-size: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: all 0.2s ease-in;

        &:hover {
          color: white;
        }

        &_generic {
          border: 2px solid rgba(255, 255, 255, 0.4);
          color: black;
          background-color: rgba(160, 160, 160, 1);

          &:hover {
            background-color: rgb(200, 200, 200);
            color: black;
          }
        }

        &_active {
          border: 3px solid rgb(202, 165, 96);
          background: rgb(202, 165, 96);
          color: black;

          &:hover {
            color: black;
            background-color: rgba(202, 165, 96, 0.7);
          }
        }
      } */
    }
  }
}

.frame-dialogue {
  position: relative;
  align-items: flex-start;
  flex-wrap: wrap;
  flex-grow: 1;
  padding: 20px 20px 30px 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
  height: calc(100% - 200px);
  &__wrapper {
    width: auto;
    display: flex;
    flex-direction: column;
    position: relative;
    justify-content: center;
    overflow-y: scroll;
  }
}

.search-input {
  display: flex;
  gap: 10px;
  align-items: center;

  &__icon {
    fill: rgb(202, 165, 96);
    transition: opacity 0.3s ease-in-out;
  }

  &__button {
    display: flex;
    align-items: center;

    &:hover {
      opacity: 0.7;
    }
  }
}

.fadeHeight-enter-active,
.fadeHeight-leave-active {
  transition: all 0.15s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fadeHeight-enter,
.fadeHeight-leave-to {
  opacity: 0%;
}
</style>
