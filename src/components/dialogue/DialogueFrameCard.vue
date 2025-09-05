<template>
  <div class="dialogue-card" @click="openDialogueModal" ref="hoverable">
    <span class="dialogue-card__name">{{ speakerData?.name || speakerId }}</span>
    <div v-if="!redrawTrigger && loaded && getFaceData" :style="{'width': '160px', 'height': '160px'}">
      <TresCanvas alpha render-mode="on-demand" :preserveDrawingBuffer="true" ref="ctxRef" v-if="!canvasLoaded">
        <!-- <TresDirectionalLight :position="[-4, 8, 4]" :intensity="2" color="#FFFFFF"/> -->
        <TresAmbientLight :intensity="1.7" />
        <TresPerspectiveCamera :position="[0, 0, 0.27]" />
        <Suspense >
          <DialogueFrameCardModel :head="getFaceData" :hair="getHairData" />
        </Suspense>
<!--         <Suspense>
          <EffectComposerPmndrs>
            <KuwaharaPmndrs :radius="2" :sectorCount="4" />
          </EffectComposerPmndrs>
        </Suspense> -->
      </TresCanvas>
      <img
        v-else
        :src="canvasImage"
        :alt="speakerData?.name || speakerId"
        :style="{'width': '160px', 'height': '160px'}"
      >
    </div>
    <template v-else-if="!redrawTrigger && loaded && getNpcFace">
      <!-- <div class="dialogue-card__decoration"></div> -->
      <img
        class="dialogue-card__image"
        :src="getNpcFace ? `/images/faces/${getNpcFace}` : ''"
        :alt="speakerData?.name || speakerId"
      />
    </template>

  </div>
</template>

<script setup lang="ts">
import { fetchNPCData } from '@/api/idb';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed, ref, shallowRef, watch, useTemplateRef } from 'vue';
import DialogueFrameCardModel from './DialogueFrameCardModel.vue';

import type { NpcEntry } from '@/types/pluginEntries.ts';

import { TresCanvas } from '@tresjs/core';


// import { EffectComposerPmndrs, KuwaharaPmndrs } from '@tresjs/post-processing';

import { useElementVisibility } from '@vueuse/core'

const target = useTemplateRef<HTMLDivElement>('hoverable')
const targetIsVisible = useElementVisibility(target)

const ctxRef = shallowRef();
const canvas = ref();

watch(ctxRef, (ctx) => {
  if (!ctx) return;
  if(ctx.context.renderer.value) {
    canvas.value = ctx.context.renderer.value;
    console.log('ctxRef change', props.speakerId)
    handleLoaded();
  }
})

watch(targetIsVisible, () => {
  if (targetIsVisible.value) {
    fetchCardData();
  }
}, {
  immediate: true,
})

const canvasImage = ref<string>();
const canvasLoaded = ref<boolean>(false);

