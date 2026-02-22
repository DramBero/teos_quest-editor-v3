<template>
  <button
    class="t-btn"
    :class="btnClass"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'default' | 'dark' | 'dark-active' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
});

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const btnClass = computed(() => [
  `t-btn--${props.variant}`,
  `t-btn--${props.size}`,
]);
</script>

<style lang="scss" scoped>
@use '@/assets/_tokens.scss' as *;

.t-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-sm;
  font-family: $font-main;
  border: none;
  border-radius: $border-radius-sm;
  transition: all $transition-fast;
  user-select: none;
  white-space: nowrap;
  background: none;
  color: inherit;

  // ── Sizes ──
  &--sm {
    font-size: $font-size-sm;
    padding: 2px 6px;
  }

  &--md {
    font-size: $font-size-md;
    padding: $btn-dark-padding;
  }

  &--lg {
    font-size: $font-size-lg;
    padding: 5px 14px;
  }

  // ── Variants ──
  &--default {
    border: 2px solid $color-accent;
    padding: 5px 10px;
    max-width: 100px;

    &:hover {
      color: white;
    }

    &:disabled {
      color: gray;
      border-color: gray;
      cursor: default;
    }
  }

  &--dark {
    background: $btn-dark-bg;
    color: $btn-dark-color;

    &:hover {
      color: white;
    }
  }

  &--dark-active {
    background: $color-accent;
    color: $btn-dark-bg;

    &:hover {
      background: darken(rgb(202, 165, 96), 5%);
    }
  }

  &--ghost {
    background: transparent;
    color: $color-text-dim;

    &:hover {
      color: $color-text-bright;
      background: rgba(255, 255, 255, 0.06);
    }
  }

  &--danger {
    background: rgba(120, 44, 44, 0.8);
    color: rgba(255, 200, 200, 0.9);

    &:hover {
      background: rgba(150, 44, 44, 0.9);
      color: white;
    }
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}
</style>
