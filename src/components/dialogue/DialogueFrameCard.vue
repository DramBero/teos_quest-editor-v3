<template>
  <div class="dialogue-card" @click="openDialogueModal">
    <span class="dialogue-card__name">{{ speakerData.name || speakerId }}</span>
    <div v-if="getNpcFace" class="dialogue-card__decoration"></div>
    <img
      class="dialogue-card__image"
      v-if="getNpcFace"
      :src="getNpcFace ? `/images/faces/${getNpcFace}` : ''"
      :alt="speakerData.name || speakerId"
    />
  </div>
</template>

<script setup lang="ts">
import { fetchNPCData } from '@/api/idb';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed, onMounted, ref } from 'vue';

const props = defineProps({
  speakerType: {
    type: String,
  },
  speakerId: {
    type: String,
  },
})

const speakerData = ref({});

onMounted(async () => {
  let speakerDataResponse;
  await fetchNPCData(props.speakerId)
    .then((response) => {
      speakerDataResponse = response;
    })
    .catch((error) => {
      console.log('err: ', error);
    });
  speakerData.value = speakerDataResponse || {};
})

const getNpcFace = computed(() => {
  let sex = speakerData.value.npc_flags?.includes('FEMALE') ? 'f' : 'm';
  switch (speakerData.value.race) {
    case 'Argonian':
      return 'argonian-' + sex + '.png';
    case 'High Elf':
      return 'altmer-' + sex + '.png';
    case 'Dark Elf':
      return 'dunmer-' + sex + '.png';
    case 'Breton':
      return 'breton-' + sex + '.png';
    case 'Wood Elf':
      return 'bosmer-' + sex + '.png';
    case 'Imperial':
      return 'imperial-' + sex + '.png';
    case 'Khajiit':
      return 'khajiit-' + sex + '.png';
    case 'Nord':
      return 'nord-' + sex + '.png';
    case 'Orc':
      return 'orc-' + sex + '.png';
    case 'Redguard':
      return 'redguard-' + sex + '.png';
    default:
      return '';
  }
})

const selectedSpeakerStore = useSelectedSpeaker();
function openDialogueModal() {
  selectedSpeakerStore.setSelectedSpeaker({
    speakerId: props.speakerId,
    speakerType: props.speakerType
  })
/*   this.$store.commit('setDialogueModal', {
    speakerId: this.speakerId,
    speakerType: this.speakerType,
  }); */
}
</script>

<style lang="scss">
.dialogue-card {
  font-family: 'Pelagiad', 'Sans serif';
  line-height: 23px;
  max-width: 230px;
  min-width: 200px;
  width: 230px;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.5);
  //border: 3px solid rgb(202, 165, 96);
  border-radius: 8px;
  word-break: break-word;
  flex-grow: 1;
  height: 220px;
  padding: 20px;
  text-align: center;
  color: rgb(202, 165, 96);
  cursor: pointer;
  transition: all 0.1s ease-in;
  display: flex;
  flex-direction: column-reverse;
  position: relative;
  align-items: center;
  //gap: 10px;
  &:hover {
    background: rgb(202, 165, 96);
    color: black;
    .dialogue-card__decoration {
      background: rgb(53, 44, 27);
      transform: translateY(-65%) rotate(-8deg);
    }
  }
  &__decoration {
    position: absolute;
    top: 50%;
    transform: translateY(-65%) rotate(-8deg);
    width: 105px;
    height: 105px;
    clip-path: ellipse(50% 50% at 50% 50%);
    background: rgb(201, 200, 199);
    transition: all 0.25s ease-in;
  }
  &__image {
    object-fit: cover;
    //max-height: 80%;
    transition: all 0.15s ease-in;
    transform: scale(0.65);
    filter: sepia(10%) contrast(140%);
    -webkit-filter: sepia(10%) contrast(140%);
    -moz-filter: sepia(10%) contrast(140%);
  }
}
</style>
