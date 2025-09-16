<template>
  <div class="comparison-select">
    <button 
      type="button"
      @click="model = 'Less'"
      class="comparison-select__btn"
      :class="{'comparison-select__btn_selected': model === 'Less'}"
    >
      {{ '<' }}
    </button>
    <button 
      type="button"
      @click="model = 'LessEqual'"
      class="comparison-select__btn"
      :class="{'comparison-select__btn_selected': model === 'LessEqual'}"
    >
      {{ '<=' }}
    </button>
    <div class="comparison-select__column">
      <button 
        type="button"
        @click="model = 'Equal'"
        class="comparison-select__btn"
        :class="{'comparison-select__btn_selected': model === 'Equal'}"
      >
        {{ '==' }}
      </button>
      <button 
        type="button"
        @click="model = 'NotEqual'"
        class="comparison-select__btn"
        :class="{'comparison-select__btn_selected': model === 'NotEqual'}"
      >
        {{ '!=' }}
      </button>
    </div>
    <button 
      type="button"
      @click="model = 'GreaterEqual'"
      class="comparison-select__btn"
      :class="{'comparison-select__btn_selected': model === 'GreaterEqual'}"
    >
      {{ '>=' }}
    </button>
    <button 
      type="button"
      @click="model = 'Greater'"
      class="comparison-select__btn"
      :class="{'comparison-select__btn_selected': model === 'Greater'}"
    >
      {{ '>' }}
    </button>
    <input 
      v-if="props.name"
      type="hidden"
      :name="props.name"
      :value="model"
    >
  </div>
</template>

<script setup lang="ts">
type Comparison = 'Less' | 'LessEqual' | 'Equal' | 'NotEqual' | 'GreaterEqual' | 'Greater' | null;

const model = defineModel<Comparison>();

const props = defineProps<{
  name?: string;
}>();
</script>

<style lang="scss">
.comparison-select {
  display: flex;
  gap: 5px;
  align-items: center;
  width: 100%;
  // justify-content: center;
  &__btn {
    background-color: rgba(182, 145, 76, 0.3);
    color: black;
    padding: 3px 10px;
    min-width: 40px;
    border-radius: 4px;
    user-select: none;
    &:hover {
      background-color: rgba(182, 145, 76, 0.4);
    }
    &_selected {
      background-color: rgb(182, 145, 76);
      pointer-events: none;
    }
  }
  &__column {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
}
</style>