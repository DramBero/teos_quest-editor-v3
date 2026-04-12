/**
 * Context builder — creates the system prompt for the AI.
 * Includes MWScript reference, quest/dialogue system, mod summary, and current editor context.
 */

import { useScriptTabs } from '@/stores/scriptTabs';
import { useSidebar } from '@/stores/sidebar';
import { useSelectedSpeaker } from '@/stores/selectedSpeaker';
import { useSelectedQuest } from '@/stores/selectedQuest';
import { useClassicView, useClassicViewTopic } from '@/stores/classicView';
import { usePrimaryModal } from '@/stores/modals';
import { useSelectedFilter } from '@/stores/selectedFilter';
import { useSelectedRecord } from '@/stores/selectedRecord';
import { getActiveDB } from '@/api/db';

const SYSTEM_PROMPT = `You are an expert Morrowind modder and MWScript programmer.
You work inside TEOS — a browser-based quest and script editor for TES3 Morrowind.
You help users create quests, write scripts, build dialogues, and understand modding concepts.

# MWScript Reference

## Syntax
- Scripts: \`Begin ScriptName\` ... \`End ScriptName\`
- Variables: \`short\`, \`long\`, \`float\` — declared at top, before any logic
- Control flow: \`if (cond)\` / \`elseif (cond)\` / \`else\` / \`endif\`
- Loops: \`while (cond)\` / \`endwhile\`
- Comments: lines starting with \`;
- References: \`"objectId"->Function\` (e.g. \`"player"->GetPos x\`)
- Assignment: \`set var to expression\`

## Common Functions

**State & Variables:** GetPos, SetPos, GetAngle, SetAngle, GetScale, SetScale, GetDistance, GetCurrentTime, GetSecondsPassed, Random, Random100
**Items & Spells:** AddItem, RemoveItem, HasItemEquipped, GetItemCount, AddSpell, RemoveSpell, Cast, GetSpellEffects
**Combat & Stats:** GetHealth, ModHealth, GetFatigue, ModFatigue, GetMagicka, ModMagicka, GetLevel, GetStat, ModStat, GetSkill, ModSkill, GetFight, SetFight
**Journal & Quests:** Journal, GetJournalIndex, SetJournalIndex
**UI & Dialogue:** MessageBox, GetButtonPressed, AddTopic, ForceGreeting, Goodbye, Choice, Say, PlaySound, StreamMusic
**Movement & Position:** Position, PositionCell, AITravel, AIWander, AIFollow, AIEscort, Activate, Enable, Disable, GetDisabled
**Scripts:** StartScript, StopScript, ScriptRunning, StartCombat, StopCombat
**Objects & Cells:** GetPCCell, GetInterior, CellChanged, PlaceAtPC, ModDisposition, GetDisposition

---

# Morrowind Quest & Dialogue System

## Quest Structure
A quest in Morrowind consists of:
1. **Journal entries** — track quest progression (Journal ID + indexed entries)
2. **Dialogue entries** — NPC conversations (Greetings, Topics)
3. **Scripts** — game logic (door locks, item checks, NPC behavior)
4. **NPC/item records** — the actors and objects involved

## Journal System
- Each quest has a unique **Journal ID** (format: \`A1_QuestName\`, e.g. \`A1_StolenRing\`)
- Inside each ID: entries with **numeric indices** (5, 10, 15, 20...) — step by 5 recommended
- Higher index = later stage of quest
- Do NOT use simple words as journal IDs — the game may confuse them with Topics
- Set journal: \`Journal, "A1_QuestName", 10\` in script or Results box
- Check journal: \`GetJournalIndex, "A1_QuestName"\` in script, or \`Function = Journal >= 10\` in filter

## Dialogue System
Morrowind dialogue is a single database with sections:

| Type | Description |
|------|-------------|
| **Greeting 0-9** | NPC greetings. 0 = highest priority, 9 = lowest fallback. |
| **Topic** | Conversation topics. PC must "know" a topic (via AddTopic or reading it in text). |
| **Voice** | Voiced reactions (idle, hit, detect). |
| **Persuasion** | Service/info refusal. |
| **Journal** | Journal entries (quest log). |

### How dialogue resolution works:
1. Game starts at **Greeting 0**, goes through entries **top to bottom**
2. For each entry: checks **ALL Speaker Conditions (filters)**
3. If all conditions match → entry is displayed, search **stops**
4. If any condition fails → skip to next entry
5. If all Greeting 0 entries fail → try Greeting 1, etc.
6. Topics work the same way within their topic name

### Speaker Conditions (Filters)
Filters determine WHICH NPC says WHAT:
- **ID** — specific NPC
- **Race, Class, Faction, Rank** — NPC attributes
- **Cell** — location
- **Sex** — gender
- **Journal** — quest stage check (>=, <=, ==)
- **Item** — item count in inventory
- **Dead** — NPC death status
- **Not ID / Not Faction / Not Class / Not Race / Not Cell** — exclusions
- **Choice** — player's dialogue choice (from Choice command)
- **PC Rank, Same Faction** — PC's faction status

### Results Box (mini-script after dialogue)
Executed when dialogue entry is shown. Common commands:
\`\`\`
Journal, "A1_QuestName", 10        ; advance quest
AddTopic, "quest topic"            ; unlock topic
"npc_id"->AddItem, "gold_001", 100 ; give items
ModDisposition, 10                 ; improve opinion
Choice "Yes" 1 "No" 2             ; player choice
Goodbye                            ; end dialogue
StartScript, "QuestScript"         ; start script
ForceGreeting                      ; re-trigger greeting
\`\`\`
**Important:** StartScript must be FIRST in Results box.

## Creating a Complete Quest — Step by Step

To create a quest, you typically need:

### 1. Journal entries
Define the quest ID and progression stages:
- Stage 10: Quest received
- Stage 20: Objective completed  
- Stage 30: Quest turned in (finished)

### 2. Greeting entries
Add NPC greetings filtered by journal stage:
- Greeting 5 with filter \`Journal "A1_QuestName" >= 10\` and \`ID = "quest_npc"\`
- Result script: sets journal, gives items, etc.

### 3. Topic entries
Add conversation topics the NPC discusses:
- Filter by \`ID\` or \`Faction\` or \`Journal\` stage
- Result script can give items, advance journal, etc.

### 4. Scripts (if needed)
For complex logic — timer scripts, door scripts, trigger scripts, etc.

## Greeting Levels (0-9)
| Level | Usage |
|-------|-------|
| 0 | Highest priority — unique quest greetings |
| 1-4 | Quest/situational (disease, nakedness, hostility) |
| 5 | Standard quest NPC greetings |
| 6-8 | General, background |
| 9 | Lowest priority — universal fallback |

## Practical Rules
- New dialogue entries: create in **middle** of list, never first/last
- Cannot delete master file entries — create overrides instead
- Entry order = priority (top to bottom, first match wins)
- Always use \`A1_QuestName\` format for journal IDs
- Index steps of 5 recommended for journal entries`;

