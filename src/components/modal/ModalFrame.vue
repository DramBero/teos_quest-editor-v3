<template>
  <div class="modal">
    <transition name="fade" appear>
      <div class="modal__overlay" v-if="triggerFade !== ''" @mousedown="hideModals" data-custom-close>
        <transition name="slide" appear>
          <div class="modal__content" v-if="getModal !== ''" @mousedown.stop>
            <div class="modal__content-wrapper">
              <!--                 <div class="modal__close--wrapper">
                  <button
                    class="btn modal__close js-modal-close"
                    @click="hideModals"
                    data-custom-close
                  >
                    <i class="icon icon--close"></i>
                  </button>
                </div> -->

              <component v-if="getModalComponent" :is="getModalComponent" />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { usePrimaryModal } from '@/stores/modals';
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import type { PrimaryModal } from '@/types/modals.ts';

const modalType = ref<string>('');
const triggerFade = ref<string>('');

const primaryModalStore = usePrimaryModal();

function hideModals() {
  primaryModalStore.setActiveModal('');
}

const getModal = computed<PrimaryModal>(() => {
  return primaryModalStore.getActiveModal;
})

watch(getModal, async (newValue: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1));
  triggerFade.value = newValue;
  if (newValue === '') {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  modalType.value = getModal.value;
})

const ModalContentUpload = defineAsyncComponent(
  () => import('@/components/modal/ModalContentUpload.vue')
)
/* const ModalContentDialogue = defineAsyncComponent(
  () => import('@/components/modal/ModalContentDialogue.vue')
) */
const ModalContentNewDialogue = defineAsyncComponent(
  () => import('@/components/modal/ModalContentNewDialogue.vue')
)
const ModalContentNewFilter = defineAsyncComponent(
  () => import('@/components/modal/ModalContentNewFilter.vue')
)
const ModalContentNewQuest = defineAsyncComponent(
  () => import('@/components/modal/ModalContentNewQuest.vue')
)

const getModalComponent = computed(() => {
  switch (getModal.value) {
    case 'Dialogue': return ModalContentDialogue;
    case 'NewDialogue': return ModalContentNewDialogue;
    case 'NewFilter': return ModalContentNewFilter;
    case 'NewQuest': return ModalContentNewQuest;
    case 'Upload': return ModalContentUpload;
    default: return null;
  }
})

</script>

<style scoped lang="scss">
.modal__title {
  color: rgb(202, 165, 96);
  background: rgba(0, 0, 0, 0.5);
  padding: 10px;
  font-weight: 500;
  margin-bottom: 20px;
  border-radius: 4px;
}

.modal {
  &__overlay {
    padding: 16px;
    position: fixed;
    z-index: 100;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    color: #19381f;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;

    @media (max-width: 600px) {
      padding: 16px 0 0 0;
      align-items: flex-end;
    }
  }

  &.PersonalFilters {
    .modal__content {
      max-width: 1282px;
    }
  }

  &.moving {
    .modal__content {
      max-width: 679px;
    }
  }

  &.paymentHistory {
    .modal__content {
      max-width: 840px;
    }
  }

  &__title {
    color: rgb(202, 165, 96);
    background: rgba(0, 0, 0, 0.5);
    font-weight: 500;
    margin-bottom: 20px;
  }

  &__content {
    z-index: 101;
    display: flex;
    flex-direction: column;
    position: relative;
    max-height: 100%;
    padding: 56px 0 8px;
    max-width: 648px;
    width: 100%;
    font-size: 22px;

    @media (max-width: 600px) {
      background-color: transparent;
      padding: 24px 0 0 0;
      max-height: 100vh;
      overflow-y: auto;
      width: 100%;
      max-width: 100%;
      border-radius: 0;
    }

    ::-webkit-scrollbar {
      &-thumb {
        background-color: rgb(58, 45, 20);
      }

      &-trail {
        background-color: rgba(58, 45, 20, 0.2);
      }
    }

    &--tab {
      opacity: 1;
      visibility: visible;

      &:not(.active) {
        display: none;
      }

      &:not(.shown) {
        opacity: 0;
        visibility: hidden;
      }
    }

    &-wrapper {
      box-shadow: 2px 2px 8px rgba(25, 56, 31, 0.04);
      border-radius: 8px;
      //padding: 32px;
      background: rgb(202, 165, 96);
      max-height: 100%;

      @media (max-width: 800px) {
        padding: 24px;
      }

      @media (max-width: 600px) {
        padding: 24px 16px;
        width: 100%;
        border-top: 1px solid rgba(25, 56, 31, 0.1);
        box-shadow: 0px -12px 20px rgba(41, 45, 58, 0.06);
        border-radius: 24px 24px 0px 0px;
        background: rgb(202, 165, 96);
      }
    }
  }

  &__inner {
    padding: 32px 40px;

    @media (max-width: 800px) {
      padding: 16px;
    }
  }

  &--hidden {
    display: none;

    &.is-open {
      display: block;
    }

    .modal__content,
    .modal__overlay {
      will-change: transform;
    }
  }

  .modal__header {
    display: flex;
    align-items: center;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0, 0, 0.2, 1);
  opacity: 1;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0, 0, 0.2, 1);
  transform: scale(0.8);
}

.slide-enter-to,
.slide-leave-from {
  transform: scale(1);
}

.slide-leave-to {
  transform: scale(1.2);
}

.slide-enter-from {
  transform: scale(0.8);
}

.reportFilters {
  .modal__content {
    max-width: 679px;
    width: 100%;
  }
}
</style>
