import Dexie from 'dexie';
// import { active } from 'sortablejs';

let databases = {};

new Dexie('activePlugin');

export const createDB = function (name) {
  databases[name] = new Dexie(name);
};

export const getDB = function (name) {
  return databases[name];
};

export const deleteDB = function (name) {
  Dexie.delete(name);
  delete databases[name];
};

export const checkDB = async function (name) {
  if (!Boolean(databases[name])) {
    await initPlugin(name);
  }
  return Boolean(databases[name]);
}

const TMPfields = [
  'TMP_index',
  'TMP_is_active',
  'TMP_topic',
  'TMP_type',
  'TMP_info_id',
  'TMP_prev_id',
  'TMP_next_id',
  'TMP_speaker_id',
  'TMP_speaker_cell',
  'TMP_speaker_faction',
  'TMP_speaker_class',
  'TMP_speaker_race',
  'TMP_id',
]

export const initPlugin = async function (pluginName) {
  createDB(pluginName);
  let activePlugin = getDB(pluginName);
  activePlugin.version(1).stores({
    pluginData:
      'TMP_index,type,TMP_is_active,TMP_topic,TMP_type,TMP_info_id,TMP_prev_id,TMP_next_id,TMP_speaker_id,TMP_speaker_cell,TMP_speaker_faction,TMP_speaker_class,TMP_speaker_race,TMP_id,name',
  });
  await activePlugin.open().catch((err) => {
    console.error(err.stack || err);
  });
  if (!databases['activePlugin']) {
    throw 'NO_INDEXEDDB_PLUGIN';
  }
  return activePlugin;
};

export const getDependencies = async function () {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  const headers = await activePlugin.pluginData.where('type').equals('Header').toArray();
  if (!headers.length) {
    throw 'NO_HEADERFOUND';
  }
  const header = headers[0];
  const dependecies = header.masters.map((val) => val[0]);
  for (let dependency of dependecies) {
    if (!databases[dependency]) {
      await initPlugin(dependency);
    }
  }
  return dependecies;
};

export const getActiveHeader = async function () {
  return await getHeader('activePlugin');
};

export const getHeader = async function (pluginName) {
  if (!databases[pluginName]) {
    await initPlugin(pluginName);
  }
  const activePlugin = databases[pluginName];
  const headers = await activePlugin.pluginData.where('type').equals('Header').toArray();
  if (!headers.length) {
    throw 'NO_HEADERFOUND';
  }
  const header = headers[0];
  return header;
};

export const fetchNPCData = async function (npcID) {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    const response = await activePlugin.pluginData
      .where('TMP_id')
      .equals(npcID)
      .and((entry) => entry['type'] === 'Npc' || entry['type'] === 'Creature')
      .toArray();
    if (response.length) {
      return response[0];
    } else {
      const dependecies = await getDependencies();
      for (let dep of dependecies) {
        let dependencyDB = databases[dep];
        if (!dependencyDB) {
          await initPlugin(dep);
        }
        if (!dependencyDB) {
          continue;
        }
        let depResponse = await dependencyDB.pluginData
          .where('TMP_id')
          .equals(npcID)
          .and((entry) => entry['type'] === 'Npc' || entry['type'] === 'Creature')
          .toArray();

        if (depResponse.length) {
          return depResponse[0];
        }
        continue;
      }
      throw `NPC_NOT_FOUND: ${npcID}`;
    }
  } catch (error) {
    throw error;
  }
};

