<template>
  <div class="frame-upload">
    <h2 class="modal__title">Dialogue requirement</h2>

    <div class="filter-constructor">
      <div
        class="filter-constructor-start"
        :class="{ 'filter-constructor-start_rounded': currentValue !== '' }"
      >
        <span class="filter__if">if </span>
        <span
          class="filter__function filter-editable"
          v-if="currentFilter.name"
          @click="editable = 'name'"
          >{{
            currentFilter.name === 'Function' ? currentFilter.function : currentFilter.name
          }}
        </span>
        <span
          class="filter__value filter-editable"
          @click="editable = 'value-secondary'"
          v-if="currentValueSecondary && currentFilter.fields.length > 1"
        >
          {{ currentValueSecondary }}
        </span>
        <span
          class="filter__operand filter-editable"
          v-if="currentOperand"
          @click="editable = 'operand'"
        >
          {{ parseComparison(currentOperand) }}
        </span>
        <span
          class="filter__value filter-editable"
          v-if="currentValue !== ''"
          @click="editable = 'value'"
        >
          {{ currentValue }}
        </span>
      </div>
      <div
        class="filter-constructor-middle filter-constructor-middle_long"
        v-if="!currentFilter.name"
      >
        <span class="filter__function"> ... </span>
      </div>
      <div
        class="filter-constructor-middle filter-constructor-middle_long"
        v-if="currentFilter.fields && currentFilter.fields.length > 1 && !currentValueSecondary"
      >
        <span class="filter__subvalue"> ... </span>
      </div>
      <div class="filter-constructor-middle" v-if="!currentOperand">
        <span class="filter__operand"> ? </span>
      </div>
      <div class="filter-constructor-end" v-if="currentValue === ''">
        <span class="filter__value"> ... </span>
      </div>
    </div>
    <div class="save-changes" v-if="currentFilter.name && currentOperand && currentValue">
      <div class="save-changes__tip">
        Tip: to edit the filter click on the parts of the filter text above.
      </div>
      <div class="save-changes__save">
        <button type="submit" class="modal-button" @click="commitFilter()">Save</button>
        <button type="submit" class="modal-button" @click="cancelFilter()">Cancel</button>
      </div>
    </div>
    <div class="filter-editor">
      <div class="filter-select" v-if="!currentFilter.id || editable === 'name'">
        <!--         <div
          class="filter-group"
          v-for="group in filterGroups"
          :key="group.name"
        >
          <div class="filter-group__title">{{ group.name }}</div>
          <div class="filter-group-filters">
            <div
              class="dialogue-filters__filter"
              v-for="filter in group.filters"
              @click="
                currentFilter = filter;
                editable = '';
              "
              :key="filter.id"
            >
              <span class="filter__if">if </span>
              <span class="filter__function"
                >{{
                  filter.name === "Function"
                    ? filter.function
                    : filter.name
                }}
              </span>
            </div>
          </div>
        </div> -->

        <div class="filter-group" v-for="group in filterGroupsNew" :key="group.name">
          <div class="filter-group__title">{{ group.name }}</div>
          <div class="filter-group-filters">
            <div
              class="dialogue-filters__filter"
              v-for="filter in getFunctions(group)"
              @click="
                currentFilterFunction = filter;
                editable = '';
              "
              :key="filter"
            >
              <span class="filter__if">if </span>
              <span class="filter__function">{{ filter }} </span>
            </div>
          </div>
        </div>
      </div>
      <div
        class="value-select"
        v-else-if="
          (currentFilter.fields.length > 1 && !currentValueSecondary) ||
          editable === 'value-secondary'
        "
      >
        <div class="input-area">
          <label class="modal-field">
            <input
              class="modal-field__input"
              name="dialogue-topic"
              :placeholder="'Type the value'"
              autocomplete="off"
              required
              v-model="inputValueSecondary"
            />
          </label>
          <button
            type="submit"
            class="modal-button"
            :disabled="!inputValueSecondary.trim()"
            @click="
              currentValueSecondary = inputValueSecondary;
              editable = '';
            "
          >
            Save
          </button>
        </div>
      </div>
      <div class="operand-select" v-else-if="!currentOperand || editable === 'operand'">
        Select an operand:
        <div
          class="operand"
          v-for="operand in currentFilter.operands"
          :key="operand"
          @click="
            currentOperand = operand;
            editable = '';
          "
        >
          {{ parseComparison(operand) }}
        </div>
      </div>
      <div class="value-select" v-else-if="currentValue === '' || editable === 'value'">
        <div class="input-area">
          <label class="modal-field">
            <input
              class="modal-field__input"
              name="dialogue-topic"
              :placeholder="'Type the value'"
              autocomplete="off"
              required
              v-model="inputValue"
            />
          </label>
          <button
            type="submit"
            class="modal-button"
            :disabled="!inputValue.trim()"
            @click="
              currentValue = inputValue;
              editable = '';
            "
          >
            Save
          </button>
        </div>
        <div class="found-names" v-if="currentFilter.fields.slice(-1)[0] === 'npc'">
          <div
            class="found-names-name"
            :class="{ 'found-names-name_active': !npc.TMP_dep }"
            v-for="npc in getNpcs"
            :key="npc.id"
            @click="inputValue = npc.id"
          >
            <div class="found-names-name__title">{{ npc.name }}</div>
            <div class="found-names-name__id">{{ npc.id }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentFilter: {},
      currentOperand: '',
      currentValue: '',
      currentValueSecondary: '',
      inputValue: '',
      inputValueSecondary: '',
      editable: '',

      filterGroupsNew: [
        {
          name: 'Major filters',
          types: [
            {
              name: 'Journal',
              functions: ['JournalType'],
            },
            {
              name: 'Function',
              functions: ['Choice', 'Pcgold'],
            },
            {
              name: 'Dead',
              functions: ['DeadType'],
            },
            {
              name: 'Item',
              functions: ['ItemType'],
            },
          ],
        },
        {
          name: 'Variables',
          types: [
            {
              name: 'Global',
              functions: ['CompareGlobal'],
            },
            {
              name: 'Local',
              functions: ['CompareLocal'],
            },
          ],
        },
        {
          name: 'Not',
          types: [
            {
              name: 'NotId',
              functions: ['NotIdType'],
            },
            {
              name: 'NotCell',
              functions: ['NotCell'],
            },
            {
              name: 'NotFaction',
              functions: ['NotFaction'],
            },
            {
              name: 'NotClass',
              functions: ['NotClass'],
            },
            {
              name: 'NotRace',
              functions: ['NotRace'],
            },
            {
              name: 'NotLocal',
              functions: ['Global'],
            },
          ],
        },
        {
          name: 'Player filters',
          types: [
            {
              name: 'Function',
              functions: [
                'PcReputation',
                'PcLevel',
                'PcHealthPercent',
                'PcMagicka',
                'PcFatigue',
                'PcStrength',
                'PcBlock',
                'PcArmorer',
                'PcMediumArmor',
                'PcHeavyArmor',
                'PcBluntWeapon',
                'PcLongBlade',
                'PcAxe',
                'PcSpear',
                'PcAthletics',
                'PcEnchant',
                'PcDestruction',
                'PcAlteration',
                'PcIllusion',
                'PcConjuration',
                'PcMysticism',
                'PcRestoration',
                'PcAlchemy',
                'PcUnarmored',
                'PcSecurity',
                'PcSneak',
                'PcAcrobatics',
                'PcLightArmor',
                'PcShortBlade',
                'PcMarksman',
                'PcMercantile',
                'PcSpeechcraft',
                'PcHandToHand',
                'PcSex',
                'PcExpelled',
                'PcCommonDisease',
                'PcBlightDisease',
                'PcClothingModifier',
                'PcCrimeLevel',
                'PcIntelligence',
                'PcWillpower',
                'PcAgility',
                'PcSpeed',
                'PcEndurance',
                'PcPersonality',
                'PcLuck',
                'PcCorprus',
                'PcVampire',
                'PcHealth',
              ],
            },
          ],
        },
        {
          name: 'Other filters',
          types: [
            {
              name: 'Function',
              functions: [
                'ReactionLow',
                'ReactionHigh',
                'RankRequirement',
                'Reputation',
                'HealthPercent',
                'SameSex',
                'SameRace',
                'SameFaction',
                'FactionRankDifference',
                'Detected',
                'Alarmed',
                'Weather',
                'Level',
                'Attacked',
                'TalkedToPc',
                'CreatureTarget',
                'FriendHit',
                'Fight',
                'Hello',
                'Alarm',
                'Flee',
                'ShouldAttack',
                'Werewolf',
                'WerewolfKills',
              ],
            },
          ],
        },
      ],

      filterGroups: [
        {
          name: 'Speaker filters:',
          filters: [
            {
              id: 'speaker_id',
              name: 'Speaker ID',
              operands: ['Equal'],
              fields: ['npc'],
            },
            {
              id: 'speaker_cell',
              name: 'Speaker Cell',
              operands: ['Equal'],
              fields: ['cell'],
            },
            {
              id: 'speaker_class',
              name: 'Speaker Class',
              operands: ['Equal'],
              fields: ['class'],
            },
            {
              id: 'speaker_faction',
              name: 'Speaker Faction',
              operands: ['Equal'],
              fields: ['faction'],
            },
            {
              id: 'speaker_race',
              name: 'Speaker Race',
              operands: ['Equal'],
              fields: ['race'],
            },
            {
              id: 'speaker_race',
              name: 'Speaker Rank',
              operands: ['Equal'],
              fields: ['rank'],
            },

            {
              id: 'speaker_sex',
              name: 'Speaker Sex',
              operands: ['Equal'],
              fields: ['sex'],
            },
          ],
        },
        {
          name: 'Player filters:',
          filters: [
            {
              id: 'player_faction',
              name: 'Player Faction',
              operands: ['Equal'],
              fields: ['faction'],
            },
            {
              id: 'player_rank',
              name: 'Player Rank',
              operands: ['Equal'],
              fields: ['rank'],
            },
          ],
        },
        {
          name: 'Disposition:',
          filters: [
            {
              id: 'disposition',
              name: 'Disposition',
              operands: ['Greater'],
              fields: ['disposition'],
            },
          ],
        },
        {
          name: 'Functions:',
          filters: [
            {
              id: 'function_journal',
              name: 'Journal',
              function: 'JournalType',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['journal_id', 'journal_disposition'],
            },
            {
              id: 'function_item',
              name: 'Item',
              function: 'ItemType',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['item_id', 'item_amount'],
            },
            {
              id: 'function_dead',
              name: 'Dead',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              function: 'DeadType',
              fields: ['npc'],
            },
            {
              id: 'function_choice',
              name: 'Function',
              function: 'Choice',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['choice'],
            },
          ],
        },
        {
          name: 'Variables:',
          filters: [
            {
              id: 'function_global',
              name: 'Global',
              function: 'VariableCompare',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['global_dropdown', 'global_value'],
            },
            {
              id: 'function_local',
              name: 'Local',
              function: 'VariableCompare',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['local_input', 'local_value'],
            },
          ],
        },
        {
          name: 'Not:',
          filters: [
            {
              id: 'function_not_id',
              name: 'NotId',
              function: 'NotIdType',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['npc', 'value'],
            },
            {
              id: 'function_not_cell',
              name: 'NotCell',
              function: 'NotCell',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['cell', 'value'],
            },
            {
              id: 'function_not_class',
              name: 'NotClass',
              function: 'NotClass',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['class', 'value'],
            },
            {
              id: 'function_not_faction',
              name: 'NotFaction',
              function: 'NotFaction',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['faction', 'value'],
            },
            {
              id: 'function_not_race',
              name: 'NotRace',
              function: 'NotRace',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['race', 'value'],
            },
            {
              id: 'function_not_local',
              name: 'NotLocal',
              function: 'VariableCompare',
              operands: ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
              fields: ['local', 'value'],
            },
          ],
        },
      ],
    };
  },

  /*
Alarm
Alarmed
Attacked
Choice
Creature Target

*/

  methods: {
    commitFilter() {
      if (this.currentFilter.id.includes('function')) {
        if (this.getSelectedFilterIndex === '') {
          let filter = {
            comparison: this.currentOperand,
            function: this.currentFilter.function,
            filter_type: this.currentFilter.name,
            id: this.currentValueSecondary,
            //slot: "Slot1",
            value: {
              Integer: parseInt(this.currentValue),
            },
          };
          if (!this.currentValueSecondary) delete filter.id;
          this.$store.commit('addFilter', [filter, this.getSelectedInfoId]);
        }
      }
      this.$store.commit('setPrimaryModal', '');
    },
    cancelFilter() {
      this.$store.commit('setPrimaryModal', '');
    },
    parseComparison(comparison) {
      switch (comparison) {
        case 'Equal':
          return '==';
        case 'GreaterEqual':
          return '>=';
        case 'LessEqual':
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
    getFunctions(group) {
      return group.types.map((val) => val.functions).flat();
    },
  },
  computed: {
    getNpcs() {
      if (!this.inputValue) return [];
      else return this.$store.getters['searchNpcs'](this.inputValue);
    },
    getSelectedFilter() {
      return this.$store.getters['getSelectedFilter'];
    },
    getSelectedFilterIndex() {
      return this.$store.getters['getSelectedFilterIndex'];
    },
    getSelectedInfoId() {
      return this.$store.getters['getSelectedInfoId'];
    },
  },
  beforeMount() {
    let filter = this.getSelectedFilter;
    if (!filter.filter_type) {
      this.currentOperand = '';
      this.currentFilter = {};
      this.currentValueSecondary = '';
      this.inputValueSecondary = '';
      this.currentValue = '';
      this.inputValue = '';
    } else {
      this.currentOperand = filter.comparison;
      this.currentFilter = this.filterGroups
        .map((val) => val.filters)
        .flat(1)
        .find((val) => val && val.name === filter.filter_type);
      this.currentValueSecondary = filter.id;
      this.inputValueSecondary = filter.id;
      this.currentValue = Object.values(filter.value)[0];
      this.inputValue = Object.values(filter.value)[0];
    }
  },
};
</script>

<style lang="scss">
.value-select {
  display: flex;
  padding: 10px;
  flex-direction: column;
  gap: 10px;
}
.operand {
  padding: 10px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.6);
  text-align: center;
  border-radius: 40px;
  font-size: 25px;
  color: rgb(112, 126, 207);
  &:hover {
    color: rgb(159, 169, 223);
  }
  &-select {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
  }
}
.input-area {
  display: flex;
  gap: 10px;
}
.filter-editor {
  height: 550px;
}
.filter-editable {
  color: black;
  transition: all 0.15s ease-out;
  cursor: pointer;
  &:hover {
    color: rgb(112, 126, 207);
  }
}
.filter-constructor {
  display: flex;
  width: 100%;
  justify-content: center;
  gap: 10px;
  align-items: center;
  font-size: 25px;
  margin-bottom: 20px;
  &-start {
    align-items: center;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 20px 0 0 20px;
    padding: 5px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    width: fit-content;
    &_rounded {
      border-radius: 20px;
    }
  }
  &-middle {
    align-items: center;
    background: rgba(255, 255, 255, 0.4);
    padding: 5px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    width: fit-content;
    text-align: center;
    &_long {
      min-width: 80px;
    }
  }
  &-end {
    align-items: center;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 0 20px 20px 0;
    padding: 5px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    text-align: center;
    width: fit-content;
    min-width: 50px;
  }
}

.modal__title {
  color: rgba(0, 0, 0, 0.65);
  padding: 10px;
  font-weight: 500;
  margin-bottom: 20px;
}

.modal-tip {
  margin-bottom: 20px;
}
.frame-upload {
  //padding: 10px;
  margin: 2px;
  height: 100%;
  overflow-y: scroll;
}

.add-quest-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
}

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
    padding: 3px 10px;
    margin: 5px;
    color: black;
    height: fit-content;
    width: fit-content;
    font-size: 18px;
  }
}

.filter {
  &__if {
    color: rgb(56, 134, 60);
  }
  &-group {
    padding: 10px 20px;
  }
}
</style>
