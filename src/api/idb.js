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

export const fetchQuestByID = async function (questID) {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
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

    return { name, entries };
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

export const fetchAllQuestIDs = async function () {
  if (!databases['activePlugin']) {
    await initPlugin('activePlugin');
  }
  const activePlugin = databases['activePlugin'];
  try {
    let resp = await activePlugin.pluginData
      .where('type')
      .equals('Dialogue')
      .and((val) => val.TMP_type === 'Journal')
      .toArray();
    return resp;
  } catch (error) {
    throw error;
  }
};

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
      if (pluginData[index].type === 'Dialogue') {
        dialogueType = pluginData[index].dialogue_type;
        if (pluginData[index].id) {
          dialogueId = pluginData[index].id;
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