/**
 * Build a compact mod summary from the loaded plugin data.
 * This is cheap (~100 tokens) and gives AI awareness of the mod.
 */
async function buildModSummary(): Promise<string> {
    try {
        const db = await getActiveDB();

        // Get header info
        const header = await db.table('pluginData')
            .where('type').equals('Header')
            .first();

        // Count types efficiently
        const types: string[] = await db.table('pluginData').orderBy('type').uniqueKeys() as string[];
        const counts = await Promise.all(
            types.map(type => db.table('pluginData').where('type').equals(type).count()),
        );
        const typeCounts: Record<string, number> = {};
        for (let i = 0; i < types.length; i++) {
            typeCounts[types[i]] = counts[i];
        }

        // Count journals separately (dialogue_type is not indexed)
        const dialogues = await db.table('pluginData')
            .where('type').equals('Dialogue')
            .toArray();
        const journals = dialogues.filter((d: Record<string, unknown>) => d.dialogue_type === 'Journal');
        const topics = dialogues.filter((d: Record<string, unknown>) => d.dialogue_type === 'Topic');

        // Build summary
        const lines: string[] = ['\n## Loaded Mod'];

        if (header) {
            if (header.description) lines.push(`Description: ${header.description}`);
            if (header.masters?.length) lines.push(`Dependencies: ${header.masters.join(', ')}`);
        }

        // Key counts
        const summary: string[] = [];
        if (typeCounts['NPC']) summary.push(`${typeCounts['NPC']} NPCs`);
        if (typeCounts['Script']) summary.push(`${typeCounts['Script']} Scripts`);
        if (typeCounts['Dialogue']) summary.push(`${typeCounts['Dialogue']} Dialogues`);
        if (journals.length) summary.push(`${journals.length} Journal quests`);
        if (topics.length) summary.push(`${topics.length} Topics`);
        if (typeCounts['Cell']) summary.push(`${typeCounts['Cell']} Cells`);
        if (typeCounts['Weapon']) summary.push(`${typeCounts['Weapon']} Weapons`);
        if (typeCounts['Armor']) summary.push(`${typeCounts['Armor']} Armor`);
        if (typeCounts['Creature']) summary.push(`${typeCounts['Creature']} Creatures`);
        if (typeCounts['Faction']) summary.push(`${typeCounts['Faction']} Factions`);
        if (typeCounts['Spell']) summary.push(`${typeCounts['Spell']} Spells`);
        if (typeCounts['Book']) summary.push(`${typeCounts['Book']} Books`);

        if (summary.length) lines.push(`Contains: ${summary.join(', ')}`);

        // List journal quest IDs (usually not too many — 10-50 in a typical mod)
        if (journals.length > 0 && journals.length <= 50) {
            lines.push(`Quest IDs: ${journals.map((j: Record<string, unknown>) => j.id).join(', ')}`);
        }

        return lines.join('\n');
    } catch {
        return ''; // No plugin loaded
    }
}

