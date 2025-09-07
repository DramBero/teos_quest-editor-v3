import Vue from "vue";
import { importPlugin, getDB, initPlugin, fetchNPCData, fetchAllDialogueBySpeaker, fetchAllQuestIDs, fetchQuestByID, fetchTopicListByNPC, getOrderedEntriesByTopic } from '@/api/idb';

const state = {
  activePlugin: [],
  parsedQuests: [],
  activeHeader: {},
  activePluginTitle: "",
  journalHighlight: {},
  dependencies: [],
  cellList: [],
  raceList: [],
  classList: [],
  factionList: [],
  npcList: [],
  topicsList: [],
  activePluginDB: null,
  dependenciesDB: {},
  questEntries: [],
  allDialogueSpeakers: {
    npc: [],
    cell: [],
    class: [],
    faction: [],
    rank: [],
    global: [],
  },
  allQuestIDs: [],
};

const getters = {
  getActivePlugin(state) {
    if (!state.activePlugin.length) return;
    let header = state.activePlugin.find((val) => val && val.type === "Header")
    if (header) {
      header.num_objects = state.activePlugin.length - 1;
    }

    return state.activePlugin;
  },

  getFiltersByInfoId: (state) => (info_id) => {
    if (state.topicsList.find((val) => val.info_id == info_id))
      return state.topicsList.find((val) => val.info_id == info_id).filters;
    else if (
      state.dependencies
        .flatMap((val) => val.data)
        .find((val) => val.info_id == info_id)
    )
      return state.dependencies
        .flatMap((val) => val.data)
        .find((val) => val.info_id == info_id).filters;
  },

  getDialogueGlobalExist: (state) => {
    return (
      state.activePlugin.filter(
        (val) =>
          val.type === "Info" &&
          val.TMP_type !== "Journal" &&
          !val.speaker_id &&
          !val.speaker_cell &&
          !val.speaker_faction &&
          !val.speaker_class &&
          !val.speaker_race
      ).length > 0
    );
  },
};

const actions = {
  replaceDialogueEntry({ state, commit }, [info_id, newEntry]) {
    let oldEntryActivePlugin = state.activePlugin.find(
      (val) => val.info_id === info_id
    );
    if (oldEntryActivePlugin) Object.assign(oldEntry, newEntry);
    else {
      let depEntries = state.dependencies
        .map((val) => val.data)
        .flat(1)
        .filter((val) => val.info_id === info_id);
      if (newEntry.TMP_dep) delete newEntry.TMP_dep;
      if (depEntries.length) {
        commit("pasteDialogue", [
          newEntry,
          newEntry.TMP_topic,
          newEntry.TMP_type,
          newEntry.prev_id,
          newEntry.next_id,
          newEntry.info_id
        ]);
      }
    }
  },

  async fetchQuestsData({state}) {
    let activePlugin = state.activePluginDB
    let questEntries = await activePlugin.pluginData.where("TMP_type").equalsIgnoreCase("Journal").toArray()
    for (let dep of Object.keys(state.dependenciesDB)) {
      let depQuestEntries = await state.dependenciesDB[dep].pluginData.where("TMP_type").equalsIgnoreCase("Journal").toArray()
      questEntries = [...questEntries, ...depQuestEntries]
    }

    let quests = [];
    let initialQuestData = {
      id: "",
      name: "",
      nameId: "",
      nameNextId: "",
      entries: []
    };
    let questData = {
      id: "",
      name: "",
      nameId: "",
      nameNextId: "",
      entries: []
    };

    for (let entry of questEntries) {
      if (!entry) continue
      if (entry.type === "Dialogue") {
        if (entry.id !== questData.id && questData.id !== "") {
          quests.push(questData);
          questData = JSON.parse(JSON.stringify(initialQuestData));
        }
        questData.id = entry.id;
      } else if (entry.TMP_type === "Journal") {
        if (entry.quest_name === 1) {
          questData.name = entry.text;
          questData.nameId = entry.info_id;
          questData.nameNextId = entry.next_id;
        } else {
          questData.entries.push(entry);
        }
      }
    }
    if (questData.id) quests.push(questData);
    state.questEntries = quests

  },
};

