<template>
  <div class="classic-view-frame" v-if="getActive">
    <button class="classic-view-frame__close" @click="closeClassicView">
      <icon name="times" class="classic-view-frame__close-icon" scale="1.5"></icon>
    </button>
    <div class="classic-view-frame__wrapper">
      <div class="classic-view-frame__header"></div>
      <div class="classic-view-frame__containter container" :class="{ container_half: currentId }">
        <div class="container-topics">
          <div class="container-topics-header">
            <div class="container-topics-header__item" :class="{
              'container-topics-header__item_current': item === topicType,
            }" @click="topicType = item" v-for="item in ['Topic', 'Greeting', 'Persuasion', 'Journal']" :key="item">
              {{ item }}
            </div>
          </div>
          <div class="container-topics__topic" :class="{
            'container-topics__topic_dep': topic.filter(
              (val) => val && val.TMP_dep !== getPluginName,
            ).length,
            'container-topics__topic_mod':
              topic.filter((val) => val && val.TMP_dep === getPluginName).length &&
              topic.length > 1,
            'container-topics__topic_current': getCurrentTopic === topic[0].id,
          }" v-for="topic in topicsList" :key="topic[0].id" @click="fetchDialogue(topic[0].id)">
            {{ topic[0].id }}
          </div>
        </div>
        <div class="container-entries">
          <table border="0" cellspacing="0" cellpadding="0" v-if="dialogueList.length">
            <tr class="container-entries__header">
              <th></th>
              <th>Text</th>
              <th>
                {{ dialogueList[0] && dialogueList[0].TMP_type === 'Journal' ? 'Index' : 'Disp' }}
              </th>
              <th v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">Speaker ID</th>
              <th v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                Speaker Faction
              </th>
              <th v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">Speaker Cell</th>
              <th v-for="v in dialogueList[0] && dialogueList[0].TMP_type !== 'Journal' ? 6 : 0" :key="v">
                Filter {{ v }}
              </th>
            </tr>
            <transition-group is="draggable" tag="tbody" :list="rows" :name="!drag ? 'flip-list' : null"
              :handle="'.container-entries__grip'" @start="drag = true" @end="drag = false" @change="handleReorder"
              :scroll-sensitivity="500" animation="200">
              <tr class="container-entries__entry" :class="{
                'container-entries__entry_active': currentId === entry.info_id,
                'container-entries__entry_new':
                  findDialogue(entry.info_id).TMP_dep === getPluginName,
                'container-entries__entry_mod':
                  !findDialogue(entry.info_id).TMP_dep &&
                  findDialogue(entry.info_id).old_values &&
                  findDialogue(entry.info_id).old_values.length,
                'container-entries__entry_del': findDialogue(entry.info_id).deleted !== undefined,
                'container-entries__entry_dirty':
                  !findDialogue(entry.info_id).TMP_dep &&
                  findDialogue(entry.info_id).old_values &&
                  checkDirtied(
                    findDialogue(entry.info_id).old_values.at(-1),
                    findDialogue(entry.info_id),
                  ),
              }" v-for="entry in dialogueList" @click="currentId === entry ? cancelEdit() : editEntry(entry)"
                :key="entry.info_id">
                <td class="container-entries__grip" @click.stop>
                  <icon name="grip-horizontal" class="classic-view-frame__close-icon" scale="1"></icon>
                </td>
                <td class="container-entries__text">
                  {{
                    (
                      findDialogue(entry.info_id).text &&
                      findDialogue(entry.info_id).text.length > 150
                    ) ?
                      findDialogue(entry.info_id).text.slice(0, 150) + '...'
                      : findDialogue(entry.info_id).text
                  }}
                </td>
                <td>
                  {{
                    (findDialogue(entry.info_id).data &&
                      findDialogue(entry.info_id).data.disposition) ||
                    ''
                  }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.info_id).speaker_id }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.info_id).speaker_faction }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.info_id).speaker_cell }}
                </td>
                <td v-for="v in dialogueList[0] && dialogueList[0].TMP_type !== 'Journal' ? 6 : 0" :key="v">
                  <div v-if="
                    findDialogue(entry.info_id).filters &&
                    findDialogue(entry.info_id).filters.find(
                      (val) => val.slot === 'Slot' + (v - 1).toString(),
                    )
                  " class="classic-filter">
                    <span class="classic-filter__type">{{
                      findDialogue(entry.info_id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).filter_function ||
                      findDialogue(entry.info_id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).filter_type
                    }}</span>
                    <span class="classic-filter__id">{{
                      findDialogue(entry.info_id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).id
                    }}</span>
                    <span class="classic-filter__compare">{{
                      findDialogue(entry.info_id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).filter_comparison
                    }}</span>
                    <span class="classic-filter__value">{{
                      Object.values(
                        findDialogue(entry.info_id).filters.find(
                          (val) => val.slot === 'Slot' + (v - 1).toString(),
                        ).value,
                      )[0]
                    }}</span>
                  </div>
                </td>
              </tr>
            </transition-group>
          </table>
        </div>
      </div>
      <div class="classic-view-frame__edit" v-if="currentId">
        <button class="edit__close" :disabled="!checkChanges" @click="saveEdit()">
          <icon name="save" class="edit__close-icon" :class="{ 'edit__close-icon_disabled': !checkChanges }"
            scale="1.5"></icon>
        </button>
        <button class="edit__cancel" :disabled="!checkChanges" @click="editEntry(currentId)">
          <icon name="ban" class="edit__close-icon" :class="{ 'edit__close-icon_disabled': !checkChanges }" scale="1.5">
          </icon>
        </button>
        <div class="edit__text">
          <textarea class="modal-field__input" v-model="currentText"></textarea>
        </div>
        <div class="edit__filters">
          <label class="modal-field modal-field_dark modal-field_speaker-edit">
            <span>{{
              findDialogue(currentId) && findDialogue(currentId).TMP_type === 'Journal' ?
                'Index'
                : 'Disposition'
            }}:</span>
            <input class="modal-field__input" name="speaker-name" autocomplete="off" :placeholder="'Player Rank'"
              v-model="currentDisp" />
          </label>
          <div class="edit__filters-group-header"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <span>Speaker conditions:</span><span class="link" @click="showEmptySpeakers = !showEmptySpeakers">{{
              showEmptySpeakers ? 'Hide empty' : 'Show all'
              }}</span>
          </div>
          <div class="edit__filters-group"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_id">
              <span>Speaker ID:</span>
              <input class="modal-field__input" name="speaker_id" autocomplete="off" :placeholder="'Speaker ID'"
                v-model="currentSpeakerData.speaker_id" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_cell">
              <span>Speaker Cell:</span>
              <input class="modal-field__input" name="speaker_cell" autocomplete="off" :placeholder="'Speaker Cell'"
                v-model="currentSpeakerData.speaker_cell" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_faction">
              <span>Speaker Faction:</span>
              <input class="modal-field__input" name="speaker_faction" autocomplete="off"
                :placeholder="'Speaker Faction'" v-model="currentSpeakerData.speaker_faction" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_rank">
              <span>Speaker Rank:</span>
              <input class="modal-field__input" name="speaker_rank" autocomplete="off" :placeholder="'Speaker Rank'"
                v-model="currentSpeakerData.speaker_rank" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_class">
              <span>Speaker Class:</span>
              <input class="modal-field__input" name="speaker_class" autocomplete="off" :placeholder="'Speaker Class'"
                v-model="currentSpeakerData.speaker_class" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_race">
              <span>Speaker Race:</span>
              <input class="modal-field__input" name="speaker_race" autocomplete="off" :placeholder="'Speaker Race'"
                v-model="currentSpeakerData.speaker_race" />
            </label>

            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptySpeakers || currentSpeakerData.speaker_sex">
              <span>Speaker Sex:</span>
              <input class="modal-field__input" name="speaker_sex" autocomplete="off" :placeholder="'Speaker Sex'"
                v-model="currentSpeakerData.speaker_sex" />
            </label>
          </div>
          <div class="edit__filters-group-header"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <span>Player conditions:</span><span class="link"
              @click="showEmptyPlayerFilters = !showEmptyPlayerFilters">{{
                showEmptyPlayerFilters ? 'Hide empty' : 'Show all'
              }}</span>
          </div>
          <div class="edit__filters-group"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptyPlayerFilters || currentSpeakerData.player_faction">
              <span>Player Faction:</span>
              <input class="modal-field__input" name="speaker-name" autocomplete="off" :placeholder="'Player Faction'"
                v-model="currentSpeakerData.player_faction" />
            </label>
            <label class="modal-field modal-field_dark modal-field_speaker-edit"
              v-if="showEmptyPlayerFilters || currentSpeakerData.player_rank">
              <span>Player Rank:</span>
              <input class="modal-field__input" name="speaker-name" autocomplete="off" :placeholder="'Player Rank'"
                v-model="currentSpeakerData.player_rank" />
            </label>
          </div>
          <div class="edit__filters-group-header"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <span>Filters:</span><span class="link" @click="showEmptyDialogueFilters = !showEmptyDialogueFilters">{{
              showEmptyDialogueFilters ? 'Hide empty' : 'Show all'
              }}</span>
          </div>
          <div class="edit__filters-group"
            v-if="findDialogue(currentId) && findDialogue(currentId).TMP_type !== 'Journal'">
            <DialogueEntryFilters editMode onlyFilters :answer="findDialogue(currentId)" speaker="" />
            <!--             <div class="edit-dialogue-filter" v-for="filter, index in currentFilters" :key="index">
                <v-select v-model="currentFilters[index].filter_type" :options="filterTypes"></v-select>
                <v-select v-model="currentFilters[index].filter_function" :options="filterFunctions"></v-select>
                <v-select v-model="currentFilters[index].filter_comparison" :options="filterComparisons"></v-select>
            </div> -->
          </div>
        </div>
        <div class="edit__result">
          <CodeEditor class="edit__result-code" v-model="currentResult" :hide_header="true" :height="'100%'"
            :width="'100%'" font-size="12px" :border_radius="'0'">
          </CodeEditor>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from 'vue-awesome/components/Icon';