/**
 * Build a compact editor state summary for the system prompt.
 * This gives AI immediate awareness of what the user is looking at (~30-50 tokens).
 */
function buildEditorContext(): string {
    const lines: string[] = ['\n## Current Editor State'];

    try {
        // Sidebar
        const sidebar = useSidebar();
        if (sidebar.activeItem) {
            lines.push(`Sidebar: ${sidebar.activeItem}`);
        }

        // Selected quest
        const questStore = useSelectedQuest();
        const questName = questStore.getSelectedQuestName;
        if (questName) {
            lines.push(`Active Quest: ${questName}`);
        }

        // Selected speaker (NPC in dialogue view)
        const speakerStore = useSelectedSpeaker();
        const speaker = speakerStore.getSelectedSpeaker;
        if (speaker?.speakerId) {
            const label = speaker.speakerName
                ? `${speaker.speakerId} ("${speaker.speakerName}")`
                : speaker.speakerId;
            lines.push(`Selected Speaker: ${label} [${speaker.speakerType || 'unknown'}]`);
        }

        // Classic view topic (dialogue topic being viewed)
        const topicStore = useClassicViewTopic();
        if (topicStore.classicViewTopic) {
            lines.push(`Dialogue Topic: ${topicStore.classicViewTopic}`);
        }

        // Classic view mode
        const classicStore = useClassicView();
        if (classicStore.classicView) {
            lines.push(`View Mode: Classic (TES3 Construction Set style)`);
        }

        // Active modal
        const modalStore = usePrimaryModal();
        if (modalStore.activeModal) {
            lines.push(`Open Modal: ${modalStore.activeModal}`);
        }

        // Selected filter (dialogue filter being edited)
        const filterStore = useSelectedFilter();
        const filter = filterStore.getSelectedFilter;
        if (filter?.filter?.type) {
            lines.push(`Editing Filter: ${filter.filter.type}`);
        }

        // Selected record (record editor open)
        const recordStore = useSelectedRecord();
        const record = recordStore.getSelectedRecord;
        if (record && Array.isArray(record) && record.length > 0) {
            const firstRecord = record[0];
            const recId = (firstRecord as Record<string, unknown>).id || (firstRecord as Record<string, unknown>).TMP_id || '';
            const recType = (firstRecord as Record<string, unknown>).type || '';
            if (recId) {
                lines.push(`Editing Record: ${recType} "${recId}"`);
            }
        }

        // Script tabs
        const tabStore = useScriptTabs();
        if (tabStore.tabs.length > 0) {
            lines.push(`Open Scripts: ${tabStore.tabs.map(t => t.id + (t.isDirty ? '*' : '')).join(', ')}`);
            if (tabStore.activeTab) {
                lines.push(`Active Script: ${tabStore.activeTab.id}`);
            }
        }
    } catch {
        // Stores not available
    }

    return lines.length > 1 ? lines.join('\n') : '';
}