export const findNPCByName = async function (npcName, size = 20) {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    let results = [];
    const npcResponse = await activePlugin.pluginData
      .where('type')
      .equals('Npc')
      .and((entry) => entry['name'].toLowerCase().includes(npcName.toLowerCase()))
      .limit(size)
      .toArray();
    const creatureResponse = await activePlugin.pluginData
      .where('type')
      .equals('Creature')
      .and((entry) => entry['name'].toLowerCase().includes(npcName.toLowerCase()))
      .limit(size)
      .toArray();
    if (npcResponse.length) {
      results = [...results, ...npcResponse];
    }
    if (creatureResponse.length) {
      results = [...results, ...creatureResponse];
    }
    const dependecies = await getDependencies();
    for (let dep of dependecies) {
      let dependencyDB = databases[dep];
      if (!dependencyDB) {
        continue;
      }
      const npcResponseDep = await dependencyDB.pluginData
        .where('type')
        .equals('Npc')
        .and((entry) => entry['name'].toLowerCase().includes(npcName.toLowerCase()))
        .limit(size)
        .toArray();
      const creatureResponseDep = await dependencyDB.pluginData
        .where('type')
        .equals('Creature')
        .and((entry) => entry['name'].toLowerCase().includes(npcName.toLowerCase()))
        .limit(size)
        .toArray();
      if (npcResponseDep.length) {
        results = [...results, ...npcResponseDep];
      }
      if (creatureResponseDep.length) {
        results = [...results, ...creatureResponseDep];
      }
      continue;
    }
    return results;
  } catch (error) {
    throw error;
  }
};

export const fetchTopicListByNPC = async function (npcID, speakerType) {
  console.log('started:', npcID, speakerType)
  const speakerTypeKey = getSpeakerTypeKey(speakerType);
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    let entries = await activePlugin.pluginData
      .where(JSON.parse(`{"${speakerTypeKey}": "${npcID}"}`))
      .toArray();
    let dialogue = {};
    dialogue.topics = [
      ...new Set(entries.filter((val) => val.TMP_type === 'Topic').map((entry) => entry.TMP_topic)),
    ];
    dialogue.greetings = [
      ...new Set(
        entries.filter((val) => val.TMP_type === 'Greeting').map((entry) => entry.TMP_topic),
      ),
    ];
    dialogue.persuasions = [
      ...new Set(
        entries.filter((val) => val.TMP_type === 'Persuasion').map((entry) => entry.TMP_topic),
      ),
    ];
    return dialogue;
  } catch (error) {
    throw error;
  }
};

/////// FOR DEPRECATION
export const fetchAllDialogueNPCs = async function () {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    let resp;
    await activePlugin.pluginData
      .orderBy('TMP_speaker_id')
      .uniqueKeys((keys) => keys.filter((val) => val !== ''))
      .then((response) => {
        resp = response;
      });
    return resp;
  } catch (error) {
    throw error;
  }
};
//////

function getSpeakerTypeKey(speakerType) {
  switch (speakerType) {
    case 'npc':
      return 'TMP_speaker_id';
    case 'cell':
      return 'TMP_speaker_cell';
    case 'class':
      return 'TMP_speaker_class';
    case 'faction':
      return 'TMP_speaker_faction';
    case 'rank':
      return 'TMP_speaker_race';
    default:
      return '';
  }
}

export const addChoiceFilter = async function (entryId, choiceId) {
  const newFilter = {
    comparison: 'Equal',
    filter_type: 'Function',
    function: 'Choice',
    id: '',
    value: {
      type: 'Integer',
      data: choiceId,
    },
  }
  const entries = await getDialogueByTMPInfoId(entryId);
  let entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
  entry.filters = [
    ...entry.filters,
    {
      ...newFilter,
      index: entry.filters?.length || 0,
    }
  ]
  if (entry.TMP_is_active) {
    modifyEntry(entry)
  }
}

export const editTopicText = async function (entryId, text) {
  const entries = await getDialogueByTMPInfoId(entryId);
  let entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
  if (entry.text === text) return;
  entry.text = text;
  if (entry.TMP_is_active) {
    modifyEntry(entry)
  } else {
    
  }
}

export const deleteFilter = async function (entryId, filterIndex) {
  const entries = await getDialogueByTMPInfoId(entryId);
  let entry = JSON.parse(JSON.stringify(entries.flat().at(-1)));
  entry.filters = entry.filters.filter((val) => val.index !== filterIndex);
  if (entry.TMP_is_active) {
    modifyEntry(entry)
  } else {
    
  }
}

export const modifyEntry = async function (entry) {
  const activePlugin = databases['activePlugin'];
  try {
    await activePlugin.pluginData
      .where('TMP_index')
      .equals(entry.TMP_index)
      .modify(entry);
  } catch(error) {
    console.error(error);
  }
}

