<template>
  <div class="journal-frame">
    <div class="journal-frame__header" v-if="true">
      <div class="frame-title">Journal</div>
      <div class="journal-frame__controls">
        <div class="add-quest" @click="addQuest()">
          New <icon name="plus-circle" class="add-quest__button" scale="1"></icon>
        </div>
      </div>
    </div>
    <div v-if="getJournal.length" class="quests">
      <transition-group name="fadeHeight" mode="out-in" :style="{ width: '100%' }">
        <JournalFrameQuest v-for="quest in getJournal" :key="quest.id || 0" :quest="quest" />
      </transition-group>
    </div>
  </div>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  computed: {
    getJournal() {
      return this.$store.getters['getAllQuestIDs'];
    },
    getQuestNamesList() {
      let questNames = this.getJournal.map(
        (val) => `["${val.id.toLowerCase()}"]: "${val.name || 'skip'}",`,
      );
      return questNames;
    },
    getHighlighted() {
      return this.$store.getters['getJournalHighlight'];
    },
    getHighlightedId() {
      let valueObj = this.getHighlighted.value;
      if (valueObj) return this.getHighlighted.id + Object.values(valueObj)[0];
    },
  },
  watch: {
    async getHighlightedId(newValue) {
      console.log(newValue);
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (newValue) {
        const el = document.getElementById(newValue);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    },
  },
  components: { Icon },
  methods: {
    addQuest() {
      this.$store.commit('setPrimaryModal', 'NewQuest');
    },
  },
};
</script>

<style lang="scss">
.frame-title {
  width: 100%;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  color: rgb(202, 165, 96);
  background: rgb(48, 48, 48);
}

.journal-frame {
  background-color: #986;
  //box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
  z-index: 2;
  //padding: 10px;
  min-width: 500px;
  max-width: 500px;
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  font-family: 'Pelagiad';
  position: relative;

  &__header {
    background-color: rgb(71, 71, 71);
    box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, 0.25);
    z-index: 2;
  }

  &__controls {
    font-size: 22px;
    padding: 10px;

    //display: flex;
    width: 100%;
    //top: 10px;
  }
}

.quests {
  display: flex;
  height: 100%;
  width: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
  flex-grow: 1;
  padding: 10px 15px 10px 10px;
  gap: 5px;
  flex-direction: column;
  align-items: center;
}

.add-quest {
  cursor: pointer;
  background: rgba(0, 0, 0, 0.65);
  color: rgb(202, 165, 96);
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 3px 10px;
  border-radius: 4px;
  transition: all 0.1s ease-in;

  &:hover {
    color: white;

    .add-quest__button {
      fill: white;
    }
  }

  &__button {
    transition: all 0.1s ease-in;
    fill: rgb(202, 165, 96);
  }
}

.fadeHeight-enter-active,
.fadeHeight-leave-active {
  transition: all 0.15s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fadeHeight-enter,
.fadeHeight-leave-to {
  opacity: 0%;
}
</style>
