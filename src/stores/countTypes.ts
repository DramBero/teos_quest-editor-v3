import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { getCountTypes } from '@/api/idb.js';

export const useCountTypes = defineStore('countTypes', () => {
  const countTypes = ref<Object[]>();
  async function updateCountTypes() {
    countTypes.value = await getCountTypes();
  }
  const getTypesAmount = computed(() => countTypes.value);

  return { countTypes, updateCountTypes, getTypesAmount };
});


