<template>
  <div class="frame-upload">
    <h2 class="modal__title">Upload your plugin and its masters</h2>
    <table class="dep-table" v-if="getDependencies && getDependencies.length > 0">
      <tbody>
        <tr
          v-for="dep in getDependencies"
          :key="dep"
          class="dep-table__row"
        >
          <td class="dep-table__name">{{ dep }}</td>
          <td class="dep-table__status">
            <ToolBarReadFile :dep="dep" />
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="frame-upload__empty">No dependencies</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ToolBarReadFile from '@/components/toolbar/ToolBarReadFile.vue';
import { usePluginHeader } from '@/stores/pluginHeader';

const headerStore = usePluginHeader();
const getHeader = computed(() => {
  return headerStore.getPluginHeader;
})
const getDependencies = computed(() => {
  return getHeader.value?.masters?.map((val: [string, number]) => val[0]) || [];
})
</script>

<style lang="scss">
.modal__title {
  color: rgba(0, 0, 0, 0.65);
  padding: 10px 10px 0;
  font-weight: 500;
  margin-bottom: 12px;
}

.frame-upload {
  padding: 10px;
  margin: 2px;
  height: 100%;
  overflow-y: auto;

  &__empty {
    color: rgba(0, 0, 0, 0.4);
    font-style: italic;
    padding: 10px;
  }
}

.dep-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 4px;

  &__row {
    .dep-table__name {
      padding-left: 10px;
    }
  }

  &__name {
    padding: 6px 12px;
    font-size: 17px;
    color: rgba(0, 0, 0, 0.7);
    white-space: nowrap;
    width: 1%;
    vertical-align: middle;
  }

  &__status {
    text-align: right;
    vertical-align: middle;
    padding: 4px 0;
  }
}
</style>
