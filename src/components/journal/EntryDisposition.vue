<template>
  <form 
    class="disposition" 
    @reset.prevent="disposition = props.entry.data.disposition"
    @submit.prevent="handleSubmit"
  >
    <input 
      type="number"
      class="input-disposition"
      v-model="disposition"
      :disabled="!props.entry.TMP_is_active"
      max="9999"
    />
    <div v-if="disposition && disposition !== props.entry.data.disposition" class="disposition__controls">
      <button 
        type="submit" 
        class="disposition__btn disposition__btn_green"
      >
        <TdesignCheck />
      </button>
      <button 
        type="reset" 
        class="disposition__btn disposition__btn_red"
      >
        <TdesignClose />
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import TdesignCheck from '~icons/tdesign/check';
import TdesignClose from '~icons/tdesign/close';
import { modifyEntry } from '@/api/idb.ts';
import { useSelectedQuest } from '@/stores/selectedQuest';

const props = defineProps<{
  entry: Object;
}>();

const selectedQuestStore = useSelectedQuest();

const disposition = ref<number>(0);
watch(() => props.entry.data.disposition, () => {
  disposition.value = props.entry.data.disposition;
}, {
  immediate: true,
});

async function handleSubmit() {
  try {
    await modifyEntry({
      TMP_index: props.entry.TMP_index,
      data: {
        ...props.entry.data,
        disposition: disposition.value,
      }
    });
    await selectedQuestStore.fetchQuest(props.entry.TMP_topic, { reload: false });
  } catch (error) {
    console.error(error);
  }
}
</script>

<style lang="scss">
.disposition {
  &__controls {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  &__btn {
    width: 100%;
    background-color: white;
    border-radius: 4px;
    opacity: 0.8;
    transition: all .15s ease-in;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
      opacity: 1;
    }
    &_green {
      background-color: rgba(89, 170, 106, 0.7);
    }
    &_red {
      background-color: rgba(150, 50, 30, 0.7);
    }
  }
}
</style>