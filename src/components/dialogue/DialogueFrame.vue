<template>
  <div class="frame">
    <div class="frame-controls">
      <div class="frame-controls-left">
        <div class="frame-controls-types__type frame-controls-types__type_active" :style="{ gap: '10px' }"
          @click="addDialogue()">
          Add <icon name="plus-circle" scale="1"></icon>
        </div>
        <div class="frame-controls-types__secondary" :style="{ gap: '10px' }" @click="openClassicView()">
          Classic view
        </div>
        <!--         <form class="search-input" @submit.prevent="filterSpeakers">
        <label class="modal-field modal-field_dark">
          <input
            class="modal-field__input"
            name="speaker-name"
            autocomplete="off"
            :placeholder="'Find speaker'"
            v-model="speakerSearch"
          />
        </label>
        <button type="submit" class="search-input__button">
          <icon name="search" class="search-input__icon" scale="1.3"></icon>
        </button>
      </form> -->
      </div>
      <div class="frame-controls-types" v-if="getCurrentSpeakers && getCurrentSpeakers.length">
        <template v-for="speakerType in speakerTypes">
          <div :key="speakerType" v-if="getSpeakerLength(speakerType)" class="frame-controls-types__type" :class="{
            'frame-controls-types__type_active': currentSpeakerType === speakerType,
          }" @click="currentSpeakerType = speakerType">
            {{ speakerType }} {{ getSpeakerLength(speakerType) }}
          </div>
        </template>
        <!--         <div
          class="frame-controls-types__type frame-controls-types__type_generic"
          @click="openGeneric"
          v-if="getDialogueGlobalExist"
        >
          Global
        </div> -->
      </div>
    </div>
    <div class="frame-dialogue__wrapper">
      <transition-group name="fadeHeight" class="frame-dialogue" mode="out-in" :style="{ width: '100%' }">
        <DialogueFrameCard v-for="speaker in getCurrentSpeakers" :key="speaker" :speakerId="speaker"
          :speakerType="currentSpeakerType" />
      </transition-group>
    </div>
  </div>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  components: { Icon },
  data() {
    return {
      speakerTypes: ['npc', 'cell', 'class', 'faction', 'rank', 'global'],
      currentSpeakerType: 'npc',
      speakerSearch: '',
    };
  },
  computed: {
    getCurrentSpeakers() {
      return this.$store.getters['getAllSpeakers'](this.currentSpeakerType);
    },
    getDialogueGlobalExist() {
      return this.$store.getters['getDialogueGlobalExist'];
    },
  },
  methods: {
    getSpeakerLength(speakerType) {
      return this.$store.getters['getAllSpeakers'](speakerType).length;
    },
    toggleType(type) {
      if (this.speakerTypes.includes(type)) {
        this.speakerTypes = this.speakerTypes.filter((val) => val != type);
      } else {
        this.speakerTypes.push(type);
      }
    },
    openClassicView() {
      this.$store.commit('setClassicView', true);
    },
    addDialogue() {
      this.$store.commit('setPrimaryModal', 'NewDialogue');
    },
    openGeneric() {
      this.$store.commit('setDialogueModal', 'Global Dialogue');
    },
  },
};
</script>

<style lang="scss">
.frame {
  display: flex;

  position: relative;
  transition: all 0.3s cubic-bezier(1, 1, 1, 1);
  height: 100%;
  width: 100%;
  flex-direction: column;

  &-controls {
    display: flex;
    justify-content: space-between;
    padding: 10px;

    &-left {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    &-types {
      display: flex;
      gap: 5px;

      &__secondary {
        font-size: 20px;
        color: rgb(202, 165, 96);
        cursor: pointer;
        transition: color 0.15s ease-in;

        &:hover {
          color: rgb(223, 200, 157);
        }
      }

      &__type {
        min-width: 90px;
        user-select: none;
        border-radius: 4px;
        cursor: pointer;
        height: 40px;
        border: 2px solid rgb(120, 120, 120);
        background: rgba(0, 0, 0, 0.85);
        color: rgb(120, 120, 120);
        font-family: 'Pelagiad';
        font-size: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: all 0.2s ease-in;

        &:hover {
          color: white;
        }

        &_generic {
          border: 2px solid rgba(255, 255, 255, 0.4);
          color: black;
          background-color: rgba(160, 160, 160, 1);

          &:hover {
            background-color: rgb(200, 200, 200);
            color: black;
          }
        }

        &_active {
          border: 3px solid rgb(202, 165, 96);
          background: rgb(202, 165, 96);
          color: black;

          &:hover {
            color: black;
            background-color: rgba(202, 165, 96, 0.7);
          }
        }
      }
    }
  }
}

.frame-dialogue {
  position: relative;
  overflow-y: scroll;
  //flex-grow: 1;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 20px 20px 30px 20px;
  display: flex;
  //flex-grow: 1;
  justify-content: center;
  margin: 0 auto;
  //grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 10px;

  &__wrapper {
    width: auto;
    display: flex;
    justify-content: center;
    overflow-y: scroll;
  }
}

.search-input {
  display: flex;
  gap: 10px;
  align-items: center;

  &__icon {
    fill: rgb(202, 165, 96);
    transition: opacity 0.3s ease-in-out;
  }

  &__button {
    display: flex;
    align-items: center;

    &:hover {
      opacity: 0.7;
    }
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