const mutations = {
  addFilter(state, [filter, info_id]) {
    let slotId = state.activePlugin.find((val) => val.info_id == info_id)
      .filters.length;
    if (slotId > 5) {
      return {
        error_code: "NO_FREE_FILTER_SLOTS",
        error_text:
          "All 6 filter slots are already filled. Remove one of them to add a new one."
      };
    } else {
      slotId = "Slot" + slotId.toString();
      if (
        state.activePlugin
          .find((val) => val.info_id == info_id)
          .filters.map((val) => val.slot)
          .includes(slotId)
      ) {
        return {
          error_code: "FILTER_SLOT_ORDER_BREAK",
          error_text:
            "Filter slot order is broken. Autofix is not implemented yet."
        };
      } else {
        filter = { ...filter, slot: slotId };
        state.activePlugin
          .find((val) => val.info_id == info_id)
          .filters.push(filter);
      }
    }
  },

  deleteDialogueFilter(state, [info_id, slot_id]) {
    let filters = state.activePlugin.find(
      (val) => val.info_id == info_id
    ).filters;
    state.activePlugin.find((val) => val.info_id == info_id).filters =
      filters.filter((val) => val.slot !== slot_id);
    filters = state.activePlugin.find((val) => val.info_id == info_id).filters;
    for (let i in filters) {
      state.activePlugin.find((val) => val.info_id == info_id).filters[i].slot =
        "Slot" + i.toString();
    }
  },

  addDialogue(
    state,
    [
      speakerType,
      speakerId,
      topicId,
      dialogueType,
      location_id,
      location_direction,
      text
    ]
  ) {
    let prev_id = "";
    let next_id = "";

    if (location_direction === "next") {
      prev_id = location_id;
      if (state.activePlugin.find((val) => val.prev_id === location_id))
        next_id = state.activePlugin.find(
          (val) => val.prev_id === location_id
        ).info_id;
      else {
        for (let dep of state.dependencies) {
          if (dep.data.find((val) => val.prev_id === location_id))
            next_id = dep.data.find(
              (val) => val.prev_id === location_id
            ).info_id;
        }
      }
    } else if (location_direction === "prev") {
      next_id = location_id;
      if (state.activePlugin.find((val) => val.next_id === location_id))
        prev_id = state.activePlugin.find(
          (val) => val.next_id === location_id
        ).info_id;
      else {
        for (let dep of state.dependencies) {
          if (dep.data.find((val) => val.next_id === location_id))
            prev_id = dep.data.find(
              (val) => val.next_id === location_id
            ).info_id;
        }
      }
    }

    let generatedId =
      Math.random().toString().slice(2, 15) +
      Math.random().toString().slice(2, 9);

    let topicObject = {
      dialogue_type: "Topic",
      flags: [0, 0],
      id: topicId,
      type: "Dialogue",
      TMP_topic: topicId,
      TMP_type: dialogueType
    };

    let questEntries = state.activePlugin.filter(
      (val) => val.TMP_type === dialogueType && val.TMP_topic === topicId
    );

    if (!questEntries.length)
      state.activePlugin = [...state.activePlugin, topicObject];

    let lastIdIndex = null;
    if (questEntries.length && questEntries.at(-1).info_id) {
      lastIdIndex = state.activePlugin.findIndex(
        (item) => item.info_id === questEntries.at(-1).info_id
      );
    }

    let newEntry = {
      data: {
        dialogue_type: "Topic",
        disposition: 0,
        player_rank: -1,
        speaker_race: -1,
        speaker_sex: "Any"
      },
      filters: [],
      flags: [0, 0],
      info_id: generatedId,
      next_id: next_id,
      prev_id: prev_id,
      text: text,
      type: "Info",
      TMP_topic: topicId,
      TMP_type: dialogueType
    };
    if (speakerType && speakerType !== 'Global') newEntry[speakerType] = speakerId;

    state.activePlugin.find((val) => val.info_id === prev_id) &&
      (state.activePlugin.find((val) => val.info_id === prev_id).next_id =
        generatedId);
    state.activePlugin.find((val) => val.info_id === next_id) &&
      (state.activePlugin.find((val) => val.info_id === next_id).prev_id =
        generatedId);

    if (lastIdIndex) state.activePlugin.splice(lastIdIndex, 0, newEntry);
    else state.activePlugin = [...state.activePlugin, newEntry];
  },

  pasteDialogue(
    state,
    [
      entry,
      npcId,
      topicId,
      dialogueType,
      location_id,
      location_direction,
      info_id
    ]
  ) {
    let generatedId = info_id
      ? info_id
      : Math.random().toString().slice(2, 15) +
        Math.random().toString().slice(2, 9);

    let prev_id = "";
    let next_id = "";
    if (location_direction === "next") {
      prev_id = location_id;
      if (state.activePlugin.find((val) => val.prev_id === location_id))
        next_id = state.activePlugin.find(
          (val) => val.prev_id === location_id
        ).info_id;
      else {
        for (let dep of state.dependencies) {
          if (dep.data.find((val) => val.prev_id === selectedTopic.info_id))
            next_id = dep.data.find(
              (val) => val.prev_id === selectedTopic.info_id
            ).info_id;
        }
      }
    } else if (location_direction === "prev") {
      next_id = location_id;
      if (state.activePlugin.find((val) => val.next_id === location_id))
        prev_id = state.activePlugin.find(
          (val) => val.next_id === location_id
        ).info_id;
      else {
        for (let dep of state.dependencies) {
          if (dep.data.find((val) => val.next_id === location_id))
            prev_id = dep.data.find(
              (val) => val.next_id === location_id
            ).info_id;
        }
      }
    }

    let questEntries = state.activePlugin.filter(
      (val) => val.TMP_type === dialogueType && val.TMP_topic === topicId
    );

    let topicObject = {
      dialogue_type: "Topic",
      flags: [0, 0],
      id: topicId,
      type: "Dialogue",
      TMP_topic: topicId,
      TMP_type: dialogueType
    };

    if (!questEntries.length)
      state.activePlugin = [...state.activePlugin, topicObject];

    let lastIdIndex = null;
    if (questEntries.length && questEntries[0].info_id) {
      lastIdIndex = state.activePlugin.findIndex(
        (item) => item.info_id === questEntries.at(-1).info_id
      );
    }

    let newEntry = {
      ...entry,
      info_id: generatedId,
      next_id: next_id,
      prev_id: prev_id,
      TMP_topic: topicId,
      TMP_type: dialogueType
    };

    state.activePlugin.find((val) => val.info_id === prev_id) &&
      (state.activePlugin.find((val) => val.info_id === prev_id).next_id =
        generatedId);
    state.activePlugin.find((val) => val.info_id === next_id) &&
      (state.activePlugin.find((val) => val.info_id === next_id).prev_id =
        generatedId);

    if (lastIdIndex) state.activePlugin.splice(lastIdIndex, 0, newEntry);
    else state.activePlugin = [...state.activePlugin, newEntry];
  },

  moveDialogueEntry(
    state,
    [info_id, old_prev_id, old_next_id, new_prev_id, new_next_id]
  ) {
    console.log([info_id, old_prev_id, old_next_id, new_prev_id, new_next_id]);
    if (state.activePlugin.find((val) => val.info_id == info_id)) {
      state.activePlugin.find((val) => val.info_id == info_id).prev_id =
        new_prev_id;
      state.activePlugin.find((val) => val.info_id == info_id).next_id =
        new_next_id;
    } else console.log("none INFO ID");

    if (state.activePlugin.find((val) => val.info_id == old_prev_id)) {
      state.activePlugin.find((val) => val.info_id == old_prev_id).next_id =
        old_next_id;
    } else console.log("none OLD PREV");
    if (state.activePlugin.find((val) => val.info_id == old_next_id)) {
      state.activePlugin.find((val) => val.info_id == old_next_id).prev_id =
        old_prev_id;
    } else console.log("none OLD NEXT");

    if (state.activePlugin.find((val) => val.info_id == new_prev_id)) {
      state.activePlugin.find((val) => val.info_id == new_prev_id).next_id =
        info_id;
    } else console.log("none NEW PREV");
    if (state.activePlugin.find((val) => val.info_id == new_next_id)) {
      state.activePlugin.find((val) => val.info_id == new_next_id).prev_id =
        info_id;
    } else console.log("none NEW NEXT");
  },

  deleteDialogueEntry(state, info_id) {
    let prev_id = state.activePlugin.find(
      (val) => val.type === "Info" && val.info_id === info_id
    ).prev_id;
    let next_id = state.activePlugin.find(
      (val) => val.type === "Info" && val.info_id === info_id
    ).next_id;
    if (state.activePlugin.find((val) => val.info_id === prev_id))
      state.activePlugin.find((val) => val.info_id === prev_id).next_id =
        next_id;
    if (state.activePlugin.find((val) => val.info_id === next_id))
      state.activePlugin.find((val) => val.info_id === next_id).prev_id =
        prev_id;
    state.activePlugin = state.activePlugin.filter(
      (val) => val.info_id !== info_id
    );
  },

  editDialogueEntry(state, [info_id, text]) {
    state.activePlugin.find(
      (val) => val.type === "Info" && val.info_id === info_id
    ).text = text;
  },

  addJournalQuest(state, [id, name]) {
    let generatedId =
      Math.random().toString().slice(2, 15) +
      Math.random().toString().slice(2, 9);
    let idEntry = {
      type: "Dialogue",
      flags: [0, 0],
      id: id,
      dialogue_type: "Journal",
      TMP_topic: id,
      TMP_type: "Journal"
    };
    let nameEntry = {
      type: "Info",
      flags: [0, 0],
      info_id: generatedId,
      prev_id: "",
      next_id: "",
      data: {
        dialogue_type: "Journal",
        disposition: 0,
        speaker_race: -1,
        speaker_sex: "Any",
        player_rank: -1
      },
      text: name,
      quest_name: 1,
      filters: [],
      TMP_topic: id,
      TMP_type: "Journal"
    };
    state.activePlugin = [...state.activePlugin, idEntry];
    state.activePlugin = [...state.activePlugin, nameEntry];
  },

  setActivePluginTitle(state, title) {
    state.activePluginTitle = title;
  },

  setJournalHighlight(state, filter) {
    state.journalHighlight = filter;
  },

  addToActiveArray(state, [destination, entry]) {
    if (state.activePlugin[destination]) {
      state.activePlugin[destination] = [
        ...state.activePlugin[destination],
        entry
      ];
    } else {
      state.activePlugin[destination] = [entry];
    }
  }
};

export default {
  state,
  getters,
  actions,
  mutations
};
