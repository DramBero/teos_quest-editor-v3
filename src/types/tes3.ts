/**
 * Canonical TES3 types — derived from the Rust crate at docs/tes3/libs/esp/src/types/.
 *
 * The WASM parser serialises Rust structs into JSON with snake_case field names.
 * These interfaces mirror that JSON shape exactly.
 *
 * App-level fields (TMP_*) are NOT included here — see BaseEntry in pluginEntries.ts.
 */

// ============================================================================
//  Enums
// ============================================================================

/** docs/tes3/libs/esp/src/types/enums.rs — FileType */
export type FileType = 'Esp' | 'Esm' | 'Ess';

/** docs/tes3/libs/esp/src/types/enums.rs — DialogueType */
export type DialogueType = 'Topic' | 'Voice' | 'Greeting' | 'Persuasion' | 'Journal';

/** docs/tes3/libs/esp/src/types/enums.rs — Sex */
export type Sex = 'Any' | 'Male' | 'Female';

/** docs/tes3/libs/esp/src/types/enums.rs — FilterType */
export type FilterType =
    | 'None' | 'Function' | 'Global' | 'Local' | 'Journal'
    | 'Item' | 'Dead' | 'NotId' | 'NotFaction' | 'NotClass'
    | 'NotRace' | 'NotCell' | 'NotLocal';

/** docs/tes3/libs/esp/src/types/enums.rs — FilterComparison */
export type FilterComparison =
    | 'Equal' | 'NotEqual' | 'Greater' | 'GreaterEqual' | 'Less' | 'LessEqual';

/** docs/tes3/libs/esp/src/types/enums.rs — FilterFunction (all 87 variants) */
export type FilterFunction =
    | 'ReactionLow' | 'ReactionHigh' | 'RankRequirement' | 'Reputation'
    | 'HealthPercent' | 'PcReputation' | 'PcLevel' | 'PcHealthPercent'
    | 'PcMagicka' | 'PcFatigue' | 'PcStrength' | 'PcBlock'
    | 'PcArmorer' | 'PcMediumArmor' | 'PcHeavyArmor' | 'PcBluntWeapon'
    | 'PcLongBlade' | 'PcAxe' | 'PcSpear' | 'PcAthletics'
    | 'PcEnchant' | 'PcDestruction' | 'PcAlteration' | 'PcIllusion'
    | 'PcConjuration' | 'PcMysticism' | 'PcRestoration' | 'PcAlchemy'
    | 'PcUnarmored' | 'PcSecurity' | 'PcSneak' | 'PcAcrobatics'
    | 'PcLightArmor' | 'PcShortBlade' | 'PcMarksman' | 'PcMercantile'
    | 'PcSpeechcraft' | 'PcHandToHand' | 'PcSex' | 'PcExpelled'
    | 'PcCommonDisease' | 'PcBlightDisease' | 'PcClothingModifier' | 'PcCrimeLevel'
    | 'SameSex' | 'SameRace' | 'SameFaction' | 'FactionRankDifference'
    | 'Detected' | 'Alarmed' | 'Choice' | 'PcIntelligence'
    | 'PcWillpower' | 'PcAgility' | 'PcSpeed' | 'PcEndurance'
    | 'PcPersonality' | 'PcLuck' | 'PcCorprus' | 'Weather'
    | 'PcVampire' | 'Level' | 'Attacked' | 'TalkedToPc'
    | 'PcHealth' | 'CreatureTarget' | 'FriendHit' | 'Fight'
    | 'Hello' | 'Alarm' | 'Flee' | 'ShouldAttack'
    | 'Werewolf' | 'WerewolfKills'
    | 'NotClass' | 'DeadType' | 'NotFaction' | 'ItemType'
    | 'JournalType' | 'NotCell' | 'NotRace' | 'NotIdType'
    | 'Global' | 'PcGold' | 'CompareGlobal' | 'CompareLocal'
    | 'VariableCompare';

/** docs/tes3/libs/esp/src/types/dialogueinfo.rs — QuestState */
export type QuestState = 'Name' | 'Finished' | 'Restart';

/** docs/tes3/libs/esp/src/types/enums.rs — AttributeId */
export type AttributeId =
    | 'None' | 'Strength' | 'Intelligence' | 'Willpower'
    | 'Agility' | 'Speed' | 'Endurance' | 'Personality' | 'Luck';

