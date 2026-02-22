/**
 * MWScript opcodes — maps extension names to their bytecode opcode numbers.
 *
 * Ported from OpenMW's components/compiler/opcodes.hpp.
 * Each entry has a base opcode and optionally an "explicit" variant
 * (used when the instruction targets a specific object via ->).
 */

export interface OpcodeEntry {
    op: number;
    opExplicit?: number;
}

export const OPCODES: Record<string, OpcodeEntry> = {
    // --- AI ---
    aiactivate: { op: 0x2000e, opExplicit: 0x2000f },
    aiescort: { op: 0x20010, opExplicit: 0x20011 },
    aiescortcell: { op: 0x20012, opExplicit: 0x20013 },
    aifollow: { op: 0x20014, opExplicit: 0x20015 },
    aifollowcell: { op: 0x20016, opExplicit: 0x20017 },
    aitravel: { op: 0x20000, opExplicit: 0x20001 },
    aiwander: { op: 0x20002, opExplicit: 0x20003 },
    getaipackagedone: { op: 0x200007c, opExplicit: 0x200007d },
    getcurrentaipackage: { op: 0x200009e, opExplicit: 0x200009f },
    getdetected: { op: 0x20000b0, opExplicit: 0x20000b1 },
    sethelp: { op: 0x200015e },
    face: { op: 0x200015a, opExplicit: 0x200015b },

    // --- Animation ---
    skipanim: { op: 0x2000138, opExplicit: 0x2000139 },
    playgroup: { op: 0x200013a, opExplicit: 0x200013b },
    loopgroup: { op: 0x200013c, opExplicit: 0x200013d },

    // --- Cell ---
    centeroncell: { op: 0x2000026 },
    centeronexterior: { op: 0x2000027 },
    getinterior: { op: 0x200012e },
    getpccell: { op: 0x200012f },
    getpcfaction: { op: 0x2000133 },

    // --- Console ---
    fillmap: { op: 0x200024a },
    toggleai: { op: 0x200024c },
    togglecollision: { op: 0x200024e },
    togglefogofwar: { op: 0x2000250 },
    togglegodmode: { op: 0x2000252 },
    togglescripts: { op: 0x2000258 },
    togglevanitymode: { op: 0x200025a },
    togglewireframe: { op: 0x200025c },
    togglesky: { op: 0x200025e },
    toggleworld: { op: 0x2000260 },
    togglemenus: { op: 0x2000270 },

    // --- Container ---
    additem: { op: 0x2000076, opExplicit: 0x2000077 },
    getitemcount: { op: 0x2000078, opExplicit: 0x2000079 },
    removeitem: { op: 0x200007a, opExplicit: 0x200007b },
    equip: { op: 0x20001b2, opExplicit: 0x20001b3 },
    getarmortype: { op: 0x20001d0, opExplicit: 0x20001d1 },
    hasitemequipped: { op: 0x20001d2, opExplicit: 0x20001d3 },
    hassoulgem: { op: 0x20001de, opExplicit: 0x20001df },
    getweapontype: { op: 0x20001e0, opExplicit: 0x20001e1 },

    // --- Control ---
    clearforcerun: { op: 0x2000155, opExplicit: 0x2000156 },
    clearforcejump: { op: 0x2000259 },
    clearmoveflag: { op: 0x200026a },
    clearforcemovejump: { op: 0x200026e },
    clearforcesneak: { op: 0x200015d },
    forcerun: { op: 0x2000153, opExplicit: 0x2000154 },
    forcesneak: { op: 0x200015c },
    getforcerun: { op: 0x2000157, opExplicit: 0x2000158 },
    getforcesneak: { op: 0x200015f, opExplicit: 0x2000160 },
    getpcrunning: { op: 0x2000161 },
    getpcsneaking: { op: 0x2000162 },

    // --- Dialogue ---
    journal: { op: 0x2000133 },
    setjournalindex: { op: 0x2000134 },
    getjournalindex: { op: 0x2000135 },
    addtopic: { op: 0x200013e },
    choice: { op: 0x2000042, opExplicit: 0x2000043 },
    goodbye: { op: 0x200008c },
    setreputation: { op: 0x200008d, opExplicit: 0x200008e },
    getreputation: { op: 0x200008f, opExplicit: 0x2000090 },
    moddisposition: { op: 0x200014d, opExplicit: 0x200014e },
    getdisposition: { op: 0x200014f, opExplicit: 0x2000150 },
    setdisposition: { op: 0x2000151, opExplicit: 0x2000152 },
    modreputation: { op: 0x20001ae, opExplicit: 0x20001af },
    forcegreeting: { op: 0x200009c, opExplicit: 0x200009d },

    // --- GUI ---
    enablebirthmenu: { op: 0x200006e },
    enableclassmenu: { op: 0x200006f },
    enablenamemenu: { op: 0x2000070 },
    enableracemenu: { op: 0x2000071 },
    enablestatreviewmenu: { op: 0x2000073 },
    enableinventorymenu: { op: 0x2000074 },
    enablemagicmenu: { op: 0x2000075 },
    showmap: { op: 0x20001a0 },

    // --- Misc ---
    activate: { op: 0x200018e, opExplicit: 0x200018f },
    drop: { op: 0x2000134, opExplicit: 0x2000135 },
    explodespell: { op: 0x2000181, opExplicit: 0x2000182 },
    getdistance: { op: 0x20001a2, opExplicit: 0x20001a3 },
    geteffect: { op: 0x20001a4, opExplicit: 0x20001a5 },
    getlocked: { op: 0x200018a, opExplicit: 0x200018b },
    getlos: { op: 0x2000190, opExplicit: 0x2000191 },
    getpos: { op: 0x2000192, opExplicit: 0x2000193 },
    getangle: { op: 0x2000194, opExplicit: 0x2000195 },
    getstartingpos: { op: 0x2000196, opExplicit: 0x2000197 },
    getstartingangle: { op: 0x2000198, opExplicit: 0x2000199 },
    getscale: { op: 0x200019a, opExplicit: 0x200019b },
    getsecondspassed: { op: 0x200019c },
    disable: { op: 0x2000003, opExplicit: 0x2000004 },
    enable: { op: 0x2000005, opExplicit: 0x2000006 },
    getdisabled: { op: 0x200019e, opExplicit: 0x200019f },
    lock: { op: 0x200018c, opExplicit: 0x200018d },
    unlock: { op: 0x200018e, opExplicit: 0x200018f },
    modscale: { op: 0x20001a6, opExplicit: 0x20001a7 },
    setscale: { op: 0x20001a8, opExplicit: 0x20001a9 },
    placeatpc: { op: 0x20001aa },
    placeatme: { op: 0x20001ab, opExplicit: 0x20001ac },
    placeitem: { op: 0x20001ad },
    placeitemcell: { op: 0x20001ae },
    position: { op: 0x20001b0, opExplicit: 0x20001b1 },
    positioncell: { op: 0x20001b2, opExplicit: 0x20001b3 },
    rotate: { op: 0x20001b4, opExplicit: 0x20001b5 },
    rotateworld: { op: 0x20001b6, opExplicit: 0x20001b7 },
    move: { op: 0x20001b8, opExplicit: 0x20001b9 },
    moveworld: { op: 0x20001ba, opExplicit: 0x20001bb },
    setpos: { op: 0x20001bc, opExplicit: 0x20001bd },
    setangle: { op: 0x20001be, opExplicit: 0x20001bf },
    setdelete: { op: 0x20001c0, opExplicit: 0x20001c1 },

    // --- Sky ---
    changeweather: { op: 0x200013e },
    getwindspeed: { op: 0x2000212 },
    getcurrentweather: { op: 0x2000213 },
    modregion: { op: 0x2000214 },
    // togglesky already in Console section

    // --- Sound ---
    playsound: { op: 0x200008, opExplicit: 0x200009 },
    playsound3d: { op: 0x200008, opExplicit: 0x200009 },
    playsound3dvp: { op: 0x200008, opExplicit: 0x200009 },
    playsoundvp: { op: 0x200008, opExplicit: 0x200009 },
    say: { op: 0x200000a, opExplicit: 0x200000b },
    stopsound: { op: 0x200000c, opExplicit: 0x200000d },
    getsoundplaying: { op: 0x200000e, opExplicit: 0x200000f },
    streammusic: { op: 0x2000083 },

    // --- Stats ---
    // Dynamic stat getters/setters are generated in extensions.ts
    // These are a sample of the hand-coded ones
    getlevel: { op: 0x200005c, opExplicit: 0x200005d },
    setlevel: { op: 0x200005e, opExplicit: 0x200005f },
    gethealth: { op: 0x2000050, opExplicit: 0x2000051 },
    sethealth: { op: 0x2000058, opExplicit: 0x2000059 },
    getmagicka: { op: 0x2000052, opExplicit: 0x2000053 },
    setmagicka: { op: 0x200005a, opExplicit: 0x200005b },
    getfatigue: { op: 0x2000054, opExplicit: 0x2000055 },
    setfatigue: { op: 0x200005c, opExplicit: 0x200005d },
    modhealth: { op: 0x2000046, opExplicit: 0x2000047 },
    modmagicka: { op: 0x2000048, opExplicit: 0x2000049 },
    modfatigue: { op: 0x200004a, opExplicit: 0x200004b },
    getcurrenthealth: { op: 0x200004c, opExplicit: 0x200004d },
    getcurrentmagicka: { op: 0x200004e, opExplicit: 0x200004f },
    getcurrentfatigue: { op: 0x2000050, opExplicit: 0x2000051 },

    // --- Transformation ---
    getpcsleep: { op: 0x200019d },
    // placeatme already in Misc section

    // --- Spells ---
    addspell: { op: 0x2000147, opExplicit: 0x2000148 },
    removespell: { op: 0x2000149, opExplicit: 0x200014a },
    removespelleffects: { op: 0x200014b, opExplicit: 0x200014c },
    getspell: { op: 0x2000078, opExplicit: 0x2000079 },
    getspelleffects: { op: 0x200014d, opExplicit: 0x200014e },
    cast: { op: 0x2000227, opExplicit: 0x2000228 },

    // --- Misc common ---
    startscript: { op: 0x2000085 },
    stopscript: { op: 0x2000086 },
    scriptrunning: { op: 0x2000087 },
    dontsaveobject: { op: 0x2000153 },
    getbuttonpressed: { op: 0x2000137 },
    fadein: { op: 0x200013f },
    fadeout: { op: 0x2000140 },
    fadetoblack: { op: 0x2000141 },
    fadetowhite: { op: 0x2000142 },
    playbink: { op: 0x2000288 },
    paycrime: { op: 0x200028c, opExplicit: 0x200028d },
    payfinethief: { op: 0x2000236 },
    pcraiserank: { op: 0x2000091, opExplicit: 0x2000092 },
    pclowerrank: { op: 0x2000093, opExplicit: 0x2000094 },
    pcjoinfaction: { op: 0x2000095, opExplicit: 0x2000096 },
    pcexpelled: { op: 0x20000a2, opExplicit: 0x20000a3 },
    pcclearexpelled: { op: 0x20000a4, opExplicit: 0x20000a5 },
    raiserank: { op: 0x20000a6, opExplicit: 0x20000a7 },
    lowerrank: { op: 0x20000a8, opExplicit: 0x20000a9 },
    getpccrimelevel: { op: 0x20000ee },
    setpccrimelevel: { op: 0x20000ef },
    modpccrimelevel: { op: 0x20000f0 },
    pcgetrace: { op: 0x20000f1 },
    getrace: { op: 0x20000f2, opExplicit: 0x20000f3 },
    getpcrank: { op: 0x20000f4, opExplicit: 0x20000f5 },
    modpcfacrep: { op: 0x20000f6, opExplicit: 0x20000f7 },
    setpcfacrep: { op: 0x20000f8, opExplicit: 0x20000f9 },
    getpcfacrep: { op: 0x20000fa, opExplicit: 0x20000fb },

    // --- AI Behavior (set/get/mod fight/flee/alarm/hello) ---
    sethello: { op: 0x200015c, opExplicit: 0x200015d },
    setfight: { op: 0x200015e, opExplicit: 0x200015f },
    setflee: { op: 0x2000160, opExplicit: 0x2000161 },
    setalarm: { op: 0x2000162, opExplicit: 0x2000163 },
    modhello: { op: 0x20001b7, opExplicit: 0x20001b8 },
    modfight: { op: 0x20001b9, opExplicit: 0x20001ba },
    modflee: { op: 0x20001bb, opExplicit: 0x20001bc },
    modalarm: { op: 0x20001bd, opExplicit: 0x20001be },
    gethello: { op: 0x20001bf, opExplicit: 0x20001c0 },
    getfight: { op: 0x20001c1, opExplicit: 0x20001c2 },
    getflee: { op: 0x20001c3, opExplicit: 0x20001c4 },
    getalarm: { op: 0x20001c5, opExplicit: 0x20001c6 },
    startcombat: { op: 0x200023a, opExplicit: 0x200023b },
    stopcombat: { op: 0x200023c, opExplicit: 0x200023d },
    gettarget: { op: 0x2000238, opExplicit: 0x2000239 },
    getlineofsight: { op: 0x2000222, opExplicit: 0x2000223 },

    // --- Events ---
    onactivate: { op: 0x200000d, opExplicit: 0x2000306 },
    ondeath: { op: 0x20001fc, opExplicit: 0x2000205 },
    onmurder: { op: 0x2000249, opExplicit: 0x200024a },
    onknockout: { op: 0x2000240, opExplicit: 0x2000241 },
    cellchanged: { op: 0x2000000 },
    menumode: { op: 0x2000311 },
    random: { op: 0x2000312 },

    // --- Combat Queries ---
    getattacked: { op: 0x20001d3, opExplicit: 0x20001d4 },
    hitonme: { op: 0x2000213, opExplicit: 0x2000214 },
    hitattemptonme: { op: 0x20002f9, opExplicit: 0x20002fa },
    getweapondrawn: { op: 0x20001d7, opExplicit: 0x20001d8 },
    getspellreadied: { op: 0x2000231, opExplicit: 0x2000232 },

    // --- Soul Gems ---
    addsoulgem: { op: 0x20001f3, opExplicit: 0x20001f4 },
    removesoulgem: { op: 0x20027, opExplicit: 0x20028 },
    dropsoulgem: { op: 0x20001fa, opExplicit: 0x20001fb },

    // --- Sound (additional) ---
    saydone: { op: 0x2000002, opExplicit: 0x200001a },
    playloopsound3d: { op: 0x2000008, opExplicit: 0x200001d },
    playloopsound3dvp: { op: 0x2000009, opExplicit: 0x200001e },

    // --- Disease ---
    getcommondisease: { op: 0x20001a8, opExplicit: 0x20001a9 },
    getblightdisease: { op: 0x20001aa, opExplicit: 0x20001ab },

    // --- Collision / Standing ---
    getstandingpc: { op: 0x200020c, opExplicit: 0x200020d },
    getstandingactor: { op: 0x200020e, opExplicit: 0x200020f },
    getcollidingpc: { op: 0x2000250, opExplicit: 0x2000251 },
    getcollidingactor: { op: 0x2000252, opExplicit: 0x2000253 },
    hurtstandingactor: { op: 0x2000254, opExplicit: 0x2000255 },
    hurtcollidingactor: { op: 0x2000256, opExplicit: 0x2000257 },

    // --- Water ---
    getwaterlevel: { op: 0x2000141 },
    setwaterlevel: { op: 0x2000142 },
    modwaterlevel: { op: 0x2000143 },

    // --- Faction Reaction ---
    getfactionreaction: { op: 0x2000243 },
    setfactionreaction: { op: 0x20002ff },
    modfactionreaction: { op: 0x2000242 },

    // --- Teleporting / Levitation ---
    disableteleporting: { op: 0x2000215 },
    enableteleporting: { op: 0x2000216 },
    disablelevitation: { op: 0x2000220 },
    enablelevitation: { op: 0x2000221 },

    // --- GUI (additional) ---
    enablerest: { op: 0x2000017 },
    enablestatsmenu: { op: 0x2000016 },
    enablemapmenu: { op: 0x2000015 },
    enablelevelupmenu: { op: 0x2000300 },
    showrestmenu: { op: 0x2000018, opExplicit: 0x2000234 },

    // --- Misc (additional) ---
    fadeto: { op: 0x200013e },
    getcurrenttime: { op: 0x20001dd },
    getsquareroot: { op: 0x20001e7 },
    getdeadcount: { op: 0x20001a3 },
    setatstart: { op: 0x2000203, opExplicit: 0x2000204 },
    gotojail: { op: 0x2000235 },
    getpcinjail: { op: 0x200023e },
    getpctraveling: { op: 0x200023f },
    getpcjumping: { op: 0x2000233 },
    wakeuppc: { op: 0x20001a2 },
    resetactors: { op: 0x20002f4 },
    resurrect: { op: 0x200022f, opExplicit: 0x2000230 },
    removeeffects: { op: 0x200022d, opExplicit: 0x200022e },
    clearinfoactor: { op: 0x2000245, opExplicit: 0x2000246 },
    filljournal: { op: 0x2000326 },
    payfine: { op: 0x2000236 },
    pcexpell: { op: 0x2001a, opExplicit: 0x2001b },
    repairedonme: { op: 0x200030c, opExplicit: 0x200030d },

    // --- PC Camera ---
    pcforce1stperson: { op: 0x20002f6 },
    pcforce3rdperson: { op: 0x20002f7 },
    pcget3rdperson: { op: 0x20002f8 },

    // --- Vision ---
    getpcvisionbonus: { op: 0x2000322 },
    setpcvisionbonus: { op: 0x2000323 },
    modpcvisionbonus: { op: 0x2000324 },

    // --- Moon ---
    turnmoonwhite: { op: 0x2000022 },
    turnmoonred: { op: 0x2000023 },
    getmasserphase: { op: 0x2000024 },
    getsecundaphase: { op: 0x2000025 },

    // --- Werewolf ---
    becomewerewolf: { op: 0x2000217, opExplicit: 0x2000218 },
    undowerewolf: { op: 0x2000219, opExplicit: 0x200021a },
    setwerewolfacrobatics: { op: 0x200021b, opExplicit: 0x200021c },
    iswerewolf: { op: 0x20001fd, opExplicit: 0x20001fe },
    getwerewolfkills: { op: 0x20001e2 },

    // --- Leveled Lists ---
    addtolevcreature: { op: 0x20002fb },
    removefromlevcreature: { op: 0x20002fc },
    addtolevitem: { op: 0x20002fd },
    removefromlevitem: { op: 0x20002fe },

    // --- Debug / Console (additional) ---
    show: { op: 0x2000304, opExplicit: 0x2000305 },
    showvars: { op: 0x200021d, opExplicit: 0x200021e },
    sv: { op: 0x200021d, opExplicit: 0x200021e },         // alias for showvars
    showscenegraph: { op: 0x2002f, opExplicit: 0x20030 },
    ssg: { op: 0x2002f, opExplicit: 0x20030 },             // alias for showscenegraph
    togglecollisionboxes: { op: 0x20001ac },
    tcb: { op: 0x20001ac },                                 // alias
    togglewater: { op: 0x2000144 },
    tw: { op: 0x2000144 },                                  // alias
    togglepathgrid: { op: 0x2000146 },
    tpg: { op: 0x2000146 },                                 // alias
    togglefullhelp: { op: 0x2000151 },
    tfh: { op: 0x2000151 },                                 // alias
    testcells: { op: 0x200030e },
    testinteriorcells: { op: 0x200030f },
};

/**
 * Look up the opcode for an extension call.
 * Returns undefined if the extension has no mapped opcode.
 */
export function lookupOpcode(name: string, isExplicit: boolean): number | undefined {
    const entry = OPCODES[name.toLowerCase()];
    if (!entry) return undefined;
    if (isExplicit && entry.opExplicit !== undefined) return entry.opExplicit;
    return entry.op;
}
