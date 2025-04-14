<script setup lang="ts">
import init from './tes3_wasm/tes3_wasm.js';
import { getActiveHeader } from '@/api/idb.js';
import { RouterView } from 'vue-router';
import { computed, onMounted } from 'vue';
import CWorkspace from './components/CWorkspace.vue';
import ModalFrame from './components/modal/ModalFrame.vue';
import { usePluginHeader } from './stores/pluginHeader.js';
import ModalMain from './components/modal/ModalMain.vue';
import ModalContentDialogue from './components/modal/ModalContentDialogue.vue';
import { useSelectedSpeaker } from './stores/selectedSpeaker.js';
import ModalClassicView from './components/modal/ModalClassicView.vue';

const headerStore = usePluginHeader();
onMounted(async () => {
  await init();
  const headerResponse = await getActiveHeader();
  if (headerResponse) {
    headerStore.setPluginHeader(headerResponse);
  }
})

const selectedSpeakerStore = useSelectedSpeaker();
const getSpeakerData = computed(() => {
  return selectedSpeakerStore.getSelectedSpeaker;
})
</script>

<template>
  <header></header>
  <div>
    <ModalFrame />
    <ModalClassicView />
    <CWorkspace />
    <ModalMain v-show="getSpeakerData.speakerId" :header="getSpeakerData.speakerId">
      <ModalContentDialogue :speaker="getSpeakerData"/>
    </ModalMain>
  </div>
  <RouterView />
</template>

<style lang="scss">
@font-face {
  font-family: "Pelagiad";
  src: local("Pelagiad"), url(@/assets/fonts/pelagiad/Pelagiad.ttf) format("truetype");
}

@font-face {
  font-family: "Consolas";
  src: local("Consolas"), url(@/assets/fonts/consolas/CONSOLA.TTF) format("truetype");
}

* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  font-family: "Pelagiad";
  background-image: linear-gradient(#465057 1px, transparent 1px),
    linear-gradient(to right, #465057 1px, transparent 1px);
  background-size: 33px 33px;
  background-color: #2c3a42;
}

h2 {
  color: black;
  font-weight: 500;
  margin-bottom: 20px;
}

::-webkit-scrollbar {
  width: 13px;
  scrollbar-width: thin;
  background: none;

  &-thumb {
    background-color: rgb(202, 165, 96);
    border-radius: 3px;
    background-clip: padding-box;
    border: 3px solid transparent;
    width: 7px;
  }

  &-corner {
    background: none;
  }
}

.modal-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;

  &__name {
    font-size: 20px;
  }

  &__input {
    width: 100%;
    resize: none;
    background: rgba(255, 255, 255, 0.18);
    border: 2px solid rgb(202, 165, 96);
    color: black;
    font-family: "Pelagiad";
    font-size: 20px;
    padding: 10px;
    border-radius: 8px;

    &:focus {
      outline: none !important;
      border: 2px solid rgba(255, 255, 255, 0.18);
    }

    &::placeholder {
      color: rgba(0, 0, 0, 0.3);
    }
  }

  &_dark {
    .modal-field__input {
      background: rgba(0, 0, 0, 0.45);
      border: 2px solid rgb(68, 59, 44);
      color: rgb(216, 186, 131);

      &::placeholder {
        color: rgba(255, 255, 255, 0.2);
      }
    }
  }

  &_speaker-edit {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 15px;
    align-items: center;

    .modal-field__input {
      width: auto;
      max-width: 70%;
      flex-grow: 1;
      padding: 5px;
      font-size: 18px;
    }
  }
}

.modal-button {
  border: 2px solid rgb(202, 165, 96);
  padding: 5px 10px;
  max-width: 100px;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s ease-in;

  &_dark {
    min-width: 90px;
    user-select: none;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid rgb(120, 120, 120);
    background: rgba(0, 0, 0, 0.85);
    color: rgb(120, 120, 120);
    font-family: "Pelagiad";
    font-size: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.2s ease-in;

    &:hover {
      color: white;
    }

    &-active {
      border: 2px solid rgb(204, 204, 204);
      color: black;
      background-color: rgb(204, 204, 204);

      &:hover {
        background-color: rgb(200, 200, 200);
        color: black;
      }
    }
  }

  &:hover {
    color: white;
  }

  &:disabled {
    color: gray;
    border: 2px solid gray;
    cursor: default;
  }
}

input[type="number"] {
  -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
