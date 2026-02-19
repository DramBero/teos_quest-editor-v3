<template>
  <div class="dialogue-card" @click="openDialogueModal" ref="hoverable">
    <span class="dialogue-card__name">{{ speakerData?.name || speakerId }}</span>

    <!-- 3D-rendered head portrait (from offscreen renderer) -->
    <img
      v-if="headImage"
      class="dialogue-card__image dialogue-card__image--3d"
      :src="headImage"
      :alt="speakerData?.name || speakerId"
    >
    <!-- Fallback: race+sex sprite -->
    <img
      v-else-if="loaded && getNpcFace"
      class="dialogue-card__image"
      :src="`/images/faces/${getNpcFace}`"
      :alt="speakerData?.name || speakerId"
    />
  </div>
</template>

<script setup lang="ts">
import { fetchNPCData } from '@/api/idb';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { computed, ref, watch, useTemplateRef } from 'vue';
import { renderHead } from '@/services/headRenderer';
import { useElementVisibility } from '@vueuse/core';

import type { NpcEntry } from '@/types/pluginEntries.ts';

const target = useTemplateRef<HTMLDivElement>('hoverable');
const targetIsVisible = useElementVisibility(target);

const props = defineProps({
  speakerType: { type: String },
  speakerId: { type: String },
});

// ---------- State ----------
const speakerData = ref<NpcEntry | null>(null);
const loaded = ref(false);
const headImage = ref('');

// ---------- Fetch NPC data when card becomes visible ----------
watch(targetIsVisible, () => {
  if (targetIsVisible.value) {
    fetchCardData();
  }
}, { immediate: true });

async function fetchCardData() {
  if (loaded.value) return; // already loaded
  try {
    const data = await fetchNPCData(props.speakerId);
    speakerData.value = data || null;
  } catch (error) {
    console.log('NPC fetch error:', error);
  }
  loaded.value = true;
}

// ---------- Render head portrait via offscreen renderer ----------
watch(speakerData, async (npc) => {
  if (!npc?.head) return;

  const headPath = `/meshes/${npc.head.toLowerCase()}.glb`;
  const hairPath = npc.hair ? `/meshes/${npc.hair.toLowerCase()}.glb` : '';

  try {
    const dataURL = await renderHead(headPath, hairPath);
    if (dataURL) {
      headImage.value = dataURL;
    }
  } catch {
    // GLB not available — fallback to race sprite
  }
});

// ---------- Race+sex fallback sprite ----------
const getNpcFace = computed(() => {
  if (!speakerData.value) return '';
  const sex = speakerData.value.npc_flags?.includes('FEMALE') ? 'f' : 'm';
  const raceMap: Record<string, string> = {
    'Argonian': 'argonian',
    'High Elf': 'altmer',
    'Dark Elf': 'dunmer',
    'Breton': 'breton',
    'Wood Elf': 'bosmer',
    'Imperial': 'imperial',
    'Khajiit': 'khajiit',
    'Nord': 'nord',
    'Orc': 'orc',
    'Redguard': 'redguard',
  };
  const race = raceMap[speakerData.value.race || ''];
  return race ? `${race}-${sex}.png` : '';
});

// ---------- Open dialogue modal ----------
const selectedSpeakerStore = useSelectedSpeaker();
function openDialogueModal() {
  selectedSpeakerStore.setSelectedSpeaker({
    speakerId: props.speakerId,
    speakerType: props.speakerType,
    speakerName: speakerData.value?.name,
  });
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
  border-radius: 8px;
  word-break: break-word;
  flex-grow: 1;
  height: 220px;
  padding: 20px;
  text-align: center;
  color: rgb(202, 165, 96);
  cursor: pointer;
  display: flex;
  flex-direction: column-reverse;
  position: relative;
  align-items: center;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgb(202, 165, 96);
  }

  &__image {
    object-fit: cover;
    transition: all 80ms ease;
    transform: scale(0.65);
    filter: sepia(10%) contrast(140%);
    -webkit-filter: sepia(10%) contrast(140%);
    -moz-filter: sepia(10%) contrast(140%);

    &--3d {
      width: 160px;
      height: 160px;
      transform: scale(1);
      filter: none;
    }
  }
}
</style>
