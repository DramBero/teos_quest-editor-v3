/**
 * MWScript documentation database.
 *
 * Rich documentation for MWScript functions, sourced from:
 * - Morrowind Scripting For Dummies (MSFD) 9th Edition
 * - OpenMW source code
 * - Community knowledge
 *
 * Used by hover tooltips, autocomplete, and lint rules.
 */

export interface MWScriptDoc {
    /** Human-readable description */
    description: string;
    /** Warnings, known bugs, gotchas */
    gotchas?: string[];
    /** Helpful tips and tricks */
    tips?: string[];
    /** Required expansion: 'Tribunal', 'Bloodmoon', or null */
    requires?: string;
    /** True if this function is known to be broken */
    broken?: boolean;
    /** Related functions */
    seeAlso?: string[];
    /** Enum values for functions that return/accept codes */
    enumValues?: Record<string, string>;
    /** Brief code example */
    example?: string;
}

/**
 * Documentation keyed by lowercase function/instruction name.
 * Only functions with meaningful docs are included — absence means
 * "no special documentation beyond the signature".
 */
export const MWSCRIPT_DOCS: Record<string, MWScriptDoc> = {

    // =========================================================================
    //  AI
    // =========================================================================

    aitravel: {
        description: 'Makes the actor walk to the specified world coordinates.',
        gotchas: [
            'NPC must have Hello distance set to 0 during travel, otherwise they stop to greet the player.',
            'If the NPC reaches a load door, the game will CTD. Teleport the NPC manually with PositionCell instead.',
        ],
        tips: [
            'Use GetAIPackageDone to detect when the actor arrives.',
            'Consider using coordinate checks instead of GetAIPackageDone — it is more reliable.',
        ],
        seeAlso: ['aiescort', 'aiwander', 'aifollow', 'getaipackagedone'],
    },

    aiescort: {
        description: 'Makes the actor escort the target to the specified coordinates.',
        gotchas: [
            'Can be unreliable in some circumstances. Consider using AITravel with manual coordinate checks as an alternative.',
        ],
        seeAlso: ['aitravel', 'aiescortcell', 'aifollow'],
    },

    aiwander: {
        description: 'Makes the actor wander within a radius. The 8 idle values control how much time is spent on each idle animation (0-10).',
        tips: [
            'AiWander 0 0 0 0 0 0 0 0 0 makes the actor stand still.',
            'Idle values: 0=nothing, 1=fidget, 2=look around, etc.',
        ],
        seeAlso: ['aitravel', 'getaipackagedone'],
    },

    getaipackagedone: {
        description: 'Returns 1 if the actor has completed its current AI package (travel, escort, etc.).',
        gotchas: [
            'Easily broken by several factors — the NPC getting distracted, greeting the player, etc.',
            'Coordinate-based checks are often more reliable.',
        ],
        seeAlso: ['aitravel', 'aiescort', 'aiwander', 'getcurrentaipackage'],
    },

    getcurrentaipackage: {
        description: 'Returns the current AI package type as an integer.',
        enumValues: {
            '-1': 'None',
            '0': 'Wander',
            '1': 'Travel',
            '2': 'Escort',
            '3': 'Follow',
            '4': 'Activate',
        },
        seeAlso: ['getaipackagedone'],
    },

    getdetected: {
        description: 'Returns 1 if the calling actor has detected the specified actor.',
        seeAlso: ['getlineofsight'],
    },

    getlineofsight: {
        description: 'Returns 1 if the calling actor has an unobstructed line of sight to the target.',
        tips: [
            'Also available as GetLOS (alias).',
            'The target must have "References Persist" checked.',
        ],
        seeAlso: ['getdetected', 'getlos'],
    },

    sethello: {
        description: 'Sets the actor\'s Hello distance (how far away they initiate greetings). Range: 0-100.',
        tips: [
            'Set to 0 to prevent the NPC from greeting the player during scripted movement.',
        ],
        seeAlso: ['setfight', 'setflee', 'setalarm', 'gethello'],
    },

    setfight: {
        description: 'Sets the actor\'s Fight value, controlling aggression. Range: 0-100.',
        tips: [
            '0 = peaceful, 100 = attacks on sight.',
            'NPCs with Fight >= 80 will attack the player.',
        ],
        seeAlso: ['sethello', 'setflee', 'setalarm', 'startcombat'],
    },

    startcombat: {
        description: 'Forces the actor to start combat with the specified target.',
        seeAlso: ['stopcombat', 'setfight'],
    },

    stopcombat: {
        description: 'Forces the actor to stop all combat.',
        seeAlso: ['startcombat'],
    },

    face: {
        description: 'Makes the actor face the specified x, y coordinates. Useful for making NPCs turn toward the player.',
        seeAlso: ['setangle'],
    },

    // =========================================================================
    //  Cell
    // =========================================================================

    cellchanged: {
        description: 'Returns 1 on the first frame after the player enters a new cell.',
        gotchas: [
            'Only returns 1 for ONE frame. If your script has a Return before this check, you will miss it.',
        ],
        seeAlso: ['getpccell', 'getinterior'],
    },

    getpccell: {
        description: 'Returns 1 if the player is in a cell whose name contains the specified string.',
        tips: [
            'Partial match: GetPCCell "Balmora" matches "Balmora, Guild of Fighters".',
            'For exterior cells, use grid coordinates like "0, -3".',
        ],
        seeAlso: ['cellchanged', 'getinterior'],
    },

    getinterior: {
        description: 'Returns 1 if the calling object is in an interior cell.',
        seeAlso: ['getpccell'],
    },

    coc: {
        description: 'Teleports the player to the named cell. Alias for CenterOnCell.',
        tips: [
            'Primarily a console/debug command. Very useful for testing mods.',
        ],
        seeAlso: ['centeroncell', 'coe'],
    },

    // =========================================================================
    //  Container / Inventory
    // =========================================================================

    additem: {
        description: 'Adds the specified number of items to the actor\'s inventory.',
        gotchas: [
            'Calling on the Player while in MenuMode may cause instability.',
            'Adding an item with a script to a container causes the script to run immediately.',
        ],
        example: 'Player->AddItem "gold_001" 100',
        seeAlso: ['removeitem', 'getitemcount', 'equip'],
    },

    removeitem: {
        description: 'Removes the specified number of items from the actor\'s inventory.',
        gotchas: [
            'Do NOT call RemoveItem on the item whose script is running — this causes a crash. Use a global script instead.',
            'If the item count goes below 0, it wraps to a very large number.',
        ],
        example: 'Player->RemoveItem "gold_001" 50',
        seeAlso: ['additem', 'getitemcount'],
    },

    getitemcount: {
        description: 'Returns the number of items of the specified type in the actor\'s inventory.',
        example: 'set count to ( Player->GetItemCount "gold_001" )',
        seeAlso: ['additem', 'removeitem'],
    },

    equip: {
        description: 'Forces the actor to equip the specified item.',
        gotchas: [
            'Item must already be in the actor\'s inventory.',
        ],
        requires: 'Tribunal',
        seeAlso: ['additem', 'hasitemequipped'],
    },

    hasitemequipped: {
        description: 'Returns 1 if the actor currently has the specified item equipped.',
        gotchas: [
            'If an NPC has a bow but no arrows and fights hand-to-hand, this still returns true for the bow.',
        ],
        seeAlso: ['equip', 'getweapontype'],
    },

    getweapontype: {
        description: 'Returns the weapon type of the actor\'s currently equipped weapon.',
        enumValues: {
            '-1': 'Unarmed',
            '0': 'Short Blade, 1H',
            '1': 'Long Blade, 1H',
            '2': 'Long Blade, 2H',
            '3': 'Blunt, 1H',
            '4': 'Blunt, 2H close',
            '5': 'Blunt, 2H wide',
            '6': 'Spear, 2H',
            '7': 'Axe, 1H',
            '8': 'Axe, 2H',
            '9': 'Bow',
            '10': 'Crossbow',
            '11': 'Thrown',
            '12': 'Arrow',
            '13': 'Bolt',
        },
        seeAlso: ['getarmortype', 'hasitemequipped'],
    },

    getarmortype: {
        description: 'Returns the armor weight class for the specified armor slot.',
        enumValues: {
            '-1': 'Unarmored',
            '0': 'Light Armor',
            '1': 'Medium Armor',
            '2': 'Heavy Armor',
        },
        tips: [
            'Armor slot argument: 0=Helmet, 1=Cuirass, 2=L.Pauldron, 3=R.Pauldron, 4=Greaves, 5=Boots, 6=L.Gauntlet, 7=R.Gauntlet, 8=Shield, 9=L.Bracer, 10=R.Bracer',
        ],
        seeAlso: ['getweapontype', 'hasitemequipped'],
    },

    drop: {
        description: 'Drops the specified number of items from the actor\'s inventory onto the ground.',
        gotchas: [
            'May not work correctly in all situations. Non-actors cannot drop items.',
        ],
        seeAlso: ['additem', 'removeitem'],
    },

    // =========================================================================
    //  Control / Movement
    // =========================================================================

    forcesneak: {
        description: 'Puts the actor into permanent sneak mode until ClearForceSneak is called.',
        tips: [
            'Priority: Sneak > Running > Jump > MoveJump. Only one forced movement at a time.',
        ],
        seeAlso: ['clearforcesneak', 'forcerun', 'getforcesneak'],
    },

    forcerun: {
        description: 'Makes the actor always run when moving.',
        requires: 'Tribunal',
        tips: [
            'Priority: Sneak > Running > Jump > MoveJump. Only one forced movement at a time.',
        ],
        seeAlso: ['clearforcerun', 'forcesneak', 'forcejump'],
    },

    forcejump: {
        description: 'Makes the actor constantly jump.',
        requires: 'Tribunal',
        seeAlso: ['clearforcejump', 'forcemovejump'],
    },

    // =========================================================================
    //  Dialogue / Journal
    // =========================================================================

    journal: {
        description: 'Sets a journal entry to the specified index. Displays the journal text to the player.',
        tips: [
            'Use SetJournalIndex if you want to change the index without displaying the entry.',
        ],
        example: 'Journal "MQ_MainQuest" 10',
        seeAlso: ['setjournalindex', 'getjournalindex'],
    },

    setjournalindex: {
        description: 'Sets the journal index without displaying the entry text to the player.',
        tips: [
            'Useful for silent quest state changes.',
        ],
        seeAlso: ['journal', 'getjournalindex'],
    },

    getjournalindex: {
        description: 'Returns the current journal index for the specified quest topic.',
        example: 'if ( GetJournalIndex "MQ_MainQuest" >= 10 )',
        seeAlso: ['journal', 'setjournalindex'],
    },

    addtopic: {
        description: 'Adds a dialogue topic to the player\'s topic list.',
        seeAlso: ['forcegreeting'],
    },

    forcegreeting: {
        description: 'Forces the NPC to initiate a dialogue with the player on the next frame.',
        gotchas: [
            'After 72 game hours (fCorpseClearDelay), ForceGreeting may stop working unless "References Persist" is checked.',
        ],
        seeAlso: ['addtopic', 'goodbye'],
    },

    goodbye: {
        description: 'Closes the dialogue window. Used in dialogue result scripts.',
        seeAlso: ['forcegreeting'],
    },

    choice: {
        description: 'Presents dialogue choices to the player during a conversation.',
        example: 'Choice "Accept the quest" 1 "Refuse" 2',
        seeAlso: ['getbuttonpressed'],
    },

    modfactionreaction: {
        description: 'Modifies the reaction of factionA toward factionB by the given amount.',
        example: 'ModFactionReaction "Mages Guild" "Fighters Guild" -10',
        seeAlso: ['setfactionreaction', 'getfactionreaction'],
    },

    moddisposition: {
        description: 'Modifies the NPC\'s disposition toward the player by the given amount.',
        seeAlso: ['setdisposition', 'getdisposition'],
    },

    // =========================================================================
    //  GUI / MessageBox
    // =========================================================================

    getbuttonpressed: {
        description: 'Returns the index of the button pressed in the last MessageBox, or -1 if no button was pressed yet.',
        tips: [
            'Buttons are 0-indexed. First button = 0, second = 1, etc.',
            'Returns -1 while waiting for user input — use in a state machine pattern.',
        ],
        example: [
            'MessageBox "Choose wisely" "Option A" "Option B" "Cancel"',
            'set button to GetButtonPressed',
            'if ( button == 0 )  ; Option A',
            'elseif ( button == 1 )  ; Option B',
            'endif',
        ].join('\n'),
        seeAlso: ['menumode'],
    },

    menumode: {
        description: 'Returns 1 if any game menu is currently open (inventory, dialogue, etc.).',
        tips: [
            'Commonly used at the top of scripts: if ( MenuMode == 1 ) → Return.',
            'Scripts CONTINUE to run during MenuMode, unlike most games.',
        ],
        seeAlso: ['getbuttonpressed'],
    },

    // =========================================================================
    //  Misc — Core
    // =========================================================================

    messagebox: {
        description: 'Displays a message to the player. Can include buttons for choices.',
        tips: [
            'Format: MessageBox "text" — simple message.',
            'Format: MessageBox "text" "Button1" "Button2" — message with choice buttons.',
            'Use %g for float, %d for integer in format strings.',
            'Use GetButtonPressed to check which button was clicked (0-indexed).',
        ],
        example: 'MessageBox "Health: %.0f" health',
        seeAlso: ['getbuttonpressed'],
    },

    getsecondspassed: {
        description: 'Returns the time in seconds since the last frame. Essential for frame-rate independent timing.',
        tips: [
            'Use for timers: set timer to ( timer + GetSecondsPassed )',
            'Value varies each frame — typically 0.01 to 0.1 depending on framerate.',
            'This is how you make scripts time-based instead of frame-based.',
        ],
        example: [
            'float timer',
            'set timer to ( timer + GetSecondsPassed )',
            'if ( timer > 3 )',
            '    ; 3 seconds have passed',
            '    set timer to 0',
            'endif',
        ].join('\n'),
    },

    random: {
        description: 'Returns a random integer between 0 and (max - 1).',
        tips: [
            'Random 100 returns values from 0 to 99.',
        ],
    },

    scriptrunning: {
        description: 'Returns 1 if the specified global script is currently running.',
        seeAlso: ['startscript', 'stopscript'],
    },

    startscript: {
        description: 'Starts the specified global script.',
        tips: [
            'Global scripts run every frame until stopped with StopScript.',
            'Variables in global scripts can be accessed with GlobalScriptName.variable syntax.',
        ],
        seeAlso: ['stopscript', 'scriptrunning'],
    },

    stopscript: {
        description: 'Stops the specified global script.',
        gotchas: [
            'Variables of stopped scripts are NOT reset — they retain their values if the script is restarted.',
        ],
        seeAlso: ['startscript', 'scriptrunning'],
    },

    onactivate: {
        description: 'Returns 1 when the player activates (clicks on) the object. Resets automatically.',
        tips: [
            'Only works on objects in the game world, not in inventory.',
        ],
        seeAlso: ['activate'],
    },

    activate: {
        description: 'Programmatically activates the calling object, as if the player clicked on it.',
        gotchas: [
            'Using Activate in a script on the same object that checks OnActivate can cause infinite loops.',
        ],
        seeAlso: ['onactivate'],
    },

    enable: {
        description: 'Makes a previously disabled object visible and interactable in the game world.',
        seeAlso: ['disable', 'getdisabled'],
    },

    disable: {
        description: 'Hides the object from the game world. The object still exists but is invisible and non-interactable.',
        tips: [
            'Use SetDelete after Disable to permanently remove the object.',
        ],
        seeAlso: ['enable', 'getdisabled', 'setdelete'],
    },

    setdelete: {
        description: 'Marks the object for permanent deletion. Object MUST be disabled first.',
        requires: 'Tribunal',
        gotchas: [
            'Object MUST be disabled before calling SetDelete, otherwise the game may crash.',
            'Deletion happens when the cell is unloaded.',
        ],
        seeAlso: ['disable', 'enable'],
    },

    dontsaveobject: {
        description: 'Prevents changes to this object from being saved. Use for temporary effects.',
        tips: [
            'Useful for disease scripts, temporary buffs, etc.',
            'Changes are reverted when the game is loaded.',
        ],
    },

    lock: {
        description: 'Locks a door or container with the specified lock level. Without argument, uses default lock level.',
        seeAlso: ['unlock', 'getlocked'],
    },

    unlock: {
        description: 'Unlocks a door or container.',
        seeAlso: ['lock', 'getlocked'],
    },

    cast: {
        description: 'Makes the actor cast the specified spell on the target.',
        example: '"NPC_ID"->Cast "fire_bite" "Player"',
        seeAlso: ['explodespell'],
    },

    explodespell: {
        description: 'Makes the object cast a touch spell on itself, creating an "explosion" with area-effect spells.',
        tips: [
            'Must use a touch-range spell. Area effect creates the explosion radius.',
            'Used extensively for trap scripts.',
        ],
        seeAlso: ['cast'],
    },

    fall: {
        description: 'Causes the actor to fall down (play the falling animation).',
    },

    // =========================================================================
    //  Misc — Collision / Standing
    // =========================================================================

    getstandingpc: {
        description: 'Returns 1 if the player is standing on the calling object.',
        seeAlso: ['getstandingactor', 'getcollidingpc', 'hurtstandingactor'],
    },

    getstandingactor: {
        description: 'Returns 1 if any actor is standing on the calling object.',
        seeAlso: ['getstandingpc', 'hurtstandingactor'],
    },

    getcollidingpc: {
        description: 'Returns 1 if the player is colliding with the calling object.',
        seeAlso: ['getcollidingactor', 'getstandingpc'],
    },

    hurtstandingactor: {
        description: 'Damages any actor standing on the calling object by the specified amount per second.',
        tips: [
            'Damage is per second, scaled by GetSecondsPassed internally.',
        ],
        seeAlso: ['hurtcollidingactor', 'getstandingactor'],
    },

    // =========================================================================
    //  Position & Movement
    // =========================================================================

    getdistance: {
        description: 'Returns the distance in game units between the calling object and the target.',
        tips: [
            '1 game unit = 1.42 cm. Touch range ≈ 128 units.',
            '8192 units = 1 exterior cell = 116 meters.',
        ],
        gotchas: [
            'Target must have "References Persist" checked.',
            'Returns a float — never test with exact equality.',
        ],
        example: 'if ( GetDistance "player" < 500 )',
        seeAlso: ['getpos', 'getangle'],
    },

    setpos: {
        description: 'Moves the object to the specified position on the given axis (x, y, or z).',
        gotchas: [
            'With Tribunal, accepts float variables but only within active cells.',
            'For actors, collision is checked — they may not move if blocked.',
        ],
        seeAlso: ['getpos', 'position', 'positioncell', 'move'],
    },

    getpos: {
        description: 'Returns the position of the object on the specified axis (x, y, or z).',
        tips: [
            'Always refers to the local coordinate system of the current cell.',
        ],
        seeAlso: ['setpos', 'getstartingpos'],
    },

    position: {
        description: 'Teleports the object to absolute world coordinates (x, y, z) with facing rotation.',
        gotchas: [
            'Original MW: only literal values. Tribunal: accepts float variables (must be LOCAL).',
            'Z-rotation: uses MINUTES for NPCs (1° = 60 min), but DEGREES for the Player!',
        ],
        tips: [
            'Classic use: teleport rings.',
        ],
        seeAlso: ['positioncell', 'setpos'],
    },

    positioncell: {
        description: 'Teleports the object to the specified cell at the given coordinates.',
        gotchas: [
            '⚠ DO NOT use in dialogue Result scripts — may crash for some users! Use StartScript to run a teleport script instead.',
            'Do NOT use on items in the player\'s inventory — causes crash.',
            'May need a 1-2 frame delay after CellChanged before teleporting back.',
        ],
        tips: [
            'Bethesda\'s method: use StartScript to run a separate teleport script.',
        ],
        seeAlso: ['position', 'setpos'],
    },

    placeitem: {
        description: 'Creates a new instance of the specified object at the given world coordinates.',
        tips: [
            'Unlike PlaceAtPC/PlaceAtMe, this uses absolute coordinates.',
        ],
        seeAlso: ['placeitemcell', 'placeatpc', 'placeatme'],
    },

    placeatpc: {
        description: 'Creates a new instance of the specified object near the player.',
        example: 'PlaceAtPC "crate_01" 1 128 1',
        seeAlso: ['placeatme', 'placeitem'],
    },

    placeatme: {
        description: 'Creates a new instance of the specified object near the calling object.',
        seeAlso: ['placeatpc', 'placeitem'],
    },

    move: {
        description: 'Moves the object along its local axis (x, y, z) at the specified speed per second.',
        tips: [
            'Speed is in units per second, automatically scaled by framerate.',
        ],
        seeAlso: ['moveworld', 'setpos'],
    },

    moveworld: {
        description: 'Moves the object along the world axis (x, y, z) at the specified speed per second.',
        seeAlso: ['move', 'setpos'],
    },

    setscale: {
        description: 'Sets the object\'s scale factor. 1.0 = normal size.',
        tips: [
            'For the player, affects movement speed, jump height, and reach.',
        ],
        seeAlso: ['getscale', 'modscale'],
    },

    setangle: {
        description: 'Sets the object\'s facing angle on the specified axis (x, y, z).',
        seeAlso: ['getangle', 'rotate'],
    },

    rotate: {
        description: 'Rotates the object around its local axis at the specified speed (degrees/sec).',
        tips: [
            'Use for spinning objects, windmills, etc.',
        ],
        seeAlso: ['rotateworld', 'setangle'],
    },

    setatstart: {
        description: 'Resets the object to its original position and orientation as placed in the CS.',
        seeAlso: ['getstartingpos', 'getstartingangle'],
    },

    resetactors: {
        description: 'Resets all actors in active cells to their starting positions.',
        tips: [
            'Also available as RA (alias). Useful for debugging.',
        ],
    },

    // =========================================================================
    //  Sound
    // =========================================================================

    say: {
        description: 'Makes the actor speak an audio file with subtitle text.',
        tips: [
            'Audio files are in Data Files/Sound/Vo/ folder.',
            'Only works on animating objects (actors).',
        ],
        example: 'Actor->Say "vo\\Misc\\CharGenBoat1.wav" "This is where they want you."',
        seeAlso: ['saydone'],
    },

    saydone: {
        description: 'Returns 1 if the calling actor has finished (or is not currently) saying any audio.',
        seeAlso: ['say'],
    },

    playsound: {
        description: 'Plays a sound effect globally (not 3D-positioned). Use a Sound ID from the CS.',
        seeAlso: ['playsound3d', 'playsoundvp', 'stopsound'],
    },

    playsound3d: {
        description: 'Plays a 3D-positioned sound at the calling object\'s location.',
        seeAlso: ['playsound', 'playsound3dvp', 'playloopsound3d'],
    },

    streammusic: {
        description: 'Streams a music file (MP3). Path is relative to Data Files/Music.',
        example: 'StreamMusic "Explore\\mx_explore_1.mp3"',
    },

    // =========================================================================
    //  Stats — Core
    // =========================================================================

    addspell: {
        description: 'Adds a spell or ability to the actor.',
        tips: [
            'Also used for abilities, diseases, curses — not just castable spells.',
        ],
        seeAlso: ['removespell', 'getspell', 'getspelleffects'],
    },

    removespell: {
        description: 'Removes a spell or ability from the actor.',
        seeAlso: ['addspell', 'getspell'],
    },

    getspell: {
        description: 'Returns 1 if the actor has the specified spell in their spell list.',
        tips: [
            'Checks the spell LIST, not active effects. Use GetSpellEffects for active effects.',
        ],
        seeAlso: ['addspell', 'getspelleffects'],
    },

    getspelleffects: {
        description: 'Returns 1 if the specified spell\'s effects are currently active on the actor.',
        tips: [
            'Unlike GetSpell, this checks active effects, not the spell list.',
        ],
        seeAlso: ['getspell', 'geteffect'],
    },

    geteffect: {
        description: 'Returns 1 if the specified magic effect is currently active on the actor.',
        tips: [
            'Uses the sEffect constants: e.g. GetEffect sEffectWaterBreathing',
        ],
        seeAlso: ['getspelleffects', 'removeeffects'],
    },

    removeeffects: {
        description: 'Removes all active instances of the specified magic effect from the actor.',
        tips: [
            'Uses the numeric effect ID, not the string constant.',
            'E.g. RemoveEffects 75 removes Restore Health effects.',
        ],
        seeAlso: ['geteffect'],
    },

    getlevel: {
        description: 'Returns the actor\'s level.',
        seeAlso: ['setlevel'],
    },

    getdeadcount: {
        description: 'Returns the number of actors of the specified type that have been killed.',
        tips: [
            'Works on any NPC/Creature ID, counts all instances.',
        ],
    },

    ondeath: {
        description: 'Returns 1 when the actor dies. Remains true afterward.',
        gotchas: [
            'Unlike most events, this does NOT reset — it stays 1 permanently after death.',
        ],
        seeAlso: ['onmurder', 'onknockout'],
    },

    onmurder: {
        description: 'Returns 1 if the actor was murdered by the player (crime).',
        seeAlso: ['ondeath'],
    },

    getrace: {
        description: 'Returns 1 if the actor is of the specified race.',
        example: 'if ( GetRace "Dark Elf" == 1 )',
    },

    pcraiserank: {
        description: 'Raises the player\'s rank in the specified faction.',
        seeAlso: ['pclowerrank', 'pcjoinfaction', 'getpcrank'],
    },

    pcjoinfaction: {
        description: 'Makes the player join the specified faction.',
        seeAlso: ['pcraiserank', 'getpcrank', 'pcexpelled'],
    },

    // =========================================================================
    //  Stats — Disease / Werewolf
    // =========================================================================

    getcommondisease: {
        description: 'Returns 1 if the actor has any common disease.',
        seeAlso: ['getblightdisease'],
    },

    getblightdisease: {
        description: 'Returns 1 if the actor has any blight disease.',
        gotchas: [
            'During blight weather, the player gets invisible blight diseases that cannot be cured with spells. Modify [Weather Blight] Disease Chance in the INI to fix.',
        ],
        seeAlso: ['getcommondisease'],
    },

    iswerewolf: {
        description: 'Returns 1 if the actor is currently in werewolf form.',
        seeAlso: ['becomewerewolf', 'undowerewolf'],
    },

    becomewerewolf: {
        description: 'Transforms the actor into a werewolf.',
        seeAlso: ['undowerewolf', 'iswerewolf'],
    },

    // =========================================================================
    //  Stats — Magic effect modifiers
    // =========================================================================

    setparalysis: {
        description: 'Sets the paralysis counter. When > 0, the actor is paralyzed.',
        tips: [
            'Each paralysis effect increments by 1, each removal decrements by 1.',
            'Set to 0 to unparalyze. Persists for 72 hours after leaving the cell.',
        ],
    },

    setinvisible: {
        description: 'Sets invisible state on the actor.',
        gotchas: [
            'Original spelling was "SetInvisibile" (typo). Later versions fixed to "SetInvisible".',
        ],
    },

    // =========================================================================
    //  Misc — Special variables (game variables)
    // =========================================================================

    onpcequip: {
        description: 'Game variable (must be declared as Short). Set to 1 when the player equips the object.',
        gotchas: [
            'Potions and Ingredients: only triggers with PCSkipEquip set. Without it, the item is "consumed" before detection.',
            'Books set PCSkipEquip to 1 instead of OnPCEquip!',
            'Must be manually reset to 0 after handling.',
        ],
        tips: [
            'Works with: Clothing, Armor, Weapons, Books, Misc, Lights, Probes.',
        ],
        seeAlso: ['pcskipequip'],
    },

    pcskipequip: {
        description: 'Game variable (must be declared as Short). Set to 1 to prevent the item from being equipped.',
        gotchas: [
            'Known bug: may cause item duplication. Fix by adding/removing a dummy item in inventory.',
            'Books set this to 1 instead of OnPCEquip.',
        ],
        seeAlso: ['onpcequip'],
    },

    // =========================================================================
    //  Broken functions
    // =========================================================================

    cellupdate: {
        description: 'Supposed to update an object\'s cell position after long-distance movement.',
        broken: true,
        gotchas: [
            '❌ BROKEN: Always produces runtime error "need to add function code for function CellUpdate".',
            'Workaround: Disable + SetDelete the object, then PlaceItem a new one at the same position using a global script.',
        ],
        seeAlso: ['setdelete', 'placeitem', 'disable'],
    },

    // =========================================================================
    //  Animation
    // =========================================================================

    playgroup: {
        description: 'Plays the specified animation group on the actor.',
        tips: [
            'Common groups: Idle, Idle2-9, Attack1-3, Hit1-5, Death1, etc.',
        ],
        seeAlso: ['loopgroup', 'skipanim'],
    },

    loopgroup: {
        description: 'Loops the specified animation group the given number of times.',
        seeAlso: ['playgroup', 'skipanim'],
    },

    // =========================================================================
    //  Sky / Weather
    // =========================================================================

    changeweather: {
        description: 'Changes the weather in the specified region.',
        enumValues: {
            '0': 'Clear',
            '1': 'Cloudy',
            '2': 'Foggy',
            '3': 'Overcast',
            '4': 'Rain',
            '5': 'Thunder',
            '6': 'Ash',
            '7': 'Blight',
            '8': 'Snow (BM)',
            '9': 'Blizzard (BM)',
        },
        example: 'ChangeWeather "Red Mountain Region" 7',
        seeAlso: ['getcurrentweather'],
    },

    getcurrentweather: {
        description: 'Returns the current weather type as an integer.',
        enumValues: {
            '0': 'Clear',
            '1': 'Cloudy',
            '2': 'Foggy',
            '3': 'Overcast',
            '4': 'Rain',
            '5': 'Thunder',
            '6': 'Ash',
            '7': 'Blight',
            '8': 'Snow (BM)',
            '9': 'Blizzard (BM)',
        },
        seeAlso: ['changeweather'],
    },

    // =========================================================================
    //  Misc — Game state
    // =========================================================================

    getpcsleep: {
        description: 'Returns 1 if the player is currently sleeping.',
        seeAlso: ['wakeuppc'],
    },

    wakeuppc: {
        description: 'Wakes the player up if they are sleeping.',
        seeAlso: ['getpcsleep'],
    },

    getpcinjail: {
        description: 'Returns 1 if the player is currently in jail.',
        requires: 'Tribunal',
        seeAlso: ['gotojail', 'payfine'],
    },

    gotojail: {
        description: 'Sends the player to jail.',
        seeAlso: ['payfine', 'payfinethief', 'getpcinjail'],
    },

    payfine: {
        description: 'Makes the player pay their bounty. Stolen items are confiscated.',
        seeAlso: ['payfinethief', 'gotojail'],
    },

    payfinethief: {
        description: 'Makes the player pay their bounty, but keeps stolen items.',
        seeAlso: ['payfine'],
    },

    getpctraveling: {
        description: 'Returns 1 if the player is currently using a travel service.',
        requires: 'Tribunal',
    },

    fadein: {
        description: 'Fades the screen in from black over the specified number of seconds.',
        seeAlso: ['fadeout', 'fadeto'],
    },

    fadeout: {
        description: 'Fades the screen to black over the specified number of seconds.',
        seeAlso: ['fadein', 'fadeto'],
    },

    playbink: {
        description: 'Plays a Bink video file. Loop flag: 0 = play once, 1 = loop.',
        seeAlso: ['fadein', 'fadeout'],
    },

    getsquareroot: {
        description: 'Returns the square root of the given float value.',
        requires: 'Tribunal',
    },

    // =========================================================================
    //  Misc — Leveled lists
    // =========================================================================

    addtolevcreature: {
        description: 'Adds a creature to a leveled creature list at runtime.',
        requires: 'Tribunal',
        example: 'AddToLevCreature "list_id" "creature_id" 5',
        seeAlso: ['removefromlevcreature', 'addtolevitem'],
    },

    removefromlevcreature: {
        description: 'Removes a creature from a leveled creature list at runtime.',
        requires: 'Tribunal',
        seeAlso: ['addtolevcreature'],
    },

    addtolevitem: {
        description: 'Adds an item to a leveled item list at runtime.',
        requires: 'Tribunal',
        seeAlso: ['removefromlevitem', 'addtolevcreature'],
    },

    removefromlevitem: {
        description: 'Removes an item from a leveled item list at runtime.',
        requires: 'Tribunal',
        seeAlso: ['addtolevitem'],
    },
};
