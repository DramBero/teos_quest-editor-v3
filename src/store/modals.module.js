const state = {
  openFile: false,
  dialogueModal: {},
  questCreateModal: false,
  dialogueCreateModal: null,
  selectedFilter: {},
  primaryModal: "",
  selectedInfoId: '',
  selectedFilterIndex: '',
  clipboardDialogue: {},
  classicView: false,
  classicViewTopic: "",
};

const mutations = {
  setPrimaryModal(state, value) {
    state.primaryModal = value
  },
  setClassicView(state, value) {
    state.classicView = value
  },
  setClassicViewTopic(state, topic) {
    state.classicView = true
    state.classicViewTopic = topic
  },
  toggleOpenFile(state, value) {
    state.openFile = value;
  },
  hideOpenFile(state) {
    state.openFile = false;
  },
  hideDialogue(state) {
    state.dialogueModal = "";
  },
  setDialogueModal(state, value) {
    state.dialogueModal = value;
  },
  setQuestCreateModal(state, value) {
    state.questCreateModal = value
  },
  setSelectedFilter(state, value) {
    state.selectedFilter = value
  },
  setSelectedInfoId(state, info_id) {
    state.selectedInfoId = info_id
  },
  setSelectedFilterIndex(state, index) {
    state.selectedFilterIndex = index
  },
  setClipboardDialogue(state, [entry, speaker]) {
    let cleanedEntry = Object.fromEntries(Object.entries(entry)
        .filter(([key, value]) => value != speaker)
      );
    state.clipboardDialogue = cleanedEntry
  },
  setDialogueCreateModal(state, value) {
    state.dialogueCreateModal = value
  },
  hideQuestCreateModal(state) {
    state.questCreateModal = false
  },
  hideDialogueCreateModal(state) {
    state.dialogueCreateModal = false
  },
};

const actions = {};

const getters = {
  getOpenFile: (s) => s.openFile,
  getDialogueModal: (s) => s.dialogueModal,
  getQuestCreateModal: (s) => s.questCreateModal,
  getDialogueCreateModal: (s) => s.dialogueCreateModal,
  getPrimaryModal: (s) => s.primaryModal,
  getSelectedFilter: (s) => s.selectedFilter,
  getSelectedFilterIndex: (s) => s.selectedFilterIndex,
  getSelectedInfoId: (s) => s.selectedInfoId,
  getClipboardDialogue: (s) => s.clipboardDialogue,
  getClassicView: (s) => s.classicView,
  getClassicViewTopic: (s) => s.classicViewTopic,
};

export default {
  state,
  getters,
  actions,
  mutations
};
