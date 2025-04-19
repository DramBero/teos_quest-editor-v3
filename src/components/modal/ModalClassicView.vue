<template>
  <div class="classic-view-frame" v-if="getActive" @click="closeClassicView">
    <button class="classic-view-frame__close" @click="closeClassicView">
      <!-- <icon name="times" class="classic-view-frame__close-icon" scale="1.5"></icon> -->
      <TdesignClose />
    </button>
    <div class="classic-view-frame__wrapper" @click.stop>
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
          }" v-for="topic in topicsList" :key="topic[0].id" @click="setTopic(topic[0].id)">
            {{ topic[0].id }}
          </div>
        </div>
        <div class="container-entries_loading" v-if="dialogueLoading">
          <SVGSpinners90RingWithBg />
        </div>
        <div class="container-entries" v-else>
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
            <!-- is:draggable -->
<!--             <transition-group tag="tbody" :list="rows" :name="!drag ? 'flip-list' : null"
              :handle="'.container-entries__grip'" @start="drag = true" @end="drag = false" @change="handleReorder"
              :scroll-sensitivity="500" animation="200"> -->
            <tbody>
              <tr class="container-entries__entry" :class="{
                'container-entries__entry_active': currentId === entry.id,
                'container-entries__entry_new':
                  findDialogue(entry.id).TMP_dep === getPluginName,
                'container-entries__entry_mod':
                  !findDialogue(entry.id).TMP_dep &&
                  findDialogue(entry.id).old_values &&
                  findDialogue(entry.id).old_values.length,
                'container-entries__entry_del': findDialogue(entry.id).deleted !== undefined,
                'container-entries__entry_dirty':
                  !findDialogue(entry.id).TMP_dep &&
                  findDialogue(entry.id).old_values &&
                  checkDirtied(
                    findDialogue(entry.id).old_values.at(-1),
                    findDialogue(entry.id),
                  ),
              }" v-for="entry in dialogueList" @click="currentId === entry ? cancelEdit() : editEntry(entry)"
                :key="entry.id">
                <td class="container-entries__grip" @click.stop>
                  <!-- <icon name="grip-horizontal" class="classic-view-frame__close-icon" scale="1"></icon> -->
                  
                </td>
                <td class="container-entries__text">
                  {{
                    (
                      findDialogue(entry.id).text &&
                      findDialogue(entry.id).text.length > 150
                    ) ?
                      findDialogue(entry.id).text.slice(0, 150) + '...'
                      : findDialogue(entry.id).text
                  }}
                </td>
                <td>
                  {{
                    (findDialogue(entry.id).data &&
                      findDialogue(entry.id).data.disposition) ||
                    ''
                  }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.id).speaker_id }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.id).speaker_faction }}
                </td>
                <td class="container-entries__speaker" v-if="dialogueList[0] && dialogueList[0].TMP_type !== 'Journal'">
                  {{ findDialogue(entry.id).speaker_cell }}
                </td>
                <td v-for="v in dialogueList[0] && dialogueList[0].TMP_type !== 'Journal' ? 6 : 0" :key="v">
                  <div v-if="
                    findDialogue(entry.id).filters &&
                    findDialogue(entry.id).filters.find(
                      (val) => val.slot === 'Slot' + (v - 1).toString(),
                    )
                  " class="classic-filter">
                    <span class="classic-filter__type">{{
                      findDialogue(entry.id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).function ||
                      findDialogue(entry.id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).filter_type
                    }}</span>
                    <span class="classic-filter__id">{{
                      findDialogue(entry.id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).id
                    }}</span>
                    <span class="classic-filter__compare">{{
                      findDialogue(entry.id).filters.find(
                        (val) => val.slot === 'Slot' + (v - 1).toString(),
                      ).comparison
                    }}</span>
                    <span class="classic-filter__value">{{
                      Object.values(
                        findDialogue(entry.id).filters.find(
                          (val) => val.slot === 'Slot' + (v - 1).toString(),
                        ).value,
                      )[0]
                    }}</span>
                  </div>
                </td>
              </tr>
            <!-- </transition-group> -->
            </tbody>
          </table>
        </div>
      </div>
      <div class="classic-view-frame__edit" v-if="currentId">
        <button class="edit__close" :disabled="!checkChanges" @click="saveEdit()">
