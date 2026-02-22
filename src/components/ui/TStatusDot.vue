<template>
  <span
    v-if="status"
    class="t-status-dot"
    :class="dotClass"
    :title="tooltip"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecordStatus } from '@/composables/useRecordStatus';

const props = withDefaults(defineProps<{
  /** Record edit status */
  status: RecordStatus;
  /** Optional tooltip text */
  tooltip?: string;
}>(), {
  tooltip: '',
});

const dotClass = computed(() => {
  if (!props.status) return '';
  return `t-status-dot--${props.status}`;
});
</script>

<style lang="scss" scoped>
@use '@/assets/_tokens.scss' as *;

.t-status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;

  &--new {
    background-color: $color-new-dot;
    border: solid 1px rgba(65, 140, 82, 0.9);
  }

  &--mod {
    background-color: $color-mod-dot;
    border: solid 1px rgba(79, 79, 136, 0.9);
  }

  &--del {
    background-color: $color-del-dot;
    border: solid 1px rgba(140, 65, 65, 0.9);
  }
}
</style>