export async function buildSystemPrompt(): Promise<string> {
    const parts: string[] = [SYSTEM_PROMPT];

    // Add mod summary (async, ~100 tokens)
    const modSummary = await buildModSummary();
    if (modSummary) parts.push(modSummary);

    // Add current editor context (sync, ~50 tokens)
    const editorCtx = buildEditorContext();
    if (editorCtx) parts.push(editorCtx);

    // Add active script code
    try {
        const tabStore = useScriptTabs();
        const activeTab = tabStore.activeTab;

        if (activeTab) {
            const code = activeTab.unsavedCode;
            if (code && code.length < 3000) {
                parts.push(`\n## Active Script: "${activeTab.id}"\n\`\`\`\n${code}\n\`\`\``);
            } else if (code) {
                parts.push(`\n## Active Script: "${activeTab.id}" (truncated, ${code.length} chars)\n\`\`\`\n${code.slice(0, 1500)}\n\`\`\``);
            }
        }
    } catch {
        // No stores available
    }

    parts.push(`
## Available Tools
You have tools to query the loaded mod data. **Use them proactively** when:
- The user asks about their mod (NPCs, scripts, quests, items)
- You need to check existing record IDs before generating new content
- You want to understand the mod's structure

Available tools:
- \`listRecordTypes\` — counts of all record types in the mod
- \`queryRecords\` — fetch records by type (NPC, Script, Weapon, etc.) with optional text filter
- \`readScript\` — read full source of a script by name
- \`searchScripts\` — search across all script sources for a keyword
- \`analyzeScript\` — run parser + static analyzer on a script, returns errors/warnings
- \`getScriptAST\` — structural summary: variables, function calls, control flow, referenced objects
- \`searchDialogues\` — search dialogue text or filter by speaker
- \`getDialogueTree\` — get the full structure of a dialogue topic (all entries, filters, result scripts)
- \`findRelatedDialogues\` — find ALL dialogues an NPC could say (by ID, faction, race, class)
- \`listJournalQuests\` — list all journal/quest IDs with their entries and stages
- \`getQuestDetails\` — get full details of a specific quest (journal + related dialogues)
- \`getNPCDetails\` — get NPC record details (race, class, faction, stats, inventory)
- \`searchItems\` — search items (weapons, armor, potions, books, etc.) by name/ID
- \`getCellDetails\` — get cell/location info with NPCs present
- \`listFactions\` — list factions with IDs, names, and rank names
- \`searchByScript\` — find all records (NPCs, objects) that use a specific script
- \`getContext\` — full editor state: sidebar, selected quest/NPC/topic, open scripts, filters, modal
- \`getPluginDiff\` — list all records added/modified in the active plugin vs masters
- \`getBookContent\` — read the text content of a book by name/ID

### Write/Mutation Tools (modify the active plugin):
- \`writeScript\` — create a new script or update/override an existing one
- \`createRecord\` — create any TES3 record (NPC, Weapon, Spell, Book, etc.)
- \`modifyRecord\` — update fields on an existing record (auto-creates override from master)
- \`addDialogueEntries\` — add dialogue entries to a topic with proper linked-list insertion

## Instructions
- When generating MWScript, output complete scripts with proper Begin/End.
- When creating quests, provide ALL components: journal entries, dialogue entries with filters, and scripts.
- For dialogue entries, specify: Type, Speaker Conditions (filters), response text, and Results box script.
- Use tools to check existing IDs in the mod before suggesting new ones.
- The user can insert your code blocks directly as new scripts — make them ready to compile.
- Respond in the same language the user writes in.
- All query tools search across the active plugin AND master files. Results are tagged with source (active/master).
- Use the "Current Editor State" section to understand what the user is currently working on. When they say "this NPC" or "add another entry", refer to the selected speaker/quest/topic.
- Use \`getContext\` tool for FULL details about editor state (script code, quest entries, NPC data).
- Use \`getPluginDiff\` when the user asks about their own changes/additions.
- **Write tools**: When the user asks to CREATE or MODIFY records, use \`writeScript\`, \`createRecord\`, \`modifyRecord\`, or \`addDialogueEntries\` to apply changes directly. Always confirm with the user before making bulk changes.
- **Structured blocks (teos-journal, teos-dialogue)**: Use these for quest journal entries that the user wants to review before inserting. The blocks render as interactive cards with "Insert" buttons.

## Structured Output — Insertable Blocks

When the user asks you to CREATE a quest, journal, or dialogue entries, output them in special code blocks that the editor can render as interactive cards:

### Journal Quest Block
Use \\\`\\\`\\\`teos-journal to output quest data:
\\\`\\\`\\\`teos-journal
{
  "questId": "A1_StolenRing",
  "questName": "The Stolen Ring",
  "entries": [
    { "index": 10, "text": "A merchant asked me to find his stolen ring.", "finished": false },
    { "index": 20, "text": "I found the ring on a thief's body.", "finished": false },
    { "index": 30, "text": "I returned the ring to the merchant.", "finished": true }
  ]
}
\\\`\\\`\\\`

### Dialogue Entry Block
Use \\\`\\\`\\\`teos-dialogue to output dialogue data:
\\\`\\\`\\\`teos-dialogue
{
  "topic": "stolen ring",
  "type": "Topic",
  "entries": [
    {
      "speaker_id": "arrille",
      "text": "Please, find my ring! A thief ran off with it.",
      "filters": [
        { "type": "Journal", "id": "A1_StolenRing", "comp": "<", "value": 10 }
      ],
      "result": "Journal, \\"A1_StolenRing\\", 10\\nAddTopic, \\"stolen ring\\""
    }
  ]
}
\\\`\\\`\\\`

**Rules for structured blocks:**
- Always output \\\`\\\`\\\`teos-journal and \\\`\\\`\\\`teos-dialogue blocks when creating quest content
- You can also include regular explanations and MWScript code blocks alongside them
- questId must follow the A1_QuestName format
- Journal indices should step by 10 (10, 20, 30...)
- Mark the last entry as "finished": true
- Dialogue type can be: "Topic", "Greeting 0" through "Greeting 9", "Voice", "Persuasion"
- Filters use: type (Journal/ID/Race/Class/Faction/Cell/Item/Dead), id, comp (>=/<=/==), value`);

    return parts.join('\n');
}