export const fetchAllDialogueBySpeaker = async function (speakerType) {
  const speakerTypeKey = getSpeakerTypeKey(speakerType);
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    let resp;
    if (speakerTypeKey === 'global') {
      console.log('NOT SUPPORTED YET');
    }
    await activePlugin.pluginData
      .orderBy(speakerTypeKey)
      .uniqueKeys((keys) => keys.filter((val) => val !== ''))
      .then((response) => {
        resp = response;
      });
    return resp;
  } catch (error) {
    throw error;
  }
};

export const fetchSpeakersAmountBySpeakerType = async function (speakerType) {
  console.log(`Searching for amount of speakers with type "${speakerType}"`)
  const speakerTypeKey = getSpeakerTypeKey(speakerType);
  if (!speakerTypeKey) return;
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    if (speakerTypeKey === 'global') {
      console.log('NOT SUPPORTED YET');
    }
    let amount = 0;
    await activePlugin.pluginData
      .orderBy(speakerTypeKey)
      .eachUniqueKey((key) => {
        if (key !== '') {
          amount += 1;
        }
      })
    console.log(`Speaker type: "${speakerType}". Amount: "${amount}"`);
    return amount;
  } catch (error) {
    throw error;
  }
};

export const fetchAllQuestIDs = async function (masters = false) {
  let resp = [];
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    const response = await activePlugin.pluginData
      .where('type')
      .equals('Dialogue')
      .and((val) => val.TMP_type === 'Journal')
      .toArray();
    resp = [...resp, ...response]
  } catch (error) {
    throw error;
  }
  if (masters) {
    const dependecies = await getDependencies();
    for (let dep of dependecies.reverse()) {
      let dependencyDB = databases[dep];
      if (!dependencyDB) {
        continue;
      }
      let depResponse = await dependencyDB.pluginData
        .where('type')
        .equals('Dialogue')
        .and((val) => val.TMP_type === 'Journal')
        .toArray();
        resp = [...resp, ...depResponse];
    }
  }
  return resp;
};

export const fetchQuestByID = async function (questID) {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  let quest = {
    name: '',
    old_names: [],
    entries: [],
    entry_ids: [],
  }
  const activePlugin = databases['activePlugin'];
  try {
    let entries = await activePlugin.pluginData
      .where('TMP_topic')
      .equals(questID)
      .and((val) => val.type === 'DialogueInfo' && val.quest_state !== 'Name')
      .toArray();
    let name = await activePlugin.pluginData
      .where('TMP_topic')
      .equals(questID)
      .and((val) => val.type === 'DialogueInfo' && val.quest_state === 'Name')
      .toArray();
    if (!name.length) {
      name = '';
    } else {
      name = name[0].text;
    }
    quest.name = name;
    quest.entries = [...quest.entries, ...entries];
  } catch (error) {
    throw error;
  }

  const dependecies = await getDependencies();
  for (let dep of dependecies.reverse()) {
    const currentEntryIds = quest.entries.map(val => val.TMP_info_id);
    let dependencyDB = databases[dep];
    let name = await dependencyDB.pluginData
      .where('TMP_topic')
      .equals(questID)
      .and((val) => val.type === 'DialogueInfo' && val.quest_state === 'Name')
      .toArray();
    if (name[0]?.text) {
      if (!quest.name) {
        quest.name = name[0]?.text || '';
      }
      quest.old_names = [...quest.old_names, name[0].text];
    }
    let entries = await dependencyDB.pluginData
      .where('TMP_topic')
      .equals(questID)
      .and((val) => val.type === 'DialogueInfo' && val.quest_state !== 'Name')
      .toArray();
    for (let entry of entries) {
      if (currentEntryIds.includes(entry.TMP_info_id)) {
        let questEntry = quest.entries.find(val => val.TMP_info_id === entry.TMP_info_id);
        if (questEntry.old_entries?.length) {
          questEntry.old_entries = [...questEntry.old_entries, entry];
        } else {
          questEntry.old_entries = [entry];
        }
      } else {
        quest.entries = [...quest.entries, entry];
      }
    }
  }

  return quest;
};

