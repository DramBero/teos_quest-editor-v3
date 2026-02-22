<template>
  <span
    v-if="count"
    class="t-badge"
    :class="badgeClass"
  >
    {{ count }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  /** Number to display */
  count: number;
  /** Visual variant */
  variant?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  /** Size */
  size?: 'sm' | 'md';
}>(), {
  variant: 'success',
  size: 'sm',
});

const badgeClass = computed(() => [
  `t-badge--${props.variant}`,
  `t-badge--${props.size}`,
]);
</script>

<style lang="scss" scoped>
@use '@/assets/_tokens.scss' as *;

.t-badge {
  border-radius: 10px;
  color: black;
  font-size: $font-size-sm;
  font-family: $font-main;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  line-height: 1.4;
  min-width: 20px;

  &--sm {
    font-size: $font-size-sm;
    padding: 0 5px;
  }

  &--md {
    font-size: $font-size-md;
    padding: 1px 8px;
  }

  &--success {
    background-color: $color-new-dot;
  }

  &--info {
    background-color: $color-mod-dot;
  }

  &--warning {
    background-color: rgba(245, 158, 11, 0.9);
  }

  &--danger {
    background-color: $color-del-dot;
  }

  &--neutral {
    background-color: rgba(180, 180, 180, 0.9);
  }
}
</style>
