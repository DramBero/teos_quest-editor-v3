<template>
  <div
    class="dialogue-filters"
    @dragover.prevent
    @dragenter.prevent="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div
      class="dialogue-filters__filter dialogue-filters__filter_speaker"
      v-for="speakerType in !onlyFilters ? getOtherSpeakers : []"
      :key="speakerType.value + speakerType.type"
      tabindex="0"
      @focus="handleFilter(filter)"
      @focusout="handleFilter({})"
    >
      <span class="filter__if">if </span>
      <span class="filter__function">{{ speakerType.type }} </span>
      <span class="filter__comparison">== </span>
      <span class="filter__value">{{ speakerType.value }}</span>
      <span>
        <icon
          v-if="editMode"
          @click.stop="
            editFilter(
              {
                filter_comparison: 'Equal',
                filter_type: speakerType.type,
                value: {
                  Integer: speakerType.value,
                },
              },
              speakerType.type,
            )
          "
          name="pen"
          class="filter__edit"
          scale="1"
        ></icon>
      </span>
    </div>

    <div
      class="dialogue-filters__filter dialogue-filters__filter_disp"
      v-if="!onlyFilters && answer.data.disposition > 0"
      key="disposition"
      tabindex="0"
      @focus="handleFilter(filter)"
      @focusout="handleFilter({})"
    >
      <span class="filter__if">if </span>
      <span class="filter__function">Disposition </span>
      <span class="filter__comparison">> </span>
      <span class="filter__value">{{ answer.data.disposition }}</span>
      <span>
        <icon
          v-if="editMode"
          @click.stop="
            editFilter(
              {
                filter_comparison: 'Greater',
                filter_type: 'Disposition',
                value: {
                  Integer: speakerType.value,
                },
              },
              'Disposition',
            )
          "
          name="pen"
          class="filter__edit"
          scale="1"
        ></icon>
      </span>
    </div>

    <div class="filter-wrapper" v-for="(filter, index) in getFiltersByInfoId" :key="index">
      <div
        class="dialogue-filters__filter"
        tabindex="0"
        @click="handleFilter(filter)"
        @focusout="removeHighlight"
      >
        <span class="filter__if">if </span>
        <span class="filter__function"
          >{{ filter.filter_type === 'Function' ? filter.filter_function : filter.filter_type }}
        </span>
        <span class="filter__id">{{ filter.id }} </span>
        <span class="filter__comparison">{{ parseComparison(filter.filter_comparison) }} </span>
        <span class="filter__value">{{ Object.values(filter.value)[0] }}</span>
        <span>
          <icon
            v-if="editMode"
            @click.stop="editFilter(filter, index)"
            name="pen"
            class="filter__edit"
            scale="1"
          ></icon>
        </span>
      </div>
      <div class="filter-delete" @click.stop="deleteFilter(filter.slot)">
        <icon v-if="editMode" name="times" class="filter-delete__icon" scale="0.8"></icon>
      </div>
    </div>

    <div class="dialogue-filters__filter" :key="'tempFilter'" tabindex="0" v-show="newFilterType">
      <span class="filter__if">if </span>
      <span class="filter__function">{{ newFilterType }} </span>
      <span class="filter__id">{{ newFilterTopic }} </span>
      <span class="filter__comparison">? </span>
      <span class="filter__value">{{ newFilterIndex }}</span>
      <span>
        <icon
          v-if="editMode"
          @click.stop="editFilter(filter, index)"
          name="pen"
          class="filter__edit"
          scale="1"
        ></icon>
      </span>
      <div class="comparisons__overlay">
        <div
          @click.prevent
          ref="comparisons"
          class="comparisons"
          @mouseleave="removeHighlight"
          tabindex="0"
          @focusout="removeTempFilter"
        >
          <span
            class="comparisons__item"
            v-for="comparison in comparisons"
            :key="comparison.id"
            @mouseover="comparisonOver(comparison.id)"
            @click="addDropFilter(comparison.id)"
          >
            {{ comparison.text }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="dialogue-filters__filter no-pointer-events"
      :key="'newFilter'"
      tabindex="0"
      v-if="dragOver && !newFilterType"
    >
      <span class="filter__function">New filter...</span>
    </div>

    <icon
      v-if="editMode && !newFilterType && !dragOver"
      @click="addFilter()"
      name="plus-circle"
      class="icon_gray"
      scale="1.5"
    ></icon>
  </div>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import 'vue-awesome/icons';
export default {
  props: {
    answer: {
      type: Object,
    },
    speaker: {
      type: String,
    },
    editMode: {
      type: Boolean,
    },
    onlyFilters: {
      type: Boolean,
    },
  },
  components: {
    Icon,
  },
  data() {
    return {
      newFilterTopic: '',
      newFilterIndex: '',
      newFilterType: '',
      dragOver: false,
      showComparisons: false,
      filterReactivityTrigger: 0,
      comparisons: [
        {
          id: 'Less',
          text: '<',
        },
        {
          id: 'LesserEqual',
          text: '<=',
        },
        {
          id: 'Equal',
          text: '==',
        },
        {
          id: 'NotEqual',
          text: '!=',
        },
        {
          id: 'GreaterEqual',
          text: '>=',
        },
        {
          id: 'Greater',
          text: '>',
        },
      ],
    };
  },
  computed: {
    getFiltersByInfoId() {
      return this.answer.filters;
      /*       this.filterReactivityTrigger
      return this.$store.getters['getFiltersByInfoId'](this.answer.info_id) */
    },
    getOtherSpeakers() {
      return [
        {
          type: 'Speaker ID',
          value: this.answer.speaker_id,
        },
        {
          type: 'Speaker Cell',
          value: this.answer.speaker_cell,
        },
        {
          type: 'Speaker Faction',
          value: this.answer.speaker_faction,
        },
        {
          type: 'Speaker Class',
          value: this.answer.speaker_class,
        },
        {
          type: 'Speaker Sex',
          value: this.answer.data.speaker_sex !== 'Any' ? this.answer.data.speaker_sex : '',
        },
        {
          type: 'Speaker Rank',
          value: this.answer.data.speaker_rank !== -1 ? this.answer.data.speaker_rank : '',
        },
        {
          type: 'Speaker Race',
          value: this.answer.speaker_rank,
        },
        {
          type: 'Player Rank',
          value: this.answer.data.player_rank !== -1 ? this.answer.data.player_rank : '',
        },
        {
          type: 'Player Faction',
          value: this.answer.player_faction,
        },
      ].filter((val) => val.value && val.value !== this.speaker);
    },
  },
  methods: {
    handleFilter(filter) {
      if (filter.filter_function === 'JournalType') {
        this.$store.commit('setSidebarActive', 'Journal');
        this.$store.commit('setJournalHighlight', filter);
      } else {
        this.removeHighlight();
      }
    },
    removeHighlight() {
      this.$store.commit('setJournalHighlight', {});
    },
    addFilter() {
      this.$store.commit('setSelectedFilter', {});
      this.$store.commit('setSelectedInfoId', this.answer.info_id);
      this.$store.commit('setSelectedFilterIndex', '');
      this.$store.commit('setPrimaryModal', 'NewFilter');
      this.filterReactivityTrigger++;
    },
    deleteFilter(slot) {
      this.$store.commit('deleteDialogueFilter', [this.answer.info_id, slot]);
      this.filterReactivityTrigger++;
    },
    addDropFilter(comparison) {
      if (this.newFilterType === 'Journal') {
        let filter = {
          filter_comparison: comparison,
          filter_function: 'JournalType',
          filter_type: 'Journal',
          id: this.newFilterTopic,
          value: {
            Integer: this.newFilterIndex,
          },
        };
        this.$store.commit('addFilter', [filter, this.answer.info_id]);
      }
      this.removeTempFilter();
      this.filterReactivityTrigger++;
    },
    editFilter(filter, index) {
      this.$store.commit('setSelectedFilter', filter);
      this.$store.commit('setSelectedInfoId', this.answer.info_id);
      this.$store.commit('setSelectedFilterIndex', index);
      this.$store.commit('setPrimaryModal', 'NewFilter');
    },
    parseComparison(comparison) {
      switch (comparison) {
        case 'Equal':
          return '==';
        case 'GreaterEqual':
          return '>=';
        case 'LesserEqual':
          return '<=';
        case 'Less':
          return '<';
        case 'Greater':
          return '>';
        case 'NotEqual':
          return '!=';
        default:
          return comparison;
      }
    },
    handleDragLeave(event) {
      this.dragOver = false;
    },
    handleDragEnter(event) {
      this.dragOver = true;
      //dialogue-filters
    },
    async handleDrop(event) {
      if (event.dataTransfer.getData('type') === 'Journal') {
        this.dragOver = false;
        (this.newFilterTopic = event.dataTransfer.getData('topic')),
          (this.newFilterIndex = event.dataTransfer.getData('disposition'));
        this.newFilterType = event.dataTransfer.getData('type');
        this.showComparisons = true;
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.$refs.comparisons.focus();
      }
    },
    comparisonOver(comparison) {
      let filter = {
        id: this.newFilterTopic,
        value: {
          Integer: this.newFilterIndex,
        },
        filter_comparison: comparison,
      };
      this.$store.commit('setJournalHighlight', filter);
    },
    removeTempFilter() {
      this.newFilterIndex = '';
      this.newFilterTopic = '';
      this.newFilterType = '';
    },
  },
};
</script>

<style lang="scss">
.dialogue-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  &__filter {
    display: inline-block;
    cursor: pointer;
    align-items: center;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    padding: 5px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    width: fit-content;
    //position: relative;
    &_disp {
      background: rgba(255, 255, 255, 0.2);
      color: rgb(185, 185, 166);
    }
    &_speaker {
      background: rgba(121, 105, 82, 0.6);
      color: rgb(185, 185, 166);
    }
  }
}

.filter {
  &__if {
    color: rgb(56, 134, 60);
  }
  &__edit {
    margin-left: 15px;
    transition: all 0.2s ease-out;
    &:hover {
      fill: rgba(0, 0, 0, 0.5);
    }
  }
  &-wrapper {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  &-delete {
    padding: 5px;
    cursor: pointer;
    &__icon {
      fill: rgb(202, 165, 96);
    }
  }
}

.comparisons {
  /*   position: absolute;
  top: 0;
  left: 0; */
  //transform: translate(50%, -50%);
  //z-index: 2;
  //width: 200px;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.8);
  border: 2px solid rgb(202, 165, 96);
  border-radius: 8px;
  //padding: 15px;
  align-items: center;
  justify-content: stretch;
  overflow: hidden;
  &__overlay {
    position: fixed;
    width: 100%;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  &__item {
    color: rgb(185, 185, 166);
    padding: 5px 50px;
    width: 100%;
    text-align: center;
    cursor: pointer;
    transition: all 0.05s linear;
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
      //color: black;
    }
  }
}

.no-pointer-events {
  pointer-events: none;
}
</style>