export const getDialogueByTMPInfoId = async function (TMPInfoId) {
  const dependecies = await getDependencies();
  let dialogue = [];
  try {
    for (let dep of dependecies) {
      let dependencyDB = databases[dep];
      if (!dependencyDB) {
        continue;
      }
      let depResponse = await dependencyDB.pluginData
        .where('TMP_info_id')
        .equals(TMPInfoId)
        .toArray();
      dialogue = [...dialogue, depResponse];
    }
    const activePlugin = databases['activePlugin'];
    const response = await activePlugin.pluginData
      .where('TMP_info_id')
      .equals(TMPInfoId)
      .toArray();
    dialogue = [...dialogue, response];
    return dialogue;
  } catch (error) {
    throw error;
  }
}

export const getAllDialogue = async function (topicId) {
  const dependecies = await getDependencies();
  let dialogue = [];
  try {
    for (let dep of dependecies) {
      let dependencyDB = databases[dep];
      if (!dependencyDB) {
        continue;
      }
      let depResponse = await dependencyDB.pluginData
        .where('type')
        .equals('DialogueInfo')
        .and((entry) => entry['TMP_topic'] === topicId)
        .toArray();
      dialogue = [...dialogue, depResponse];
    }
    const activePlugin = databases['activePlugin'];
    const response = await activePlugin.pluginData
      .where('type')
      .equals('DialogueInfo')
      .and((entry) => entry['TMP_topic'] === topicId)
      .toArray();
    dialogue = [...dialogue, response];
    return dialogue;
  } catch (error) {
    throw error;
  }
};

export const getAllTopicsByType = async function (topicType) {
  const dependecies = await getDependencies();
  let topics = [];
  try {
    for (let dep of dependecies) {
      let dependencyDB = databases[dep];
      if (!dependencyDB) {
        continue;
      }

      let depResponse = await dependencyDB.pluginData
        .where('type')
        .equals('Dialogue')
        .and((entry) => entry['TMP_type'] === topicType)
        .toArray();
      topics = [...topics, ...depResponse];
    }

    const activePlugin = databases['activePlugin'];
    const response = await activePlugin.pluginData
      .where('type')
      .equals('Dialogue')
      .and((entry) => entry['TMP_type'] === topicType)
      .toArray();
    topics = [...topics, ...response];

    const uniqueObjMap = {};
    for (const object of topics) {
      uniqueObjMap[object.id] =
        uniqueObjMap[object.id] ? [...uniqueObjMap[object.id], object] : [object];
    }

    let uniqueObjects = Object.values(uniqueObjMap);

    const activePluginHeader = await getActiveHeader();
    const activePluginName = activePluginHeader.TMP_dep;

    uniqueObjects = uniqueObjects.sort(
      (a, b) =>
        b.filter((val) => val.TMP_dep === activePluginName).length -
        a.filter((val) => val.TMP_dep === activePluginName).length,
    );

    return uniqueObjects;
  } catch (error) {
    throw error;
  }
};

export const getOrderedEntriesByTopic = async function (topicId) {
  if (!topicId) return [];

  let pluginDialogue = await getAllDialogue(topicId);
  if (!pluginDialogue.flat(1).length) return [];

  let dependencies = await getDependencies();

  const findByIdType = function (idType, id) {
    let entries = pluginDialogue.flatMap((plugin) =>
      plugin.filter((entry) => entry[idType] === id),
    );
    if (!entries.length) return false;
    let lastValue = entries.at(-1);
    let oldValues = pluginDialogue.flatMap((plugin) =>
      plugin.filter((entry) => entry.id === lastValue.id),
    );
    return {
      ...lastValue,
      old_values: oldValues.length > 1 ? oldValues.filter((val) => val && val.TMP_dep) : [],
    };
  };

  let firstElement = findByIdType('prev_id', '');

  if (!firstElement) {
    throw 'NO_PREV_ID';
  }

  let orderedDialogue = [firstElement];
  let nextEntry;
  while (true) {
    let nextEntries = [
      ...new Set([
        findByIdType('prev_id', orderedDialogue.at(-1).id),
        findByIdType('id', orderedDialogue.at(-1).next_id),
      ]),
    ];
    for (let dependency of dependencies) {
      nextEntry = nextEntries.find((val) => val.TMP_dep === dependency) || nextEntry;
    }
    nextEntry = nextEntries.find((val) => val.TMP_is_active) || nextEntry;
    if (nextEntry) {
      orderedDialogue.push(nextEntry);
      if (!nextEntry.next_id) break;
    } else break;
  }
  return orderedDialogue;
};