const redrawCounter = ref<number>(0);
const redrawTrigger = ref<boolean>(false);
async function handleLoaded() {
  let meshLoaded = false;
  let iteration = 0;
  while (!meshLoaded) {
    const dataURL = canvas.value?.domElement.toDataURL('image/png');
    const canvasImageLength = canvasImage.value?.length || 0;
    if (iteration > 1000) {
      redrawCounter.value += 1;
    }
    if ((dataURL?.length > 1500) && (dataURL.length > canvasImageLength)) {
      canvasImage.value = dataURL;
    }
    if (dataURL.length <= canvasImageLength) {
      if (canvasImageLength > 2000) {
        meshLoaded = true;
        canvasLoaded.value = true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    iteration += 1;
  }
}

watch(redrawCounter, async () => {
  if ((canvasImage.value?.length || 0) >= 1000) {
    return
  }
  redrawTrigger.value = true;
  await new Promise((resolve) => setTimeout(resolve, 200));
  redrawTrigger.value = false;
})

async function redrawWatcher() {
  if (!getFaceData.value) return;
  while ((canvasImage.value?.length || 0) < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    redrawCounter.value += 1;
  }
}

const speakerData = ref<NpcEntry | null>(null);

const getFaceData = computed(() => {
  try {
    const filePath = `/meshes/${speakerData.value?.head?.toLowerCase()}.glb`;
    return filePath;
  } catch (error) {
    console.error(error);
    return '';
  }
});

const getFaceData2 = computed(() => {
  switch (speakerData.value?.head?.toLowerCase()) {
    case 'b_n_argonian_f_head_01': return '/meshes/b_n_argonian_f_head_01.glb';
    case 'b_n_argonian_f_head_02': return '/meshes/b_n_argonian_f_head_02.glb';
    case 'b_n_argonian_f_head_03': return '/meshes/b_n_argonian_f_head_03.glb';
    case 'b_v_argonian_f_head_01': return '/meshes/b_v_argonian_f_head_01.glb';

    case 'b_n_argonian_m_head_01': return '/meshes/b_n_argonian_m_head_01.glb';
    case 'b_n_argonian_m_head_02': return '/meshes/b_n_argonian_m_head_02.glb';
    case 'b_n_argonian_m_head_03': return '/meshes/b_n_argonian_m_head_03.glb';
    case 'b_v_argonian_m_head_01': return '/meshes/b_v_argonian_m_head_01.glb';

    case 'b_n_breton_f_head_01': return '/meshes/b_n_breton_f_head_01.glb';
    case 'b_n_breton_f_head_02': return '/meshes/b_n_breton_f_head_02.glb';
    case 'b_n_breton_f_head_03': return '/meshes/b_n_breton_f_head_03.glb';
    case 'b_n_breton_f_head_04': return '/meshes/b_n_breton_f_head_04.glb';
    case 'b_n_breton_f_head_05': return '/meshes/b_n_breton_f_head_05.glb';
    case 'b_n_breton_f_head_06': return '/meshes/b_n_breton_f_head_06.glb';
    case 'b_v_breton_f_head_01': return '/meshes/b_v_breton_f_head_01.glb';

    case 'b_n_breton_m_head_01': return '/meshes/b_n_breton_m_head_01.glb';

    case 'b_n_khajiit_f_head_01': return '/meshes/b_n_khajiit_f_head_01.glb';
    case 'b_n_khajiit_f_head_02': return '/meshes/b_n_khajiit_f_head_02.glb';
    case 'b_n_khajiit_f_head_03': return '/meshes/b_n_khajiit_f_head_03.glb';
    case 'b_n_khajiit_f_head_04': return '/meshes/b_n_khajiit_f_head_04.glb';
    case 'b_v_khajiit_f_head_01': return '/meshes/b_v_khajiit_f_head_01.glb';

    case 'b_n_khajiit_m_head_01': return '/meshes/b_n_khajiit_m_head_01.glb';
    case 'b_n_khajiit_m_head_02': return '/meshes/b_n_khajiit_m_head_02.glb';
    case 'b_n_khajiit_m_head_03': return '/meshes/b_n_khajiit_m_head_03.glb';
    case 'b_n_khajiit_m_head_04': return '/meshes/b_n_khajiit_m_head_04.glb';
    case 'b_v_khajiit_m_head_01': return '/meshes/b_v_khajiit_m_head_01.glb';


    case 'b_n_high elf_m_head_01': return '/meshes/b_n_high elf_m_head_01.glb';
    case 'b_n_high elf_m_head_02': return '/meshes/b_n_high elf_m_head_02.glb';
    case 'b_n_high elf_m_head_03': return '/meshes/b_n_high elf_m_head_03.glb';
    case 'b_n_high elf_m_head_04': return '/meshes/b_n_high elf_m_head_04.glb';
    case 'b_n_high elf_m_head_05': return '/meshes/b_n_high elf_m_head_05.glb';
    case 'b_n_high elf_m_head_06': return '/meshes/b_n_high elf_m_head_06.glb';
    case 'b_v_high elf_m_head_01': return '/meshes/b_v_high elf_m_head_01.glb';

    case 'b_n_high elf_f_head_01': return '/meshes/b_n_high elf_f_head_01.glb';
    case 'b_n_high elf_f_head_02': return '/meshes/b_n_high elf_f_head_02.glb';
    case 'b_n_high elf_f_head_03': return '/meshes/b_n_high elf_f_head_03.glb';
    case 'b_n_high elf_f_head_04': return '/meshes/b_n_high elf_f_head_04.glb';
    case 'b_n_high elf_f_head_05': return '/meshes/b_n_high elf_f_head_05.glb';
    case 'b_n_high elf_f_head_06': return '/meshes/b_n_high elf_f_head_06.glb';
    case 'b_v_high elf_f_head_01': return '/meshes/b_v_high elf_f_head_01.glb';


    case 'b_n_dark elf_m_head_01': return '/meshes/b_n_dark elf_m_head_01.glb';
    case 'b_n_dark elf_m_head_02': return '/meshes/b_n_dark elf_m_head_02.glb';
    case 'b_n_dark elf_m_head_03': return '/meshes/b_n_dark elf_m_head_03.glb';
    case 'b_n_dark elf_m_head_04': return '/meshes/b_n_dark elf_m_head_04.glb';
    case 'b_n_dark elf_m_head_05': return '/meshes/b_n_dark elf_m_head_05.glb';
    case 'b_n_dark elf_m_head_06': return '/meshes/b_n_dark elf_m_head_06.glb';
    case 'b_n_dark elf_m_head_07': return '/meshes/b_n_dark elf_m_head_07.glb';
    case 'b_n_dark elf_m_head_08': return '/meshes/b_n_dark elf_m_head_08.glb';
    case 'b_n_dark elf_m_head_09': return '/meshes/b_n_dark elf_m_head_09.glb';
    case 'b_n_dark elf_m_head_10': return '/meshes/b_n_dark elf_m_head_10.glb';
    case 'b_n_dark elf_m_head_11': return '/meshes/b_n_dark elf_m_head_11.glb';
    case 'b_n_dark elf_m_head_12': return '/meshes/b_n_dark elf_m_head_12.glb';
    case 'b_n_dark elf_m_head_13': return '/meshes/b_n_dark elf_m_head_13.glb';
    case 'b_n_dark elf_m_head_14': return '/meshes/b_n_dark elf_m_head_14.glb';
    case 'b_n_dark elf_m_head_15': return '/meshes/b_n_dark elf_m_head_15.glb';
    case 'b_n_dark elf_m_head_16': return '/meshes/b_n_dark elf_m_head_16.glb';
    case 'b_n_dark elf_m_head_17': return '/meshes/b_n_dark elf_m_head_17.glb';
    case 'b_v_dark elf_m_head_01': return '/meshes/b_v_dark elf_m_head_01.glb';

    case 'b_n_dark elf_f_head_01': return '/meshes/b_n_dark elf_f_head_01.glb';
    case 'b_n_dark elf_f_head_02': return '/meshes/b_n_dark elf_f_head_02.glb';
    case 'b_n_dark elf_f_head_03': return '/meshes/b_n_dark elf_f_head_03.glb';
    case 'b_n_dark elf_f_head_04': return '/meshes/b_n_dark elf_f_head_04.glb';
    case 'b_n_dark elf_f_head_05': return '/meshes/b_n_dark elf_f_head_05.glb';
    case 'b_n_dark elf_f_head_06': return '/meshes/b_n_dark elf_f_head_06.glb';
    case 'b_n_dark elf_f_head_07': return '/meshes/b_n_dark elf_f_head_07.glb';
    case 'b_n_dark elf_f_head_08': return '/meshes/b_n_dark elf_f_head_08.glb';
    case 'b_n_dark elf_f_head_09': return '/meshes/b_n_dark elf_f_head_09.glb';
    case 'b_n_dark elf_f_head_10': return '/meshes/b_n_dark elf_f_head_10.glb';
    case 'b_v_dark elf_f_head_01': return '/meshes/b_v_dark elf_f_head_01.glb';


    case 'b_n_imperial_m_head_01': return '/meshes/b_n_imperial_m_head_01.glb';
    case 'b_n_imperial_m_head_02': return '/meshes/b_n_imperial_m_head_02.glb';
    case 'b_n_imperial_m_head_03': return '/meshes/b_n_imperial_m_head_03.glb';
    case 'b_n_imperial_m_head_04': return '/meshes/b_n_imperial_m_head_04.glb';
    case 'b_n_imperial_m_head_05': return '/meshes/b_n_imperial_m_head_05.glb';
    case 'b_n_imperial_m_head_06': return '/meshes/b_n_imperial_m_head_06.glb';
    case 'b_n_imperial_m_head_07': return '/meshes/b_n_imperial_m_head_07.glb';
    case 'b_v_imperial_m_head_01': return '/meshes/b_v_imperial_m_head_01.glb';


    case 'b_n_nord_m_head_01': return '/meshes/b_n_nord_m_head_01.glb';
    case 'b_n_nord_m_head_02': return '/meshes/b_n_nord_m_head_02.glb';
    case 'b_n_nord_m_head_03': return '/meshes/b_n_nord_m_head_03.glb';
    case 'b_n_nord_m_head_04': return '/meshes/b_n_nord_m_head_04.glb';
    case 'b_n_nord_m_head_05': return '/meshes/b_n_nord_m_head_05.glb';
    case 'b_n_nord_m_head_06': return '/meshes/b_n_nord_m_head_06.glb';
    case 'b_n_nord_m_head_07': return '/meshes/b_n_nord_m_head_07.glb';
    case 'b_n_nord_m_head_08': return '/meshes/b_n_nord_m_head_08.glb';
    case 'b_n_nord_m_head_09': return '/meshes/b_n_nord_m_head_09.glb';

    case 'b_n_wood elf_m_head_02': return '/meshes/b_n_wood elf_m_head_02.glb';
    case 'b_n_breton_m_head_08': return '/meshes/b_n_breton_m_head_08.glb';
    
    default: return '';
  }
})

const getHairData = computed(() => {
  try {
    const filePath = `/meshes/${speakerData.value?.hair?.toLowerCase()}.glb`;
    return filePath;
  } catch (error) {
    console.error(error);
    return '';
  }
});

const getHairData2 = computed(() => {
  switch(speakerData.value?.hair?.toLowerCase()) {
    case 'b_n_dark elf_f_hair_03': return '/meshes/b_n_dark elf_f_hair_03.glb';
    case 'b_n_imperial_m_hair_01': return '/meshes/b_n_imperial_m_hair_01.glb';
    case 'b_n_imperial_m_hair_04': return '/meshes/b_n_imperial_m_hair_04.glb';
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
async function fetchCardData() {
  loaded.value = false;
  let speakerDataResponse;
  await fetchNPCData(props.speakerId)
    .then((response: NpcEntry) => {
      speakerDataResponse = response;
    })
    .catch((error: string) => {
      console.log('err: ', error);
    });
  speakerData.value = speakerDataResponse || null;
  loaded.value = true;
  redrawWatcher();
}

const getNpcFace = computed(() => {
  if (!speakerData.value) return '';
  const sex = speakerData.value.npc_flags?.includes('FEMALE') ? 'f' : 'm';
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
  max-width: 200px;
  min-width: 200px;
  width: 230px;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.5);
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
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(202, 165, 96);
    // color: black;
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
