<template>
  <div>
    <div class="frame-upload">
      <h2 class="modal__title">Create a new dialogue</h2>
      <form class="add-dialogue-form" @submit.prevent="createTopic()">
        <div v-if="!speakerName && speakerSelectedType.typeName !== 'Global'">
          <div class="add-dialogue-label">
            Choose {{ speakerSelectedType.typeId === 'speaker_id' ? 'an' : 'a' }}
            <span class="add-dialogue-label-select" tabindex="0" @focusout="speakerSelect = false">
              <span class="speaker-change" @click="speakerSelect = !speakerSelect">
                {{ speakerSelectedType.typeName }}
              </span>
              <transition name="fadeAppear">
                <div class="add-dialogue-label-select-items" v-if="speakerSelect">
                  <div
                    class="add-dialogue-label-select-items__item"
                    v-for="speakerType in speakerTypes"
                    :key="speakerType"
                    @click="((speakerSelectedType = speakerType), (speakerSelect = false))"
                  >
                    {{ speakerType.typeName }}
                  </div>
                </div>
              </transition>
              :
            </span>
          </div>

          <label class="modal-field">
            <span class="error" v-if="nameError" :key="index">{{ nameError }}</span>
            <input
              class="modal-field__input"
              name="speaker-name"
              autocomplete="off"
              :placeholder="`Type ${speakerSelectedType.typeName} name`"
              v-model="inputName"
            />
          </label>

          <div class="found-names" v-if="speakerSelectedType.typeId === 'speaker_id'">
            <div
              class="found-names-name"
              :class="{ 'found-names-name_active': !npc.TMP_dep }"
              v-for="npc in foundNPCs"
              :key="npc.id"
              @click="
                speakerId = npc.id;
                speakerName = npc.name;
              "
            >
              <div class="found-names-name__title">{{ npc.name }}</div>
              <div class="found-names-name__id">{{ npc.id }}</div>
            </div>
          </div>

          <div class="found-names" v-else>
            <div
              class="found-names-name"
              v-for="speaker in getSpeakersByType"
              :key="speaker.toString()"
              @click="((speakerName = speaker), (speakerId = ''))"
            >
              {{ speaker }}
            </div>
          </div>
        </div>
        <div v-else>
          <div class="add-dialogue-label">
            <span>Add </span>
            <span class="add-dialogue-label-select" tabindex="0" @focusout="speakerSelect = false">
              <span class="speaker-change" @click="speakerSelect = !speakerSelect">
                {{ dialogueSelectedType.typeName.toLowerCase() }}
              </span>
              <transition name="fadeAppear">
                <div class="add-dialogue-label-select-items" v-if="speakerSelect">
                  <div
                    class="add-dialogue-label-select-items__item"
                    v-for="dialogueType in dialogueTypes"
                    :key="dialogueType"
                    @click="((dialogueSelectedType = dialogueType), (speakerSelect = false))"
                  >
                    {{ dialogueType.typeName }}
                  </div>
                </div>
              </transition>
            </span>
            <span> to: </span>
            <span class="speaker-name"
              >{{ speakerSelectedType.typeName === 'Global' ? 'Global' : speakerName }}.</span
            >
            <!-- <span class="speaker-id">{{ ' (id: ' + speakerId + ')' }}</span> -->
            <a
              class="speaker-change"
              @click="
                speakerId = '';
                speakerName = '';
              "
              >{{ ' Change?' }}</a
            >
          </div>
          <div class="topic-create-controls">
            <label class="modal-field" v-if="dialogueSelectedType.typeId === 'Topic'">
              <input
                class="modal-field__input"
                name="dialogue-topic"
                :placeholder="`Type ${dialogueSelectedType.typeId === 'Topic' ? 'the' : 'a'} ${dialogueSelectedType.typeName.toLowerCase()}`"
                autocomplete="off"
                required
                v-model="inputTopic"
              />
            </label>
            <button type="submit" class="modal-button" :disabled="!inputTopic">Create</button>
          </div>
          <div class="found-names" v-if="dialogueSelectedType.typeId === 'Topic'">
            <div
              class="found-names-name"
              :class="{ 'found-names-name_active': !topic[0].TMP_dep }"
              v-for="topic in getTopics"
              :key="topic.id"
              @click.prevent="inputTopic = topic[0].id"
            >
              {{ topic[0].id }}
            </div>
          </div>

          <div class="found-names" v-else-if="dialogueSelectedType.typeId === 'Greeting'">
            <div
              class="found-names-name"
              v-for="topic in greetings"
              :key="topic"
              @click.prevent="inputTopic = topic"
            >
              {{ topic }}
            </div>
          </div>

          <div class="found-names" v-else-if="dialogueSelectedType.typeId === 'Persuasion'">
            <div
              class="found-names-name"
              v-for="topic in persuasions"
              :key="topic"
              @click.prevent="inputTopic = topic"
            >
              {{ topic }}
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { findNPCByName } from '@/api/idb';
import { debounce } from '@/assets/scripts/debounce';
export default {
  data() {
    return {
      nameError: '',
      idError: '',
      inputName: '',
      inputTopic: '',
      speakerName: '',
      speakerId: '',
      foundNPCs: [],
      dialogueType: 'Topic',
      speakerSelectedType: {
        typeName: 'NPC/Creature',
        typeId: 'speaker_id',
      },
      dialogueSelectedType: {
        typeName: 'Topic',
        typeId: 'Topic',
      },
      speakerTypes: [
        {
          typeName: 'NPC/Creature',
          typeId: 'speaker_id',
        },
        {
          typeName: 'Cell',
          typeId: 'speaker_cell',
        },
        {
          typeName: 'Faction',
          typeId: 'speaker_faction',
        },
        {
          typeName: 'Class',
          typeId: 'speaker_class',
        },
        {
          typeName: 'Race',
          typeId: 'speaker_rank',
        },
        {
          typeName: 'Global',
          typeId: '',
        },
      ],
      dialogueTypes: [
        {
          typeName: 'Topic',
          typeId: 'Topic',
        },
        {
          typeName: 'Greeting',
          typeId: 'Greeting',
        },
        {
          typeName: 'Persuasion',
          typeId: 'Persuasion',
        },
      ],
      greetings: [
        'Greeting 0',
        'Greeting 1',
        'Greeting 2',
        'Greeting 3',
        'Greeting 4',
        'Greeting 5',
        'Greeting 6',
        'Greeting 7',
        'Greeting 8',
        'Greeting 9',
      ],
      persuasions: [
        'Bribe Fail',
        'Bribe Success',
        'Admire Fail',
        'Admire Success',
        'Intimidate Fail',
        'Intimidate Success',
        'Taunt Fail',
        'Taunt Success',
        'Info Refusal',
        'Service Refusal',
      ],
      speakerSelect: false,
    };
  },
  watch: {
    inputName: {
      handler: debounce(function () {
        const vm = this;
        vm.searchNPCs();
      }, 200),
    },
    inputTopic() {
      debounce(function () {
        this.getTopics;
      }, 1000);
    },
  },
  methods: {
    async searchNPCs() {
      if (!this.inputName || this.inputName.length < 3) {
        this.foundNPCs = [];
        return;
      }
      const response = await findNPCByName(this.inputName);
      this.foundNPCs = response;
    },
    createTopic() {
      if (!this.inputTopic) return;
      else {
        console.log('SPEAKER_TYPE: ', this.speakerSelectedType.typeId);
        let location = this.$store.getters['getBestOrderLocationForNpc']([
          this.speakerId,
          this.inputTopic,
          this.dialogueSelectedType.typeId,
          this.speakerSelectedType.typeId,
        ]);
        console.log(location[2]);
        this.$store.commit('addDialogue', [
          this.speakerSelectedType.typeId,
          this.speakerId || this.speakerName,
          this.inputTopic,
          this.dialogueSelectedType.typeId,
          location[0],
          'next',
          'New entry',
        ]);
        this.$store.commit('setPrimaryModal', '');
        this.$store.commit('setDialogueModal', this.speakerId);
      }
    },
  },
  computed: {
    getTopics() {
      if (!this.inputTopic) return [];
      else return this.$store.getters['searchTopics'](this.inputTopic);
    },
    getSpeakersByType() {
      switch (this.speakerSelectedType.typeId) {
        case 'speaker_id':
          return [];
        case 'speaker_cell':
          return this.$store.getters['getCellList'].filter(
            (val) => val && val.toUpperCase().includes(this.inputName.toUpperCase()),
          );
        case 'speaker_rank':
          return this.$store.getters['getRaceList'].filter(
            (val) => val && val.toUpperCase().includes(this.inputName.toUpperCase()),
          );
        case 'speaker_class':
          return this.$store.getters['getClassList'].filter(
            (val) => val && val.toUpperCase().includes(this.inputName.toUpperCase()),
          );
        case 'speaker_faction':
          return this.$store.getters['getFactionList'].filter(
            (val) => val && val.toUpperCase().includes(this.inputName.toUpperCase()),
          );
        default:
          return [];
      }
    },
  },
};
</script>