export const pluginToJSON = async function () {
  try {
    const activePlugin = await databases['activePlugin'].pluginData.toArray();
    for (let entry of activePlugin) {
      for (let key of Object.keys(entry)) {
        if (key.startsWith('TMP_')) {
          delete entry[key];
        }
      }
    }
    return activePlugin;
    return JSON.stringify(activePlugin);
  } catch (error) {
    console.error(error);
  }
}

export const importPlugin = async function (pluginData, pluginName, isActive) {
  let dialogueType;
  let dialogueId;
  let activePlugin = await initPlugin(isActive ? 'activePlugin' : pluginName);
  let tableLength = await activePlugin.pluginData.count();
  if (tableLength) {
    await activePlugin.pluginData.clear();
  }
  let entries = [];

  /*   let chunksAmount = Math.ceil(pluginData.length / 5000)

  for (let chunkIndex in chunksAmount) {
    let chunk = pluginData.slice((chunkIndex * 5000), ((chunkIndex + 1)))
  }
 */
  for (let index in pluginData) {
    let dialogueEntry;
    if (['DialogueInfo', 'Dialogue'].includes(pluginData[index].type)) {
      let TMP_quest_name = '';
      if (pluginData[index].type === 'Dialogue') {
        dialogueType = pluginData[index].dialogue_type;
        if (pluginData[index].id) {
          dialogueId = pluginData[index].id;
          if (dialogueType === 'Journal') {
            function getQuestNameByQuestId() {
              if (pluginData[parseInt(index) + 1]?.quest_state === 'Name') {
                return pluginData[parseInt(index) + 1]?.text || '';
              } else {
                return '';
              }
            }
            TMP_quest_name = getQuestNameByQuestId(pluginData[index].id);
          }
        }
      }

      dialogueEntry = {
        type: '',
        ...pluginData[index],
        TMP_id: pluginData[index].id || '',
        TMP_topic: dialogueId,
        TMP_type: dialogueType,
        TMP_info_id: pluginData[index].id,
        TMP_prev_id: pluginData[index].prev_id,
        TMP_next_id: pluginData[index].next_id,
        TMP_speaker_id: pluginData[index].speaker_id,
        TMP_speaker_cell: pluginData[index].speaker_cell,
        TMP_speaker_faction: pluginData[index].speaker_faction,
        TMP_speaker_class: pluginData[index].speaker_class,
        TMP_speaker_race: pluginData[index].speaker_race,
        TMP_dep: pluginName,
        TMP_is_active: isActive,
        TMP_index: parseInt(index),
        TMP_quest_name,
      };
    } else {
      dialogueEntry = {
        type: '',
        ...pluginData[index],
        TMP_id: pluginData[index].id || '',
        TMP_topic: '',
        TMP_type: '',
        TMP_info_id: '',
        TMP_prev_id: '',
        TMP_next_id: '',
        TMP_speaker_id: '',
        TMP_speaker_cell: '',
        TMP_speaker_faction: '',
        TMP_speaker_class: '',
        TMP_speaker_race: '',
        TMP_dep: pluginName,
        TMP_is_active: isActive,
        TMP_index: parseInt(index),
        TMP_quest_name: '',
      };
    }
    entries.push(dialogueEntry);
  }
  await activePlugin.transaction('rw', activePlugin.pluginData, async () => {
    await activePlugin.pluginData.bulkAdd(entries).catch((error) => {
      console.log('Dexie ERROR on importing123');
      console.log(error);
    });
  });
  if (isActive) {
    const dependecies = await getDependencies();
    for (let dep of dependecies) {
      await initPlugin(dep);
    }
  }

  return databases[isActive ? 'activePlugin' : pluginName];
};

