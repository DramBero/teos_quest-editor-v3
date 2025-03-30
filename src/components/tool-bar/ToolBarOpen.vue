<template>
  <button class="open-btn" @click="toggleOpenModal">
    <icon name="folder-open" scale="1.3"></icon>
  </button>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  components: {
    Icon,
  },
  methods: {
    toggleOpenModal() {
      this.$store.commit('setPrimaryModal', 'Upload');
    },
  },
};
</script>

<style lang="scss">
.open-btn {
  font-family: 'Pelagiad';
  font-size: 23px;
  display: flex;
  align-items: center;
  padding: 10px 15px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
