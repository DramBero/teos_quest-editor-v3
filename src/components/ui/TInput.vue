<template>
  <input
    class="t-input"
    :class="inputClass"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  variant?: 'dark' | 'light' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  type?: string;
  disabled?: boolean;
}>(), {
  modelValue: '',
  placeholder: '',
  variant: 'dark',
  size: 'md',
  type: 'text',
  disabled: false,
});

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const inputClass = computed(() => [
  `t-input--${props.variant}`,
  `t-input--${props.size}`,
]);
</script>

<style lang="scss" scoped>
@use '@/assets/_tokens.scss' as *;

.t-input {
  font-family: $font-main;
  outline: none;
  border: none;
  border-radius: $border-radius-sm;
  transition: all $transition-fast;
  width: 100%;

  &--dark {
    background: $input-bg;
    color: $color-text;
  }

  &--light {
    background: rgba(255, 255, 255, 0.18);
    color: $color-text-dark;
    border: 2px solid $color-accent;

    &:focus {
      border-color: rgba(255, 255, 255, 0.18);
    }
  }

  &--inline {
    background: transparent;
    color: $color-text;
    border-bottom: 1px solid $color-accent-dim;
    border-radius: 0;

    &:focus {
      border-bottom-color: $color-accent;
    }
  }

  &--sm {
    font-size: $font-size-sm;
    padding: 5px 8px;
  }

  &--md {
    font-size: $font-size-md;
    padding: $input-padding;
  }

  &--lg {
    font-size: $font-size-lg;
    padding: 10px 12px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