const genericTmp = {
  TMP_dep: undefined,
  TMP_id: undefined,
  TMP_index: undefined,
  TMP_info_id: undefined,
  TMP_is_active: true,
  TMP_next_id: undefined,
  TMP_prev_id: undefined,
  TMP_quest_name: undefined,
  TMP_speaker_cell: undefined,
  TMP_speaker_class: undefined,
  TMP_speaker_faction: undefined,
  TMP_speaker_id: undefined,
  TMP_speaker_race: undefined,
  TMP_topic: undefined,
  TMP_type: undefined,
}

export async function addEntry(entry, locationIndex) {
  console.log(entry, locationIndex)
  try {
    const header = await getActiveHeader();
    if (locationIndex) {
      await shiftIndexes(locationIndex);
    }
    const index = locationIndex || header.num_objects + 1;
    console.log('index', index)
    const pluginName = header.TMP_dep;
    const newEntry = {
      ...genericTmp,
      ...entry,
      TMP_index: index,
      TMP_dep: pluginName,
      TMP_is_active: true,
    }
    const activePlugin = databases['activePlugin'];
    await activePlugin.pluginData.add(newEntry);
    await activePlugin.pluginData
      .where('type')
      .equals('Header')
      .modify({
        num_objects: header.num_objects + 1,
      });
  } catch (error) {
    throw error;
  }
}