import draggable from 'vuedraggable';
import CodeEditor from 'simple-code-editor';
import vSelect from 'vue-select';

import 'vue-awesome/icons';
import DialogueEntryFilters from '../dialogue/DialogueEntryFilters.vue';
import { getAllTopicsByType } from '@/api/idb';

export default {
  data() {
    return {
      rows: [],
      updateTrigger: 0,
      drag: false,
      currentId: '',
      editCode: '',
      topicType: 'Topic',
      currentFilters: [],
      currentDisp: '',
      showEmptySpeakers: false,
      showEmptyPlayerFilters: false,
      showEmptyDialogueFilters: false,
      showDisp: false,
      currentText: '',
      currentResult: '',
      currentSpeakerData: {
        speaker_id: '',
        speaker_cell: '',
        speaker_faction: '',
        speaker_class: '',
        speaker_race: '',
        speaker_sex: '',
        speaker_rank: '',
        player_faction: '',
        player_rank: '',
      },
      filterGroups: [
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
      filterTypes: [
        'None',
        'Function',
        'Global',
        'Local',
        //"Journal",
        //"Item",
        //"Dead",
        'NotId',
        'NotCell',
        'NotFaction',
        'NotClass',
        'NotRace',
        'NotLocal',
      ],
      filterFunctions: [
        /*         "PcReputation",
        "PcLevel",
        "PcHealthPercent",
        "PcMagicka",
        "PcFatigue",
        "PcStrength",
        "PcBlock",
        "PcArmorer",
        "PcMediumArmor",
        "PcHeavyArmor",
        "PcBluntWeapon",
        "PcLongBlade",
        "PcAxe",
        "PcSpear",
        "PcAthletics",
        "PcEnchant",
        "PcDestruction",
        "PcAlteration",
        "PcIllusion",
        "PcConjuration",
        "PcMysticism",
        "PcRestoration",
        "PcAlchemy",
        "PcUnarmored",
        "PcSecurity",
        "PcSneak",
        "PcAcrobatics",
        "PcLightArmor",
        "PcShortBlade",
        "PcMarksman",
        "PcMercantile",
        "PcSpeechcraft",
        "PcHandToHand",
        "PcSex",
        "PcExpelled",
        "PcCommonDisease",
        "PcBlightDisease",
        "PcClothingModifier",
        "PcCrimeLevel",
        "PcIntelligence",
        "PcWillpower",
        "PcAgility",
        "PcSpeed",
        "PcEndurance",
        "PcPersonality",
        "PcLuck",
        "PcCorprus",
        "PcVampire",
        "PcHealth", */

        /*         "ReactionLow",
        "ReactionHigh",
        "RankRequirement",
        "Reputation",
        "HealthPercent",
        "SameSex",
        "SameRace",
        "SameFaction",
        "FactionRankDifference",
        "Detected",
        "Alarmed", */
        //"Choice",
        /*         "Weather",
        "Level",
        "Attacked",
        "TalkedToPc",
        "CreatureTarget",
        "FriendHit",
        "Fight",
        "Hello",
        "Alarm",
        "Flee",
        "ShouldAttack",
        "Werewolf",
        "WerewolfKills", */
        //"Pcgold",

        'NotClass',
        //"DeadType",
        'NotFaction',
        //"ItemType",
        //"JournalType",
        'NotCell',
        'NotRace',
        'NotIdType',
        'Global',

        'CompareGlobal',
        'CompareLocal',
      ],
      filterComparisons: ['Less', 'LesserEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'],
      topicsList: [],
      dialogueList: [],
    };
  },
  components: {
    Icon,
    draggable,
    CodeEditor,
    vSelect,
    DialogueEntryFilters,
  },
  mounted() {
    this.rows = this.getOrderedEntries.map((val) => val.info_id);
    //this.topicType = this.getOrderedEntries[0] ? this.getOrderedEntries[0].TMP_type : 'Topic'
  },
  watch: {
    getOrderedEntries(newValue) {
      this.rows = newValue.map((val) => val.info_id);
    },
    topicType: {
      async handler(newValue) {
        const topicsResponse = await getAllTopicsByType(newValue);
        this.topicsList = topicsResponse;
      },
      immediate: true,
    },
    /*     rowsClone: {
      handler: function (newValue, oldValue) {
        if (newValue.length === oldValue.length) {
          var idx = 0;
          var len = oldValue.length;
          while (
            (oldValue[idx] === newValue[idx] ||
              oldValue[idx] === newValue[idx + 1]) &&
            idx < len
          ) {
            idx++;
          }
          if (idx < newValue.length) {
            console.log("")
            console.log("OLD: ", oldValue)
            console.log("NEW: ", newValue)
            console.log('====================================================================================')
            console.log(`Entry moved. ID: ${oldValue[idx]}, Text: ${this.getOrderedEntries.find(val => val.info_id === oldValue[idx]).text}`);
            console.log(`Old prev_id: ${this.getOrderedEntries.find(val => val.info_id === oldValue[idx]).prev_id}, Old next_id: ${this.getOrderedEntries.find(val => val.info_id === oldValue[idx]).next_id}`)
            console.log(`New index: ${newValue.findIndex(id => id === oldValue[idx])},`)
            console.log('====================================================================================')
            console.log("")
          }
        }
      }
    } */
  },
  computed: {
    getActive() {
      return this.$store.getters['getClassicView'];
    },
    getCurrentTopic() {
      return this.$store.getters['getClassicViewTopic'];
    },
    getAllTopics() {
      return this.$store.getters['getAllTopics'](this.topicType);
    },
    /*     getOrderedEntriesUncached: {
      cache: false,
      get() {
        return this.$store.getters["getOrderedEntriesByTopic"]([
          this.getCurrentTopic,
          this.topicType
        ]);
      }
    }, */
    getOrderedEntries() {
      this.updateTrigger;
      return this.$store.getters['getOrderedEntriesByTopic']([
        this.getCurrentTopic,
        this.topicType,
      ]);
    },
    getPluginName() {
      return this.$store.getters['getActiveHeader'].TMP_dep;
    },
    getTopicFilterAmount() {
      return 6;
    },
    checkChanges() {
      let oldEntry = this.findDialogue(this.currentId);
      if (!oldEntry) return false;
      if (oldEntry.text !== this.currentText) return [oldEntry.text, this.currentText];
      else return false;
    },
  },
  methods: {
    async fetchDialogue(topic) {
      try {
        const dialogueResponse = await this.$store.dispatch('fetchOrderedEntriesByTopic', [topic]);
        this.dialogueList = dialogueResponse.flat();
      } catch (error) {
        console.error(error);
      }
    },
    findDialogue(entry) {
      if (!this.dialogueList) return {};
      return this.dialogueList.find((val) => val.info_id == entry) || {};
    },
    closeClassicView() {
      this.$store.commit('setClassicView', false);
    },
    setCurrentTopic(topic) {
      this.$store.commit('setClassicViewTopic', topic);
    },
    editEntry(entry_id) {
      this.currentId = entry_id;
      this.updateTrigger++;
      let currentEntry = this.findDialogue(entry_id);
      this.currentSpeakerData.speaker_id = currentEntry.speaker_id || '';
      this.currentSpeakerData.speaker_cell = currentEntry.speaker_cell || '';
      this.currentSpeakerData.speaker_faction = currentEntry.speaker_faction || '';
      this.currentSpeakerData.speaker_class = currentEntry.speaker_class || '';
      this.currentSpeakerData.speaker_race = currentEntry.speaker_rank || '';
      this.currentSpeakerData.speaker_sex =
        currentEntry.data.speaker_sex !== 'Any' ? this.answer.data?.speaker_sex : '';
      this.currentSpeakerData.speaker_rank =
        currentEntry.data.speaker_rank !== -1 ? this.answer.data.speaker_rank : '';
      this.currentFilters = currentEntry.filters;
      this.currentDisp = currentEntry.data && currentEntry.data.disposition;
      this.currentResult = currentEntry.result;
      this.currentText = currentEntry.text;
    },
    cancelEdit() {
      this.currentId = '';
    },
    saveEdit() {
      this.updateTrigger++;
      let entry = this.findDialogue(this.currentId);
      entry.text = this.currentText;
      if (this.currentResult) entry.result = this.currentResult.replace(/\r?\n/g, '\r\n');
      this.$store.dispatch('replaceDialogueEntry', [this.currentId, entry]);
      this.rows = this.getOrderedEntries.map((val) => val.info_id);
      this.editEntry(this.currentId);
    },
    handleReorder(event) {
      let info_id = event.moved.element;
      let old_prev_id = this.findDialogue(event.moved.element).prev_id;
      let old_next_id = this.findDialogue(event.moved.element).next_id;
      let new_prev_id = this.rows[event.moved.newIndex - 1] || '';
      let new_next_id = this.rows[event.moved.newIndex + 1] || '';
      this.$store.commit('moveDialogueEntry', [
        info_id,
        old_prev_id,
        old_next_id,
        new_prev_id,
        new_next_id,
      ]);
      this.updateTrigger++;
      this.rows = this.getOrderedEntries.map((val) => val.info_id);
    },
    checkDirtied(entryOne, entryTwo) {
      if (!entryOne || !entryTwo) return false;
      let entryOneNonId = Object.fromEntries(
        Object.entries(entryOne).filter(
          ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
        ),
      );
      let entryTwoNonId = Object.fromEntries(
        Object.entries(entryTwo).filter(
          ([key]) => !key.includes('_id') && !key.includes('TMP_') && !key.includes('old_values'),
        ),
      );
      return JSON.stringify(entryOneNonId) === JSON.stringify(entryTwoNonId);
    },
  },
};
</script>

<style lang="scss">
.classic-view-frame {
  position: fixed;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  z-index: 90;

  textarea {
    height: 100%;
    max-height: 100%;
    overflow: scroll;

    &:focus {
      border-color: rgb(202, 165, 96);
    }
  }

  &__close {
    position: absolute;
    top: 15px;
    right: 20px;

    &-icon {
      fill: rgb(202, 165, 96);
      transition: fill 0.15s ease-in;
    }

    &:hover {
      .classic-view-frame__close-icon {
        fill: rgb(223, 200, 157);
      }
    }
  }

  &__wrapper {
    background: rgba(20, 20, 20, 1);
    max-width: 1480px;
    width: 90vw;
    height: 100%;
    margin: 0 auto;
  }

  &__header {
    display: sticky;
  }

  &__edit {
    height: 50%;
    max-height: 50%;
    flex-grow: 0;
    flex-shrink: 1;
    background: rgb(226, 197, 142);
    padding-right: 45px;
    border-top: 2px solid black;
    position: relative;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;

    .edit__close {
      position: absolute;
      top: 10px;
      right: 15px;
    }

    .edit__cancel {
      position: absolute;
      top: 50px;
      right: 13px;
    }

    .edit__text {
      font-size: 20px;
      padding: 10px;
      border-right: 2px solid rgb(117, 87, 31);
    }

    .edit__filters {
      padding: 10px;
      font-size: 18px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: scroll;

      &-group {
        padding-left: 20px;
        margin-left: 5px;
        border-left: 2px dotted rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 5px;

        &-header {
          display: flex;
          justify-content: space-between;
        }
      }
    }

    .edit__result {
      font-family: 'Consolas';
      font-size: 14px;
      height: 100%;
      border-left: 2px solid rgb(117, 87, 31);
      background: rgb(46, 46, 34);
      color: rgb(237, 238, 167);
      width: 100%;
      flex-grow: 0;
      max-height: 100%;

      &-code {
        max-height: 100%;
      }
    }
  }
}

.container {
  display: flex;
  font-size: 20px;
  flex-grow: 1;
  height: 100%;
  transition: height 0.15s ease-in-out;

  &_half {
    height: 50%;
  }

  &-topics {
    min-width: 300px;
    max-width: 300px;
    height: 100%;
    border-right: 2px solid rgb(202, 165, 96);
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: scroll;

    &-header {
      display: flex;
      gap: 15px;
      border-bottom: 1px solid rgb(202, 165, 96);
      position: sticky;
      height: 50px;
      font-size: 15px;
      background: rgb(15, 15, 15);
      padding: 10px;
      z-index: 5;
      top: 0;

      //overflow-x: scroll;
      &__item {
        cursor: pointer;
        transition: color 0.05s linear;
        color: rgb(202, 165, 96);

        &:hover {
          color: rgb(223, 200, 157);
        }

        &_current {
          color: white;
          cursor: default;

          &:hover {
            color: white;
          }
        }
      }
    }

    &__topic {
      padding: 0 20px;
      cursor: pointer;
      transition: color 0.15s ease-in-out;
      color: rgb(89, 170, 106);

      &:hover {
        color: rgb(156, 207, 167);
      }

      &_dep {
        color: rgb(202, 165, 96);

        &:hover {
          color: rgb(223, 200, 157);
        }
      }

      &_mod {
        color: rgb(112, 126, 207);

        &:hover {
          color: rgb(159, 169, 223);
        }
      }

      &_del {
        color: rgb(207, 112, 112);

        &:hover {
          color: rgb(223, 159, 159);
        }
      }

      &_current {
        color: white;
        cursor: default;
      }
    }
  }

  &-entries {
    color: rgb(202, 165, 96);
    border-left: 2px solid black;
    overflow: scroll;
    //padding: 10px;
    flex-grow: 1;
    height: 100%;

    table {
      tr {
        td {
          border-bottom: 1px solid rgba(202, 165, 96, 0.5);
        }
      }
    }

    &__header {
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgb(15, 15, 15);
      border-bottom: 1px solid rgb(202, 165, 96);

      th {
        padding: 10px;
        font-weight: 500;
        border-bottom: 1px solid rgb(202, 165, 96);
      }
    }

    &__entry {
      //display: flex;
      //flex-direction: row;
      //flex-wrap: nowrap;
      background-color: rgba(202, 165, 96, 0.05);
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease-in-out;

      padding: 10px;

      &_active {
        color: white;

        .container-entries__grip .classic-view-frame__close-icon {
          fill: white;
        }
      }

      &_new {
        background-color: rgba(89, 170, 106, 0.15);
      }

      &_mod {
        background-color: rgba(112, 126, 207, 0.2);
      }

      &_del {
        background-color: rgba(226, 53, 53, 0.2);
      }

      &_dirty {
        background-color: rgba(202, 165, 96, 0.05);
        background-image: repeating-linear-gradient(-45deg,
            transparent,
            transparent 12px,
            rgba(112, 126, 207, 0.2) 12px,
            rgba(112, 126, 207, 0.2) 24px);
      }

      td {
        padding: 10px;
        border: 1px solid rgba(202, 165, 96, 0.05);
      }

      transition: all 0.1s ease-in-out;

      &:hover {
        filter: brightness(130%);
        -webkit-filter: brightness(130%);
        -moz-filter: brightness(130%);
      }
    }

    &__text {
      min-width: 50ch;
    }

    &__grip {
      cursor: grab;
      text-align: center;
      min-width: 50px;
    }
  }
}

.classic-filter {
  display: flex;
  flex-direction: column;
  font-size: 18px;
  align-items: center;
}

.flip-list {
  transition: transform 0.5s;
}

.flip-list-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform 0s;
}

.sortable-ghost {
  opacity: 0.5;
  //background: #c8ebfb;
}

.edit__close-icon_disabled {
  fill: rgba(0, 0, 0, 0.4);
}

.edit-dialogue-filter {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.vs__search {
  display: none;
}

.v-select {
  width: 25%;
  overflow: hidden;
  font-size: 16px;
}
</style>
