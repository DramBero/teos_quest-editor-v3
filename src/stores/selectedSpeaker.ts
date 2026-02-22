import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface SpeakerData {
  speakerId: string;
  speakerType: string;
  speakerName?: string;
  speaker?: Record<string, unknown>;
}

export const useSelectedSpeaker = defineStore('selecledSpeaker', () => {
  const selecledSpeaker = ref<SpeakerData>({} as SpeakerData);
  function setSelectedSpeaker(input: SpeakerData) {
    selecledSpeaker.value = input;
  }
  const getSelectedSpeaker = computed(() => selecledSpeaker.value);

  return { selecledSpeaker, setSelectedSpeaker, getSelectedSpeaker };
});
