<template>
  <a :href="getDownloadLink" :download="getPluginTitle + '.json'" class="open-btn">
    <icon name="save" scale="1.3"></icon>
  </a>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  components: {
    Icon,
  },
  computed: {
    getPluginTitle() {
      return this.$store.getters['getActivePluginTitle'];
    },
    getPluginData() {
      return (
        this.$store.getters['getActivePlugin'] &&
        this.$store.getters['getActivePlugin'].map((val) =>
          Object.fromEntries(
            Object.entries(val).filter(
              ([key]) =>
                !key.includes('TMP_topic') &&
                !key.includes('TMP_type') &&
                !key.includes('old_values'),
            ),
          ),
        )
      );
    },
    getDownloadLink() {
      return (
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.getPluginData))
      );
    },
  },
  methods: {
    testPlugin() {
      //console.log(this.getPluginData)
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
  margin-left: 2px;
  background-color: rgba(255, 255, 255, 0.2);
  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