<style lang="scss">
.modal__title {
  color: rgba(0, 0, 0, 0.65);
  padding: 10px;
  font-weight: 500;
  margin-bottom: 20px;
}

.frame-upload {
  padding: 10px;
  margin: 2px;
  height: 100%;
  overflow-y: scroll;
}

.topic-create-controls {
  display: flex;
  gap: 10px;
}

.add-dialogue-form {
  display: flex;
  flex-direction: column;
  //align-items: center;
  width: 100%;
  gap: 10px;
}

.speaker-name {
  color: rgb(233, 233, 233);
  text-shadow: 1px 1px 1px rgba(34, 34, 34, 1);
}

.speaker-change {
  cursor: pointer;
  color: rgb(71, 81, 138);
  &:hover {
    color: rgb(93, 103, 160);
  }
}

.add-dialogue-label {
  text-align: center;
  width: 100%;
  padding: 5px;
  user-select: none;
  &-select {
    position: relative;
    display: inline-block;
    &-items {
      background: #ddd;
      position: absolute;
      overflow: hidden;
      top: 25px;
      left: -10px;
      width: fit-content;
      padding: 5px 0;
      border-radius: 8px;
      box-shadow: 2px 2px 8px rgba(34, 34, 34, 0.15);
      text-align: left;
      display: flex;
      flex-direction: column;
      &__item {
        padding: 5px 15px;
        color: black;
        cursor: pointer;
        transition: background-color 0.05s linear;
        &:hover {
          background-color: rgba(0, 0, 0, 0.16);
        }
      }
    }
  }
}

.found-names {
  display: flex;
  height: 30vh;
  margin-top: 8px;
  margin-bottom: 8px;
  padding-right: 5px;
  max-height: 30vh;
  overflow-y: scroll;
  flex-direction: column;
  &-name {
    display: flex;
    cursor: pointer;
    padding: 10px 15px;
    min-height: 50px;
    align-items: center;
    border-top: 1px solid rgba(202, 165, 96, 0.5);
    transition: all 0.1s ease-in;
    &:last-child {
      border-bottom: 1px solid rgba(202, 165, 96, 0.5);
    }
    &:hover {
      background: rgba(0, 0, 0, 0.16);
    }
    &__title {
      margin-right: 20px;
      width: 40%;
    }
    &__id {
      font-size: 17px;
    }
    &_active {
      background: rgba(145, 215, 145, 0.2);
      &:hover {
        background: rgba(145, 215, 145, 0.3);
      }
    }
  }
}

.fadeAppear-enter-active,
.fadeAppear-leave-active {
  transition: all 0.1s cubic-bezier(1, 1, 1, 1);
  opacity: 100;
}

.fadeAppear-enter,
.fadeAppear-leave-to {
  opacity: 0;
}
</style>
