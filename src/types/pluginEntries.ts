export interface BaseEntry {
    TMP_dep: string;
    TMP_id: string;
    TMP_index: number;
    TMP_info_id: string;
    TMP_is_active: boolean;
    TMP_next_id: string;
    TMP_prev_id: string;
    TMP_speaker_cell: string;
    TMP_speaker_class: string;
    TMP_speaker_faction: string;
    TMP_speaker_id: string;
    TMP_speaker_race: string;
    TMP_topic: string;
    TMP_type: string;
}

export type FileType = 'Esp' | 'Esm';

export interface HeaderEntry extends BaseEntry {
    author: string;
    description: string;
    file_type: FileType;
    type: 'Header';
    flags: number[];
    masters: Array<number | string>;
    num_objects: number;
    version: number;
}

export type DialogueType = 'Topic' | 'Greeting' | 'Persuasion' | 'Journal';

export interface DialogueEntry extends BaseEntry {
    type: 'Dialogue';
    flags: number[];
    id: string;
    dialogue_type: DialogueType;
}

export interface InfoEntry extends BaseEntry {
    type: 'Info';
    info_id: string;
    prev_id: string;
    next_id: string;
    quest_name: 0 | 1;
    text: string;
    flags: number[];
    filters: InfoFilter;
}

export interface NpcAiData {
    alarm: number;
    fight: number;
    flee: number;
    hello: number;
    services: string;
}

export type NpcAiPackageType = 'Travel' | 'Wander' | 'Escort' | 'Follow' | 'Activate';

export interface NpcAiPackage {
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
    type: NpcAiPackageType;
}

export interface NpcStats {
    attributes: number[];
    fatigue: number;
    health: number;
    magicka: number;
    skills: number[];
}

export interface NpcData {
    disposition: number;
    gold: number;
    level: number;
    rank: number;
    reputation: number;
    stats: NpcStats;
}

export interface NpcEntry extends BaseEntry {
    head: string;
    hair: string;
    ai_data: NpcAiData;
    ai_packages: NpcAiPackage[];
    blood_type: number;
    class: string;
    faction: string;
    flags: string;
    id: string;
    mesh: string;
    name: string;
    npc_flags: string;
    race: string;
    script: string;
    inventory: Array<Array<number | string>>;
    spells: string[];
    travel_destinations: string[];
}

export type SpeakerSex = 'Any' | 'Male' | 'Female';

export interface InfoData {
    dialogue_type: DialogueType;
    disposition: number;
    player_rank: number;
    speaker_race: number;
    speaker_sex: SpeakerSex;
}

export type FilterComparison = 'Less' | 'LesserEqual' | 'Equal' | 'NotEqual' | 'GreaterEqual' | 'Greater';
export type FilterFunction =
    'ReactionLow' |
    'ReactionHigh' |
    'RankRequirement' |
    'Reputation' |
    'HealthPercent' |
    'PcReputation' |
    'PcLevel' |
    'PcHealthPercent' |
    'PcMagicka' |
    'PcFatigue' |
    'PcStrength' |
    'PcBlock' |
    'PcArmorer' |
    'PcMediumArmor' |
    'PcHeavyArmor' |
    'PcBluntWeapon' |
    'PcLongBlade' |
    'PcAxe' |
    'PcSpear' |
    'PcAthletics' |
    'PcEnchant' |
    'PcDestruction' |
    'PcAlteration' |
    'PcIllusion' |
    'PcConjuration' |
    'PcMysticism' |
    'PcRestoration' |
    'PcAlchemy' |
    'PcUnarmored' |
    'PcSecurity' |
    'PcSneak' |
    'PcAcrobatics' |
    'PcLightArmor' |
    'PcShortBlade' |
    'PcMarksman' |
    'PcMercantile' |
    'PcSpeechcraft' |
    'PcHandToHand' |
    'PcSex' |
    'PcExpelled' |
    'PcCommonDisease' |
    'PcBlightDisease' |
    'PcClothingModifier' |
    'PcCrimeLevel' |
    'SameSex' |
    'SameRace' |
    'SameFaction' |
    'FactionRankDifference' |
    'Detected' |
    'Alarmed' |
    'Choice' |
    'PcIntelligence' |
    'PcWillpower' |
    'PcAgility' |
    'PcSpeed' |
    'PcEndurance' |
    'PcPersonality' |
    'PcLuck' |
    'PcCorprus' |
    'Weather' |
    'PcVampire' |
    'Level' |
    'Attacked' |
    'TalkedToPc' |
    'PcHealth' |
    'CreatureTarget' |
    'FriendHit' |
    'Fight' |
    'Hello' |
    'Alarm' |
    'Flee' |
    'ShouldAttack' |
    'Werewolf' |
    'WerewolfKills' |
    'NotClass' |
    'DeadType' |
    'NotFaction' |
    'ItemType' |
    'JournalType' |
    'NotCell' |
    'NotRace' |
    'NotIdType' |
    'Global' |
    'Pcgold' |
    'CompareGlobal' |
    'CompareLocal' |
    'VariableCompare';

export type Slot = 'Slot0' | 'Slot1' | 'Slot2' | 'Slot3' | 'Slot4' | 'Slot5' | 'Slot6';
export type FilterType = 'None' | 'Function' | 'Global' | 'Local' | 'Journal' | 'Item' | 'Dead' | 'NotId' | 'NotFaction' | 'NotClass' | 'NotRace' | 'NotCell' | 'NotLocal';
export interface InfoFilter {
    id: string;
    slot: string;
    filter_type: string;
    filter_function: string;
    filter_comparison: FilterComparison;
}