import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useClassicView = defineStore('classicView', () => {
  const classicView = ref<boolean>(false);
  function setClassicView(value: boolean) {
    classicView.value = value;
  }
  const getClassicView = computed(() => classicView.value);

  return { classicView, setClassicView, getClassicView };
});

export const useClassicViewTopic = defineStore('classicViewTopic', () => {
  const classicViewTopic = ref<string>('');
  function setClassicViewTopic(value: string) {
    classicViewTopic.value = value;
  }
  const getClassicViewTopic = computed(() => classicViewTopic.value);

  return { classicViewTopic, setClassicViewTopic, getClassicViewTopic };
});
