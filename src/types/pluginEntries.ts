/**
 * App-level entry types.
 *
 * Combines canonical TES3 types (from ./tes3.ts) with editor-specific
 * fields (TMP_*) that the WASM parser injects for internal use.
 *
 * All consumer code should import from this file — it re-exports
 * everything from tes3.ts so a single import path covers both worlds.
 */

// Re-export all canonical TES3 types so consumers can import from one place
export type {
    FileType,
    DialogueType,
    Sex,
    FilterType,
    FilterComparison,
    FilterFunction,
    QuestState,
    AttributeId,
    SkillId,
    Specialization,
    NpcFlags,
    ServiceFlags,
    FactionFlags,
    ObjectFlags,
    FilterValue,
    Filter,
    DialogueData,
    AiData,
    AiPackageType,
    AiWanderPackage,
    AiTravelPackage,
    AiEscortPackage,
    AiFollowPackage,
    AiActivatePackage,
    AiPackage,
    TravelDestination,
    NpcStats,
    NpcData,
    FactionRequirement,
    FactionReaction,
    FactionData,
    TES3_Dialogue,
    TES3_DialogueInfo,
    TES3_Npc,
    TES3_Header,
    TES3_Faction,
    TES3_Script,
    ScriptHeader,
    TES3_Record,
} from './tes3';

import type {
    DialogueType,
    FilterComparison,
    FilterFunction,
    FilterType,
    FilterValue,
    ObjectFlags,
    AiData,
    AiPackage,
    NpcStats as TES3_NpcStats,
    NpcData as TES3_NpcData,
    Sex,
    TravelDestination,
    ScriptHeader as TES3_ScriptHeader,
} from './tes3';

// ============================================================================
//  BaseEntry — editor-specific fields injected by the WASM parser
// ============================================================================

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
    old_values?: unknown[];
}

// ============================================================================
//  Composite entry types  (TES3 record + BaseEntry)
// ============================================================================

export interface HeaderEntry extends BaseEntry {
    type: 'Header';
    author: string;
    description: string;
    file_type: 'Esp' | 'Esm';
    flags: ObjectFlags;
    masters: Array<[string, number]>;
    num_objects: number;
    version: number;
}

export interface DialogueEntry extends BaseEntry {
    type: 'Dialogue';
    flags: ObjectFlags;
    id: string;
    dialogue_type: DialogueType;
}

export interface InfoEntry extends BaseEntry {
    type: 'Info';
    id: string;
    info_id: string;
    prev_id: string;
    next_id: string;
    quest_name: 0 | 1;
    text: string;
    flags: ObjectFlags;
    filters: InfoFilter[];
    old_values?: InfoEntry[];
    script_text: string;
    speaker_id: string;
    speaker_cell: string;
    speaker_class: string;
    speaker_faction: string;
    speaker_race: string;
    data: InfoData;
}

/**
 * A DialogueInfo record as stored in Dexie (with TMP_ metadata).
 * Differs from InfoEntry in that the Dexie store uses `type: 'DialogueInfo'` and
 * injects TMP_ fields during import.
 */
export interface DialogueInfoRecord extends Omit<InfoEntry, 'type' | 'old_values'> {
    type: 'DialogueInfo';
    TMP_quest_name?: string;
    quest_state?: string;
    sound_path?: string;
    player_faction?: string;
    old_values?: DialogueInfoRecord[];
    old_entries?: DialogueInfoRecord[];
}

// ============================================================================
//  NPC sub-types  (backward-compat names → canonical TES3 types)
// ============================================================================

/** @deprecated Use AiData from tes3.ts instead */
export type NpcAiData = AiData;

/** @deprecated Use AiPackageType from tes3.ts instead */
export type NpcAiPackageType = 'Travel' | 'Wander' | 'Escort' | 'Follow' | 'Activate';

/** @deprecated Flat AI package shape — kept for backward compat */
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

export interface NpcEntry extends BaseEntry {
    head: string;
    hair: string;
    ai_data: AiData;
    ai_packages: AiPackage[] | NpcAiPackage[];
    blood_type: number;
    class: string;
    faction: string;
    flags: ObjectFlags;
    id: string;
    mesh: string;
    name: string;
    npc_flags: string;
    race: string;
    script: string;
    inventory: Array<[number, string]>;
    spells: string[];
    travel_destinations: TravelDestination[] | string[];
    data?: TES3_NpcData;
}

// ============================================================================
//  Info sub-types
// ============================================================================

/** @deprecated Use Sex from tes3.ts instead */
export type SpeakerSex = Sex;

export interface InfoData {
    dialogue_type: DialogueType;
    disposition: number;
    player_rank: number;
    speaker_race: number;
    speaker_sex: Sex;
}

export type Slot = 'Slot0' | 'Slot1' | 'Slot2' | 'Slot3' | 'Slot4' | 'Slot5' | 'Slot6';

export interface InfoFilter {
    id: string;
    slot: string;
    filter_type: FilterType;
    function: FilterFunction;
    comparison: FilterComparison;
    value: FilterValue;
}

// ============================================================================
//  Script
// ============================================================================

export interface ScriptEntry extends BaseEntry {
    type: 'Script';
    flags: ObjectFlags;
    id: string;
    header: TES3_ScriptHeader;
    variables: number[];
    bytecode: number[];
    text: string;
}