<template>
  <div class="journal-frame">
    <div class="journal-frame__header" v-if="true">
      <div class="frame-title">Factions</div>
      <div class="journal-frame__controls">
        <div class="add-quest" @click="addQuest()">
          New <icon name="plus-circle" class="add-quest__button" scale="1"></icon>
        </div>
      </div>
    </div>
    <div class="header-content">
      <div class="faction" v-for="faction in getFactions" :key="faction.id">
        <h3>{{ faction.name }}</h3>
        <!--       <div class="faction-rank" v-for="rank, index in faction.rank_names" :key="rank">
        <span class="faction-rank__index">{{ index + 1 }}. </span>
        <span class="faction-rank__name">{{ rank }}</span>
      </div> -->
      </div>
    </div>

    <!--

  Header
  Journal
  Factions
  ? Items -> Armor, Weapons, Clothing, Books, Apparatus, Misc Items, Gold
  ? Actors -> Creatures, NPCs, Races, Classes, Attributes, Skills
  ? Actions -> Scripts, Global vars, Activators
  ? Cells -> Ext, Int
  ? Magic -> Spells

  

  Dialogues
  Quests
  
  Modals:
    Books
    Scripts

-->

    <!--     <div class="journal-frame__header" v-if="true">
      <div class="frame-title">Header</div>
    </div>
    <div class="header-content">
      <span class="modal-field__name"> Plugin name: </span>
      <div class="header-content__row">
        <label class="modal-field modal-field_dark">
          <input
            class="modal-field__input"
            name="speaker-name"
            autocomplete="off"
            :placeholder="'Type plugin name'"
            v-model="name"
          />
        </label>
        <button
          class="modal-button modal-button_dark"
          :class="{
            'modal-button_dark-active': file_type.toUpperCase() === 'ESP'
          }"
          @click="file_type = 'Esp'"
        >
          ESP
        </button>
        <button
          class="modal-button modal-button_dark"
          :class="{
            'modal-button_dark-active': file_type.toUpperCase() === 'ESM'
          }"
          @click="file_type = 'Esm'"
        >
          ESM
        </button>
      </div>

      <div class="header-content__row">
        <label class="modal-field modal-field_dark">
          <span class="modal-field__name"> Version: </span>
          <input
            class="modal-field__input"
            name="speaker-name"
            autocomplete="off"
            :placeholder="'Type version'"
            v-model="version"
          />
        </label>
        <label class="modal-field modal-field_dark">
          <span class="modal-field__name"> Author: </span>
          <input
            class="modal-field__input"
            name="speaker-name"
            autocomplete="off"
            :placeholder="'Type author'"
            v-model="author"
          />
        </label>
      </div>
      <label class="modal-field modal-field_dark">
        <span class="modal-field__name"> Description: </span>
        <textarea
          class="modal-field__input modal-field__input_textarea"
          name="speaker-name"
          autocomplete="off"
          :placeholder="'Type description'"
          v-model="description"
        ></textarea>
      </label>
      <span class="modal-field__name"> Dependencies: </span>
      <div class="header-dependencies">
        <transition-group
          is="draggable"
          tag="tbody"
          :list="dependencies"
          :name="!drag ? 'flip-list' : null"
          :handle="'.grab'"
          @start="drag = true"
          @end="drag = false"
          :scroll-sensitivity="500"
          animation="200"
        >
          <div
            class="header-dependencies__item"
            v-for="dep in dependencies"
            :key="dep[0]"
          >
            <span>{{ dep[0] }}</span>
            <icon name="grip-horizontal" class="grab" scale="1"></icon>
          </div>
        </transition-group>
      </div>
      <div class="header-buttons">
        <button
          class="modal-button header-buttons__button"
          @click="saveHeader"
        >
          Save
        </button>
        <button
          class="modal-button header-buttons__button"
          @click="cancelChanges"
        >
          Cancel
        </button>
      </div>
    </div> -->
  </div>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import draggable from 'vuedraggable';
import 'vue-awesome/icons';
export default {
  data() {
    return {};
  },
  watch: {},
  computed: {
    getFactions() {
      return this.$store.getters['getFactions'];
    },
  },
  components: { Icon, draggable },
  methods: {},
};
</script>

<style lang="scss">
.header-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  gap: 5px;
  &__row {
    display: flex;
    flex-direction: row;
    gap: 15px;
  }
}

.header-buttons {
  display: flex;
  margin-top: 10px;
  gap: 15px;
  &__button {
    font-size: 20px;
  }
}

.header-dependencies {
  width: 100%;
  display: flex;
  flex-direction: column;
  &__item {
    border-top: 1px solid rgba(0, 0, 0, 0.25);
    color: rgba(0, 0, 0, 0.8);
    font-size: 18px;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    &:last-child {
      border-bottom: 1px solid rgba(0, 0, 0, 0.25);
    }
    .grab {
      cursor: grab;
    }
  }
}

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
