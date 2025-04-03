import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { PrimaryModal } from '@/types/modals.ts';

export const usePrimaryModal = defineStore('primaryModal', () => {
  const activeModal = ref<PrimaryModal>('');
  function setActiveModal(modalKey: PrimaryModal) {
    activeModal.value = modalKey;
  }
  const getActiveModal = computed(() => activeModal.value);

  return { activeModal, setActiveModal, getActiveModal };
});