/** docs/tes3/libs/esp/src/types/enums.rs — SkillId */
export type SkillId =
    | 'None' | 'Block' | 'Armorer' | 'MediumArmor' | 'HeavyArmor'
    | 'BluntWeapon' | 'LongBlade' | 'Axe' | 'Spear' | 'Athletics'
    | 'Enchant' | 'Destruction' | 'Alteration' | 'Illusion'
    | 'Conjuration' | 'Mysticism' | 'Restoration' | 'Alchemy'
    | 'Unarmored' | 'Security' | 'Sneak' | 'Acrobatics'
    | 'LightArmor' | 'ShortBlade' | 'Marksman' | 'Mercantile'
    | 'Speechcraft' | 'HandToHand';

/** docs/tes3/libs/esp/src/types/enums.rs — Specialization */
export type Specialization = 'None' | 'Combat' | 'Magic' | 'Stealth';

// ============================================================================
//  Flags (serialised as string by serde)
// ============================================================================

/** docs/tes3/libs/esp/src/types/flags.rs — NpcFlags bitfield */
export type NpcFlag = 'FEMALE' | 'ESSENTIAL' | 'RESPAWN' | 'IS_BASE' | 'AUTO_CALCULATE';
export type NpcFlags = string; // serialised as "FEMALE | ESSENTIAL" etc.

/** docs/tes3/libs/esp/src/types/flags.rs — ServiceFlags bitfield */
export type ServiceFlags = string; // "BARTERS_WEAPONS | OFFERS_SPELLS" etc.

/** docs/tes3/libs/esp/src/types/flags.rs — FactionFlags */
export type FactionFlags = string; // "HIDDEN_FROM_PC"

/** docs/tes3/libs/esp/src/types/flags.rs — ObjectFlags */
export type ObjectFlags = number[]; // serialised as numeric array by WASM

// ============================================================================
//  Filter (dialogue info filter)
// ============================================================================

/** docs/tes3/libs/esp/src/types/dialogueinfo.rs — FilterValue */
export interface FilterValue {
    data: number | string;
    type: string; // 'Float' | 'Integer'
}

/** docs/tes3/libs/esp/src/types/dialogueinfo.rs — Filter */
export interface Filter {
    index: number;
    filter_type: FilterType;
    function: FilterFunction;
    comparison: FilterComparison;
    id: string;
    value: FilterValue;
}

// ============================================================================
//  Dialogue
// ============================================================================

/** docs/tes3/libs/esp/src/types/dialogue.rs — Dialogue record */
export interface TES3_Dialogue {
    type: 'Dialogue';
    flags: ObjectFlags;
    id: string;
    dialogue_type: DialogueType;
}

// ============================================================================
//  Dialogue Info
// ============================================================================

/** docs/tes3/libs/esp/src/types/dialogueinfo.rs — DialogueData */
export interface DialogueData {
    dialogue_type: DialogueType;
    disposition: number;
    speaker_rank: number;
    speaker_sex: Sex;
    player_rank: number;
}

/** docs/tes3/libs/esp/src/types/dialogueinfo.rs — DialogueInfo record */
export interface TES3_DialogueInfo {
    type: 'Info';
    flags: ObjectFlags;
    id: string;
    info_id: string;
    prev_id: string;
    next_id: string;
    data: DialogueData;
    speaker_id: string;
    speaker_race: string;
    speaker_class: string;
    speaker_faction: string;
    speaker_cell: string;
    player_faction: string;
    sound_path: string;
    text: string;
    quest_state?: QuestState;
    quest_name?: 0 | 1; // app-level compat field
    filters: Filter[];
    script_text: string;
}

// ============================================================================
//  AI Data & Packages
// ============================================================================

/** docs/tes3/libs/esp/src/types/aidata.rs — AiData */
export interface AiData {
    hello: number;
    fight: number;
    flee: number;
    alarm: number;
    services: ServiceFlags;
}

/** docs/tes3/libs/esp/src/types/aipackage.rs — AiPackage (tagged union) */
export type AiPackageType = 'Travel' | 'Wander' | 'Escort' | 'Follow' | 'Activate';

export interface AiWanderPackage {
    type: 'Wander';
    distance: number;
    duration: number;
    game_hour: number;
    idle2: number;
    idle3: number;
    idle4: number;
    idle5: number;
    idle6: number;
    idle7: number;
    idle8: number;
    idle9: number;
    reset: number;
}