<!--           <icon name="save" class="edit__close-icon" :class="{ 'edit__close-icon_disabled': !checkChanges }"
            scale="1.5"></icon> -->
          Save
        </button>
        <button class="edit__cancel" :disabled="!checkChanges" @click="editEntry(currentId)">
<!--           <icon name="ban" class="edit__close-icon" :class="{ 'edit__close-icon_disabled': !checkChanges }" scale="1.5">
          </icon> -->
          Delete
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
              v-if="showEmptySpeakers || currentSpeakerData.speaker_race">
              <span>Speaker Rank:</span>
              <input class="modal-field__input" name="speaker_race" autocomplete="off" :placeholder="'Speaker Rank'"
                v-model="currentSpeakerData.speaker_race" />
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
                <v-select v-model="currentFilters[index].function" :options="filterFunctions"></v-select>
                <v-select v-model="currentFilters[index].comparison" :options="filterComparisons"></v-select>
            </div> -->
          </div>
        </div>
        <div class="edit__result">
<!--           <CodeEditor class="edit__result-code" v-model="currentResult" :hide_header="true" :height="'100%'"
            :width="'100%'" font-size="12px" :border_radius="'0'">
          </CodeEditor> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import DialogueEntryFilters from '../dialogue/DialogueEntryFilters.vue';
import { getAllTopicsByType, getOrderedEntriesByTopic } from '@/api/idb';
import { useClassicView, useClassicViewTopic } from '@/stores/classicView';
import { usePluginHeader } from '@/stores/pluginHeader';
import TdesignClose from '~icons/tdesign/close';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';

const rows = ref([]);
const updateTrigger = ref<number>(0);
const drag = ref<boolean>(false);
const currentId = ref<string>('');
const editCode = ref<string>('');
const topicType = ref<string>('Topic');
const currentFilters = ref([]);
const currentDisp = ref<string>('');
const showEmptySpeakers = ref<boolean>(false);
const showEmptyPlayerFilters = ref<boolean>(false);
const showEmptyDialogueFilters = ref<boolean>(false);
const dialogueLoading = ref<boolean>(false);
const showDisp = ref<boolean>(false);
const currentText = ref<string>('');
const currentResult = ref<string>('');
const currentSpeakerData = reactive({
  speaker_id: '',
  speaker_cell: '',
  speaker_faction: '',
  speaker_class: '',
  speaker_race: '',
  speaker_sex: '',
  player_faction: '',
  player_rank: '',
})

const filterGroups = [
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
]

const filterTypes = [
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
]

const filterFunctions = [
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
]

const filterComparisons = ['Less', 'LessEqual', 'NotEqual', 'Equal', 'GreaterEqual', 'Greater'];

const topicsList = ref([]);
const dialogueList = ref([]);

const classicViewStore = useClassicView();
const classicViewTopicStore = useClassicViewTopic();
const getActive = computed(() => {
  return classicViewStore.getClassicView;
})

const getCurrentTopic = computed(() => {
  return classicViewTopicStore.getClassicViewTopic;
})

const pluginHeaderStore = usePluginHeader();
const getPluginName = computed(() => {
  return pluginHeaderStore.getPluginHeader?.TMP_dep;
})

const getOrderedEntries = computed(() => {
  return [];
/*   this.updateTrigger;
  return this.$store.getters['getOrderedEntriesByTopic']([
    this.getCurrentTopic,
    this.topicType,
  ]); */
})

const checkChanges = computed(() => {
  return false;
 /*  let oldEntry = this.findDialogue(this.currentId);
  if (!oldEntry) return false;
  if (oldEntry.text !== this.currentText) return [oldEntry.text, this.currentText];
  else return false; */
})

watch(getOrderedEntries, (newValue) => {
  rows.value = newValue.map((val) => val.id);
})

watch(topicType, async (newValue) => {
  const topicsResponse = await getAllTopicsByType(newValue);
  topicsList.value = topicsResponse;
}, {
  immediate: true,
})

onMounted(() => {
  rows.value = getOrderedEntries.value.map((val) => val.id);
})

