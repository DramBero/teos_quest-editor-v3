<template>
  <div class="workspace-desk">
    <workspace-controls />
    <transition-group name="fadeSidebarr" :style="{ display: 'flex', width: '100%', height: '100%' }" mode="out-in">
      <Sidebar v-show="getSidebar" :key="1" />

      <DialogueFrame v-show="true" :key="2" />
    </transition-group>
  </div>
</template>

<script>
export default {
  computed: {
    getSidebar() {
      return this.$store.getters['getSidebarActive'] !== '';
    },
  },
};
</script>

<style>
.workspace-desk {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}

.fadeSidebar-enter-active,
.fadeSidebar-leave-active {
  transition: all 0.3s ease-out;
  transform: translateX(0);
}

.fadeSidebar-enter,
.fadeSidebar-leave-to {
  transform: translateX(-100%);
}
</style>