export interface AiTravelPackage {
    type: 'Travel';
    location: [number, number, number];
    reset: number;
}

export interface AiEscortPackage {
    type: 'Escort';
    location: [number, number, number];
    duration: number;
    target: string;
    reset: number;
    cell: string;
}

export interface AiFollowPackage {
    type: 'Follow';
    location: [number, number, number];
    duration: number;
    target: string;
    reset: number;
    cell: string;
}

export interface AiActivatePackage {
    type: 'Activate';
    target: string;
    reset: number;
}

export type AiPackage =
    | AiWanderPackage
    | AiTravelPackage
    | AiEscortPackage
    | AiFollowPackage
    | AiActivatePackage;

/** docs/tes3/libs/esp/src/types/aipackage.rs — TravelDestination */
export interface TravelDestination {
    translation: [number, number, number];
    rotation: [number, number, number];
    cell: string;
}

// ============================================================================
//  NPC
// ============================================================================

/** docs/tes3/libs/esp/src/types/npc.rs — NpcStats */
export interface NpcStats {
    attributes: number[];  // [u8; 8]
    skills: number[];      // [u8; 27]
    health: number;
    magicka: number;
    fatigue: number;
}

/** docs/tes3/libs/esp/src/types/npc.rs — NpcData */
export interface NpcData {
    level: number;
    stats?: NpcStats;
    disposition: number;
    reputation: number;
    rank: number;
    gold: number;
}

/** docs/tes3/libs/esp/src/types/npc.rs — Npc record */
export interface TES3_Npc {
    type: 'Npc';
    flags: ObjectFlags;
    id: string;
    name: string;
    script: string;
    mesh: string;
    inventory: Array<[number, string]>;  // Vec<(i32, FixedString<32>)>
    spells: string[];
    ai_data: AiData;
    ai_packages: AiPackage[];
    travel_destinations: TravelDestination[];
    race: string;
    class: string;
    faction: string;
    head: string;
    hair: string;
    npc_flags: NpcFlags;
    blood_type: number;
    data: NpcData;
}

// ============================================================================
//  Header
// ============================================================================

/** docs/tes3/libs/esp/src/types/header.rs — Header record */
export interface TES3_Header {
    type: 'Header';
    flags: ObjectFlags;
    version: number;
    file_type: FileType;
    author: string;
    description: string;
    num_objects: number;
    masters: Array<[string, number]>;  // Vec<(String, u64)>
}

// ============================================================================
//  Faction
// ============================================================================

/** docs/tes3/libs/esp/src/types/faction.rs — FactionRequirement */
export interface FactionRequirement {
    attributes: [number, number];
    primary_skill: number;
    favored_skill: number;
    reputation: number;
}

/** docs/tes3/libs/esp/src/types/faction.rs — FactionReaction */
export interface FactionReaction {
    faction: string;
    reaction: number;
}

/** docs/tes3/libs/esp/src/types/faction.rs — FactionData */
export interface FactionData {
    favored_attributes: [AttributeId, AttributeId];
    requirements: FactionRequirement[];  // [FactionRequirement; 10]
    favored_skills: SkillId[];           // [SkillId; 7]
    flags: FactionFlags;
}

/** docs/tes3/libs/esp/src/types/faction.rs — Faction record */
export interface TES3_Faction {
    type: 'Faction';
    flags: ObjectFlags;
    id: string;
    name: string;
    rank_names: string[];
    reactions: FactionReaction[];
    data: FactionData;
}

// ============================================================================
//  Script
// ============================================================================

/** docs/tes3/libs/esp/src/types/script.rs — ScriptHeader */
export interface ScriptHeader {
    num_shorts: number;
    num_longs: number;
    num_floats: number;
    bytecode_length: number;
    variables_length: number;
}

/** docs/tes3/libs/esp/src/types/script.rs — Script record */
export interface TES3_Script {
    type: 'Script';
    flags: ObjectFlags;
    id: string;
    header: ScriptHeader;
    variables: number[];   // raw bytes (SCVR — null-terminated var names)
    bytecode: number[];    // raw bytes (SCDT — compiled opcodes)
    text: string;          // source text (SCTX)
}

// ============================================================================
//  Union of all record types the editor handles
// ============================================================================

export type TES3_Record =
    | TES3_Header
    | TES3_Dialogue
    | TES3_DialogueInfo
    | TES3_Npc
    | TES3_Faction
    | TES3_Script;