function checkDirtied(entryOne, entryTwo) {
/*   if (!entryOne || !entryTwo) return false;
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
  return JSON.stringify(entryOneNonId) === JSON.stringify(entryTwoNonId); */
}

function setTopic(topic: string) {
  classicViewTopicStore.setClassicViewTopic(topic);
}

watch(getCurrentTopic, (newValue: string) => {
  fetchDialogue(newValue);
})

async function fetchDialogue(topic: string) {
  if (!topic) {
    dialogueList.value = [];
  }
  try {
    dialogueLoading.value = true;
    const dialogueResponse = await getOrderedEntriesByTopic(topic);
    dialogueList.value = dialogueResponse.flat();
  } catch (error) {
    console.error(error);
  } finally {
    dialogueLoading.value = false;
  }
}

function findDialogue(entry) {
  if (!dialogueList.value) return {};
  return dialogueList.value.find((val) => val.id == entry) || {};
}

function closeClassicView() {
  classicViewStore.setClassicView(false);
}

function setCurrentTopic(topic) {
  classicViewTopicStore.setClassicViewTopic(topic);
}

function editEntry(entry_id) {
/*   this.currentId = entry_id;
  this.updateTrigger++;
  let currentEntry = this.findDialogue(entry_id);
  this.currentSpeakerData.speaker_id = currentEntry.speaker_id || '';
  this.currentSpeakerData.speaker_cell = currentEntry.speaker_cell || '';
  this.currentSpeakerData.speaker_faction = currentEntry.speaker_faction || '';
  this.currentSpeakerData.speaker_class = currentEntry.speaker_class || '';
  this.currentSpeakerData.speaker_race = currentEntry.speaker_race || '';
  this.currentSpeakerData.speaker_sex =
    currentEntry.data.speaker_sex !== 'Any' ? this.answer.data?.speaker_sex : '';
  this.currentSpeakerData.speaker_race =
    currentEntry.data.speaker_race !== -1 ? this.answer.data.speaker_race : '';
  this.currentFilters = currentEntry.filters;
  this.currentDisp = currentEntry.data && currentEntry.data.disposition;
  this.currentResult = currentEntry.result;
  this.currentText = currentEntry.text; */
}

function cancelEdit() {
  currentId.value = '';
}

function saveEdit() {
/*   this.updateTrigger++;
  let entry = this.findDialogue(this.currentId);
  entry.text = this.currentText;
  if (this.currentResult) entry.result = this.currentResult.replace(/\r?\n/g, '\r\n');
  this.$store.dispatch('replaceDialogueEntry', [this.currentId, entry]);
  this.rows = this.getOrderedEntries.map((val) => val.id);
  this.editEntry(this.currentId); */
}

function handleReorder(event) {
/*   let id = event.moved.element;
  let old_prev_id = this.findDialogue(event.moved.element).prev_id;
  let old_next_id = this.findDialogue(event.moved.element).next_id;
  let new_prev_id = this.rows[event.moved.newIndex - 1] || '';
  let new_next_id = this.rows[event.moved.newIndex + 1] || '';
  this.$store.commit('moveDialogueEntry', [
    id,
    old_prev_id,
    old_next_id,
    new_prev_id,
    new_next_id,
  ]);
  this.updateTrigger++;
  this.rows = this.getOrderedEntries.map((val) => val.id); */
}


/*  watch   rowsClone: {
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
        console.log(`Entry moved. ID: ${oldValue[idx]}, Text: ${this.getOrderedEntries.find(val => val.id === oldValue[idx]).text}`);
        console.log(`Old prev_id: ${this.getOrderedEntries.find(val => val.id === oldValue[idx]).prev_id}, Old next_id: ${this.getOrderedEntries.find(val => val.id === oldValue[idx]).next_id}`)
        console.log(`New index: ${newValue.findIndex(id => id === oldValue[idx])},`)
        console.log('====================================================================================')
        console.log("")
      }
    }
  }
} */
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

    svg {
      color: rgb(202, 165, 96);
      width: 30px;
      height: 30px;
      transition: fill 0.15s ease-in;
      &:hover {
        color: rgb(223, 200, 157);
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
        &:hover {
          color: white;
        }
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

    &_loading {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
      svg {
        width: 30px;
        height: 30px;
        color: rgb(202, 165, 96);
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
