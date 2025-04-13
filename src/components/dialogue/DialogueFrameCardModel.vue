<template>
  <TresGroup :rotation-y="'-0.3'">
    <TresMesh v-if="head">
      <GLTFModel :path="head" />
    </TresMesh>
    <TresMesh v-if="hair">
      <GLTFModel :path="hair" />
    </TresMesh>
  </TresGroup>
</template>

<script setup lang="ts">
import { GLTFModel } from '@tresjs/cientos';

const props = defineProps({
  head: String,
  hair: String,
})
</script>