<template>
  <div class="frame-upload">
    <h2 class="modal__title">Create a new journal quest</h2>
    <div class="modal-content">
      <form class="add-quest-form" @submit.prevent="createQuest()">
        <label class="modal-field">
          <span class="error" v-if="nameError" :key="index">{{ nameError }}</span>
          <input
            class="modal-field__input"
            name="quest-name"
            :placeholder="'Quest name'"
            v-model="inputName"
          />
        </label>
        <label class="modal-field">
          <span class="error" v-if="idError" :key="index">{{ idError }}</span>
          <input
            class="modal-field__input"
            name="quest-id"
            :placeholder="'Quest ID'"
            required
            v-model="inputId"
          />
        </label>
        <button type="submit" class="modal-button">Create</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePrimaryModal } from '@/stores/modals';
import { ref } from 'vue';
import { addJournalQuest } from '@/api/idb.js';

const nameError = ref<string>('');
const idError = ref<string>('');
const inputName = ref<string>('');
const inputId = ref<string>('');

const primaryModalStore = usePrimaryModal();
async function createQuest() {
  try {
    await addJournalQuest(inputId.value, inputName.value)
    primaryModalStore.setActiveModal('');
  } catch (error) {
    console.error(error);
  }
  //       this.$store.commit('addJournalQuest', [this.inputId, this.inputName]);
}
</script>

<style lang="scss">
.modal__title {
  color: rgba(0, 0, 0, 0.65);
  padding: 10px;
  font-weight: 500;
  margin-bottom: 20px;
}

.frame-upload {
  padding: 10px;
  margin: 2px;
  height: 100%;
  overflow-y: scroll;
}

.add-quest-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
}

.modal-content {
  display: flex;
  gap: 10px;
  .modal-tip {
    max-width: 200px;
    border: 2px solid rgba(0, 0, 0, 0.35);
    padding: 10px;
    background: rgba(255, 255, 255, 0.2);
  }
}
</style>