export async function addJournalQuest(id, name) {
  let generatedId =
    Math.random().toString().slice(2, 15) +
    Math.random().toString().slice(2, 9);
  let idEntry = {
    type: "Dialogue",
    flags: "",
    id: id,
    dialogue_type: "Journal",
    TMP_topic: id,
    TMP_type: "Journal",
    TMP_id: id,
    TMP_quest_name: name,
    TMP_info_id: id,
  };
  let nameEntry = {
    type: "DialogueInfo",
    flags: "",
    info_id: generatedId,
    prev_id: "",
    next_id: "",
    id: generatedId,
    TMP_id: generatedId,
    data: {
      dialogue_type: "Journal",
      disposition: 0,
      speaker_rank: -1,
      speaker_sex: "Any",
      player_rank: -1
    },
    text: name,
    player_faction: "",
    quest_state: "Name",
    script_text: "",
    sound_path: "",
    speaker_cell: "",
    speaker_class: "",
    speaker_faction: "",
    speaker_id: "",
    speaker_race: "",
    filters: [],
    TMP_topic: id,
    TMP_type: "Journal",
  };
  try {
    await addEntry(idEntry);
    await addEntry(nameEntry);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export async function shiftIndexes(index) {
  const activePlugin = databases['activePlugin'];
  const lastEntry = await activePlugin.pluginData
    .orderBy('TMP_index')
    .last();
  const lastEntryIndex = lastEntry.TMP_index;
  console.log('Shifting range between:', index, lastEntryIndex);
  let indexes = [];
  for (let i = index; i <= lastEntryIndex; i++) {
    indexes.push(i);
  }
  indexes = indexes.reverse();
  console.log(indexes)
  if (!indexes.length) return;
  await activePlugin.transaction('rw', activePlugin.pluginData, async () => {
    for (const currentIndex of indexes) {
      await activePlugin.pluginData
        .where('TMP_index')
        .equals(currentIndex)
        .modify({
          TMP_index: currentIndex + 1,
        });
    }
  });
  console.log('ALL MODIFIED')
};

export async function addQuestEntry(questId, text, prevId, nextId) {
  let generatedId =
    Math.random().toString().slice(2, 15) +
    Math.random().toString().slice(2, 9);
  let defaultEntry = {
    type: "DialogueInfo",
    flags: "",
    info_id: generatedId,
    prev_id: prevId || '',
    next_id: nextId || '',
    TMP_prev_id: prevId || '',
    TMP_next_id: nextId || '',
    id: generatedId,
    TMP_id: generatedId,
    TMP_info_id: generatedId,
    data: {
      dialogue_type: "Journal",
      disposition: 10,
      speaker_rank: -1,
      speaker_sex: "Any",
      player_rank: -1
    },
    text,
    player_faction: "",
    script_text: "",
    sound_path: "",
    speaker_cell: "",
    speaker_class: "",
    speaker_faction: "",
    speaker_id: "",
    speaker_race: "",
    filters: [],
    TMP_topic: questId,
    TMP_type: "Journal",
  };
  try {
    console.log(questId);
    const activePlugin = databases['activePlugin'];
    let quest = null;
    quest = await activePlugin.pluginData
      .where('TMP_id')
      .equals(questId)
      .and((val) => val.type === 'Dialogue')
      .toArray();
    console.log(quest);
    if (quest && quest.length > 1) {
      throw ({key: 'QUEST_ID_DUPLICATE'});
    } else if (quest && quest.length === 1) {
      console.log('quest exists in active plugin');
    } else {
      const dependecies = await getDependencies();
      for (let dep of dependecies) {
        let dependencyDB = databases[dep];
        if (!dependencyDB) {
          continue;
        }
        let depResponse = await dependencyDB.pluginData
          .where('TMP_id')
          .equals(questId)
          .and((val) => val.type === 'Dialogue')
          .toArray();
        if (depResponse.length) {
          quest = depResponse;
        }
      }
      if (!quest || !quest.length) {
        throw ({key: 'NO_QUEST_FOUND'});
      } 
      delete quest.TMP_index;
      await addEntry(quest.at(-1));
    }
    let index = null;
    let lastEntry = await activePlugin.pluginData
      .where('TMP_topic')
      .equals(questId)
      .toArray();
    let lastEntryIndex = lastEntry?.at(-1)?.TMP_index;
    if (!lastEntryIndex) {
      throw ({key: 'NO_LAST_ENTRY_INDEX_FOUND'});
    }
    let prevEntry = [];
    let nextEntry = [];
    if (prevId) {
      prevEntry = await activePlugin.pluginData
        .where('TMP_id')
        .equals(prevId)
        .toArray();
    } else {
      prevEntry = lastEntry;
    }
    if (nextId) {
      nextEntry = await activePlugin.pluginData
        .where('TMP_id')
        .equals(nextId)
        .toArray();
    }
    if (!prevId && !nextId) {
      index = lastEntryIndex + 1;
    } else {

      if (prevEntry && prevEntry.length) {
        index = prevEntry.at(-1).TMP_index + 1;
      } else if (nextEntry && nextEntry.length) {
        index = nextEntry.at(-1).TMP_index;
      } else {
        index = lastEntryIndex + 1;
      }
    }
    console.log('INDEX:', index);
    
    defaultEntry.TMP_index = index;
    const prevDisposition = prevEntry?.at(-1)?.data?.disposition || 0;
    const nextDisposition = nextEntry?.at(-1)?.data?.disposition || 0;
    console.log('prev disp:', prevDisposition)
    console.log('next disp:', nextDisposition)
    const dispDifference = (nextDisposition || Infinity) - prevDisposition;
    console.log(dispDifference)
    let advisedDisposition = 10;
    if (dispDifference > 10) {
      advisedDisposition = ((prevDisposition / 10) + 1) * 10;
    } else if (dispDifference > 5) {
      advisedDisposition = ((prevDisposition / 10) + 0.5) * 10;
    } else if (dispDifference > 1) {
      advisedDisposition = prevDisposition + 1;
    } else {
      throw ({key: 'NO_PLACE_FOR_ENTRY'});
    }
    defaultEntry.data.disposition = advisedDisposition;
    console.log(defaultEntry)
    await addEntry(defaultEntry, index);
    if (prevEntry.length) {
      await activePlugin.pluginData
        .where('TMP_id')
        .equals(prevEntry.at(-1).id)
        .modify({
          next_id: generatedId,
          TMP_next_id: generatedId,
        });
    }
    if (nextEntry.length) {
      await activePlugin.pluginData
        .where('TMP_id')
        .equals(nextEntry.at(-1).id)
        .modify({
          prev_id: generatedId,
          TMP_prev_id: generatedId,
        });
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}