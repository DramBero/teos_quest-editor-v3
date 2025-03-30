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
    TMP_speaker_rank: string;
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

export type SpeakerSex = 'Any' | 'Male' | 'Female';

export interface InfoData {
    dialogue_type: DialogueType;
    disposition: number;
    player_rank: number;
    speaker_rank: number;
    speaker_sex: SpeakerSex;
}

export interface InfoFilter {
    id: string;
    slot: string;
    filter_type: string;
    filter_function: string;
    filter_comparison: string;
}