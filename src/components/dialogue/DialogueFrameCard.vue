<template>
  <div class="dialogue-card" @click="openDialogueModal" ref="hoverable">
    <span class="dialogue-card__name">{{ speakerData.name || speakerId }}</span>
    <div v-if="loaded && getFaceData" :style="{'width': '160px', 'height': '160px'}">
      <TresCanvas render-mode="on-demand" :preserveDrawingBuffer="true">
        <!-- <TresDirectionalLight :position="[-4, 8, 4]" :intensity="2" color="#F78B3D"/> -->
        <TresAmbientLight :intensity="1.7" />
        <TresPerspectiveCamera :position="[0, 0, 0.27]" />
        <Suspense >
          <TresMesh :rotation-y="-0.3" >
            <GLTFModel :path="getFaceData" />
          </TresMesh>
        </Suspense>
  <!--       <Suspense>
          <EffectComposerPmndrs>
            <KuwaharaPmndrs :radius="1" :sectorCount="2" />
          </EffectComposerPmndrs>
        </Suspense> -->
      </TresCanvas>
    </div>
    <template v-else-if="loaded && getNpcFace">
      <!-- <div class="dialogue-card__decoration"></div> -->
      <img
        class="dialogue-card__image"
        :src="getNpcFace ? `/images/faces/${getNpcFace}` : ''"
        :alt="speakerData.name || speakerId"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { fetchNPCData } from '@/api/idb';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed, onMounted, ref, watch, useTemplateRef  } from 'vue';

import { TresCanvas } from '@tresjs/core';
import { GLTFModel } from '@tresjs/cientos';
import { useElementHover } from '@vueuse/core'

// import { EffectComposerPmndrs, KuwaharaPmndrs } from '@tresjs/post-processing';

const myHoverableElement = useTemplateRef<HTMLButtonElement>('hoverable')
const isHovered = useElementHover(myHoverableElement)

const speakerData = ref({});

const getFaceData = computed(() => {
  switch (speakerData.value.head) {
    case 'b_n_wood elf_m_head_02': return '/meshes/b_n_wood elf_m_head_02.glb';
    case 'b_n_breton_f_head_03': return '/meshes/b_n_breton_f_head_03.glb';
    case 'b_n_breton_f_head_05': return '/meshes/b_n_breton_f_head_05.glb';
    case 'B_N_Breton_M_Head_08': return '/meshes/B_N_Breton_M_Head_08.glb';
    case 'b_n_imperial_m_head_01': return '/meshes/b_n_imperial_m_head_01.glb';
    case 'b_n_imperial_m_head_02': return '/meshes/b_n_imperial_m_head_02.glb';
    case 'b_n_imperial_m_head_04': return '/meshes/b_n_imperial_m_head_04.glb';
    case 'b_n_dark elf_f_head_02': return '/meshes/b_n_dark elf_f_head_02.glb';
    case 'b_n_dark elf_m_head_03': return '/meshes/b_n_dark elf_m_head_03.glb';
    case 'b_n_dark elf_m_head_11': return '/meshes/b_n_dark elf_m_head_11.glb'
    case 'b_n_high elf_f_head_01': return '/meshes/b_n_high elf_f_head_01.glb';
    case 'b_n_high elf_m_head_03': return '/meshes/b_n_high elf_m_head_03.glb';
    case 'b_n_nord_m_head_01': return '/meshes/b_n_nord_m_head_01.glb';
    default: return '';
  }
})

const getHairData = computed(() => {
  switch(speakerData.value.hair) {
    case 'b_n_dark elf_f_hair_03': return '/meshes/b_n_dark elf_f_hair_03.glb';
    default: return '';
  }
})

watch(getFaceData, () => {
  
})

const props = defineProps({
  speakerType: {
    type: String,
  },
  speakerId: {
    type: String,
  },
})

const loaded = ref<boolean>(false);
onMounted(async () => {
  loaded.value = false;
  let speakerDataResponse;
  await fetchNPCData(props.speakerId)
    .then((response) => {
      speakerDataResponse = response;
    })
    .catch((error) => {
      console.log('err: ', error);
    });
  speakerData.value = speakerDataResponse || {};
  loaded.value = true;
});

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
