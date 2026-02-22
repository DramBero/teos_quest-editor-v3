/**
 * MWScript extension registry.
 *
 * Every game function / instruction that MWScript exposes is listed here.
 * Data is extracted from OpenMW `components/compiler/extensions0.cpp`.
 *
 * Argument type codes (same as OpenMW):
 *   f — float          l — integer (long)     s — short
 *   c — string (case-smashed)                 S — string (case-preserved)
 *   x — optional ignored string               X — optional ignored numeric
 *   z — optional ignored string/numeric        j — junk
 *   / — separator: required args before, optional after
 */

export interface ExtensionDef {
    /** 'function' returns a value, 'instruction' does not */
    kind: 'function' | 'instruction';
    /** Return type: 'l' (int), 'f' (float), 'S' (string), or null */
    returnType: string | null;
    /** Argument type string (see docs above) */
    args: string;
    /** Human-readable description (optional) */
    description?: string;
    /** Category for grouping in autocomplete */
    category: string;
}

/**
 * All MWScript extensions keyed by lowercase name.
 * Aliases (e.g. `tai` → `toggleai`) share the same definition.
 */
export const EXTENSIONS: Record<string, ExtensionDef> = {
    // =========================================================================
    //  AI
    // =========================================================================
    aiactivate: { kind: 'instruction', returnType: null, args: 'c/l', category: 'AI' },
    aitravel: { kind: 'instruction', returnType: null, args: 'fff/lx', category: 'AI' },
    aiescort: { kind: 'instruction', returnType: null, args: 'cffff/l', category: 'AI' },
    aiescortcell: { kind: 'instruction', returnType: null, args: 'ccffff/l', category: 'AI' },
    aiwander: { kind: 'instruction', returnType: null, args: 'fff/llllllllll', category: 'AI' },
    aifollow: { kind: 'instruction', returnType: null, args: 'cffff/llllllll', category: 'AI' },
    aifollowcell: { kind: 'instruction', returnType: null, args: 'ccffff/l', category: 'AI' },
    getaipackagedone: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getcurrentaipackage: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getdetected: { kind: 'function', returnType: 'l', args: 'c', category: 'AI' },
    sethello: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    setfight: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    setflee: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    setalarm: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    modhello: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    modfight: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    modflee: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    modalarm: { kind: 'instruction', returnType: null, args: 'l', category: 'AI' },
    toggleai: { kind: 'instruction', returnType: null, args: '', category: 'AI' },
    tai: { kind: 'instruction', returnType: null, args: '', category: 'AI' },
    startcombat: { kind: 'instruction', returnType: null, args: 'c', category: 'AI' },
    stopcombat: { kind: 'instruction', returnType: null, args: 'x', category: 'AI' },
    gethello: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getfight: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getflee: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getalarm: { kind: 'function', returnType: 'l', args: '', category: 'AI' },
    getlineofsight: { kind: 'function', returnType: 'l', args: 'c', category: 'AI' },
    getlos: { kind: 'function', returnType: 'l', args: 'c', category: 'AI' },
    gettarget: { kind: 'function', returnType: 'l', args: 'c', category: 'AI' },
    face: { kind: 'instruction', returnType: null, args: 'ffX', category: 'AI' },

    // =========================================================================
    //  Animation
    // =========================================================================
    skipanim: { kind: 'instruction', returnType: null, args: '', category: 'Animation' },
    playgroup: { kind: 'instruction', returnType: null, args: 'c/l', category: 'Animation' },
    loopgroup: { kind: 'instruction', returnType: null, args: 'cl/l', category: 'Animation' },

    // =========================================================================
    //  Cell
    // =========================================================================
    cellchanged: { kind: 'function', returnType: 'l', args: '', category: 'Cell' },
    testcells: { kind: 'instruction', returnType: null, args: '', category: 'Cell' },
    testinteriorcells: { kind: 'instruction', returnType: null, args: '', category: 'Cell' },
    coc: { kind: 'instruction', returnType: null, args: 'S', category: 'Cell' },
    centeroncell: { kind: 'instruction', returnType: null, args: 'S', category: 'Cell' },
    coe: { kind: 'instruction', returnType: null, args: 'll', category: 'Cell' },
    centeronexterior: { kind: 'instruction', returnType: null, args: 'll', category: 'Cell' },
    setwaterlevel: { kind: 'instruction', returnType: null, args: 'f', category: 'Cell' },
    modwaterlevel: { kind: 'instruction', returnType: null, args: 'f', category: 'Cell' },
    getinterior: { kind: 'function', returnType: 'l', args: '', category: 'Cell' },
    getpccell: { kind: 'function', returnType: 'l', args: 'c', category: 'Cell' },
    getwaterlevel: { kind: 'function', returnType: 'f', args: '', category: 'Cell' },

    // =========================================================================
    //  Container
    // =========================================================================
    additem: { kind: 'instruction', returnType: null, args: 'clX', category: 'Container' },
    getitemcount: { kind: 'function', returnType: 'l', args: 'cX', category: 'Container' },
    removeitem: { kind: 'instruction', returnType: null, args: 'clX', category: 'Container' },
    equip: { kind: 'instruction', returnType: null, args: 'cX', category: 'Container' },
    getarmortype: { kind: 'function', returnType: 'l', args: 'l', category: 'Container' },
    hasitemequipped: { kind: 'function', returnType: 'l', args: 'c', category: 'Container' },
    hassoulgem: { kind: 'function', returnType: 'l', args: 'c', category: 'Container' },
    getweapontype: { kind: 'function', returnType: 'l', args: '', category: 'Container' },

    // =========================================================================
    //  Control
    // =========================================================================
    togglecollision: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    tcl: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    clearforcerun: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    forcerun: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    clearforcejump: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    forcejump: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    clearforcemovejump: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    forcemovejump: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    clearforcesneak: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    forcesneak: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    getpcrunning: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    getpcsneaking: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    getforcerun: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    getforcejump: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    getforcemovejump: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    getforcesneak: { kind: 'function', returnType: 'l', args: '', category: 'Control' },
    // Dynamic enable/disable controls
    enablelevitation: { kind: 'instruction', returnType: null, args: '', category: 'Control' },
    disablelevitation: { kind: 'instruction', returnType: null, args: '', category: 'Control' },

    // =========================================================================
    //  Dialogue
    // =========================================================================
    journal: { kind: 'instruction', returnType: null, args: 'cl', category: 'Dialogue' },
    setjournalindex: { kind: 'instruction', returnType: null, args: 'cl', category: 'Dialogue' },
    getjournalindex: { kind: 'function', returnType: 'l', args: 'c', category: 'Dialogue' },
    filljournal: { kind: 'instruction', returnType: null, args: '', category: 'Dialogue' },
    addtopic: { kind: 'instruction', returnType: null, args: 'S', category: 'Dialogue' },
    choice: { kind: 'instruction', returnType: null, args: 'j/SlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSlSl', category: 'Dialogue' },
    forcegreeting: { kind: 'instruction', returnType: null, args: 'z', category: 'Dialogue' },
    goodbye: { kind: 'instruction', returnType: null, args: '', category: 'Dialogue' },
    setreputation: { kind: 'instruction', returnType: null, args: 'l', category: 'Dialogue' },
    modreputation: { kind: 'instruction', returnType: null, args: 'l', category: 'Dialogue' },
    getreputation: { kind: 'function', returnType: 'l', args: '', category: 'Dialogue' },
    samefaction: { kind: 'function', returnType: 'l', args: '', category: 'Dialogue' },
    modfactionreaction: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Dialogue' },
    setfactionreaction: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Dialogue' },
    getfactionreaction: { kind: 'function', returnType: 'l', args: 'ccX', category: 'Dialogue' },
    clearinfoactor: { kind: 'instruction', returnType: null, args: '', category: 'Dialogue' },

    // =========================================================================
    //  GUI
    // =========================================================================
    enablebirthmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enableclassmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablenamemenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enableracemenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablestatreviewmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enableinventorymenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablemagicmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablemapmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablestatsmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablerest: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    enablelevelupmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    showrestmenu: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    getbuttonpressed: { kind: 'function', returnType: 'l', args: '', category: 'GUI' },
    togglefogofwar: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    tfow: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    togglefullhelp: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    tfh: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    showmap: { kind: 'instruction', returnType: null, args: 'Sxxxx', category: 'GUI' },
    fillmap: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    menutest: { kind: 'instruction', returnType: null, args: '/l', category: 'GUI' },
    togglemenus: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },
    tm: { kind: 'instruction', returnType: null, args: '', category: 'GUI' },

    // =========================================================================
    //  Misc
    // =========================================================================
    menumode: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    random: { kind: 'function', returnType: 'f', args: 'l', category: 'Misc' },
    scriptrunning: { kind: 'function', returnType: 'l', args: 'c', category: 'Misc' },
    startscript: { kind: 'instruction', returnType: null, args: 'c', category: 'Misc' },
    stopscript: { kind: 'instruction', returnType: null, args: 'c', category: 'Misc' },
    getsecondspassed: { kind: 'function', returnType: 'f', args: '', category: 'Misc' },
    enable: { kind: 'instruction', returnType: null, args: 'x', category: 'Misc' },
    disable: { kind: 'instruction', returnType: null, args: 'x', category: 'Misc' },
    getdisabled: { kind: 'function', returnType: 'l', args: 'x', category: 'Misc' },
    xbox: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    onactivate: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    activate: { kind: 'instruction', returnType: null, args: 'x', category: 'Misc' },
    lock: { kind: 'instruction', returnType: null, args: '/l', category: 'Misc' },
    unlock: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    cast: { kind: 'instruction', returnType: null, args: 'SS', category: 'Misc' },
    explodespell: { kind: 'instruction', returnType: null, args: 'S', category: 'Misc' },
    togglecollisionboxes: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    togglecollisiongrid: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tcb: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tcg: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    twf: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    togglewireframe: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    fadein: { kind: 'instruction', returnType: null, args: 'f', category: 'Misc' },
    fadeout: { kind: 'instruction', returnType: null, args: 'f', category: 'Misc' },
    fadeto: { kind: 'instruction', returnType: null, args: 'ff', category: 'Misc' },
    togglewater: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    twa: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    toggleworld: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tw: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    togglepathgrid: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tpg: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    dontsaveobject: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    pcforce1stperson: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    pcforce3rdperson: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    pcget3rdperson: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    togglevanitymode: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tvm: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    getpcsleep: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getpcjumping: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    wakeuppc: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    playbink: { kind: 'instruction', returnType: null, args: 'Sl', category: 'Misc' },
    payfine: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    payfinethief: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    gotojail: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    getlocked: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    geteffect: { kind: 'function', returnType: 'l', args: 'S', category: 'Misc' },
    addsoulgem: { kind: 'instruction', returnType: null, args: 'ccX', category: 'Misc' },
    removesoulgem: { kind: 'instruction', returnType: null, args: 'c/l', category: 'Misc' },
    drop: { kind: 'instruction', returnType: null, args: 'cl', category: 'Misc' },
    dropsoulgem: { kind: 'instruction', returnType: null, args: 'c', category: 'Misc' },
    getattacked: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getweapondrawn: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getspellreadied: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getspelleffects: { kind: 'function', returnType: 'l', args: 'c', category: 'Misc' },
    getcurrenttime: { kind: 'function', returnType: 'f', args: '', category: 'Misc' },
    setdelete: { kind: 'instruction', returnType: null, args: 'l', category: 'Misc' },
    getsquareroot: { kind: 'function', returnType: 'f', args: 'f', category: 'Misc' },
    fall: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    getstandingpc: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getstandingactor: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getcollidingpc: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getcollidingactor: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    hurtstandingactor: { kind: 'instruction', returnType: null, args: 'f', category: 'Misc' },
    hurtcollidingactor: { kind: 'instruction', returnType: null, args: 'f', category: 'Misc' },
    getwindspeed: { kind: 'function', returnType: 'f', args: '', category: 'Misc' },
    hitonme: { kind: 'function', returnType: 'l', args: 'S', category: 'Misc' },
    hitattemptonme: { kind: 'function', returnType: 'l', args: 'S', category: 'Misc' },
    disableteleporting: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    enableteleporting: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    showvars: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    show: { kind: 'instruction', returnType: null, args: 'c', category: 'Misc' },
    sv: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    tgm: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    togglegodmode: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    togglescripts: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },
    getpcinjail: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    getpctraveling: { kind: 'function', returnType: 'l', args: '', category: 'Misc' },
    betacomment: { kind: 'instruction', returnType: null, args: '/S', category: 'Misc' },
    bc: { kind: 'instruction', returnType: null, args: '/S', category: 'Misc' },
    ori: { kind: 'instruction', returnType: null, args: '/S', category: 'Misc' },
    outputrefinfo: { kind: 'instruction', returnType: null, args: '/S', category: 'Misc' },
    showscenegraph: { kind: 'instruction', returnType: null, args: '/l', category: 'Misc' },
    ssg: { kind: 'instruction', returnType: null, args: '/l', category: 'Misc' },
    addtolevcreature: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Misc' },
    removefromlevcreature: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Misc' },
    addtolevitem: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Misc' },
    removefromlevitem: { kind: 'instruction', returnType: null, args: 'ccl', category: 'Misc' },
    repairedonme: { kind: 'function', returnType: 'l', args: 'S', category: 'Misc' },
    help: { kind: 'instruction', returnType: null, args: '', category: 'Misc' },

    // =========================================================================
    //  Sky
    // =========================================================================
    togglesky: { kind: 'instruction', returnType: null, args: '', category: 'Sky' },
    ts: { kind: 'instruction', returnType: null, args: '', category: 'Sky' },
    turnmoonwhite: { kind: 'instruction', returnType: null, args: '', category: 'Sky' },
    turnmoonred: { kind: 'instruction', returnType: null, args: '', category: 'Sky' },
    changeweather: { kind: 'instruction', returnType: null, args: 'Sl', category: 'Sky' },
    getmasserphase: { kind: 'function', returnType: 'l', args: '', category: 'Sky' },
    getsecundaphase: { kind: 'function', returnType: 'l', args: '', category: 'Sky' },
    getcurrentweather: { kind: 'function', returnType: 'l', args: '', category: 'Sky' },
    modregion: { kind: 'instruction', returnType: null, args: 'S/llllllllllX', category: 'Sky' },

    // =========================================================================
    //  Sound
    // =========================================================================
    say: { kind: 'instruction', returnType: null, args: 'SS', category: 'Sound' },
    saydone: { kind: 'function', returnType: 'l', args: '', category: 'Sound' },
    streammusic: { kind: 'instruction', returnType: null, args: 'S', category: 'Sound' },
    playsound: { kind: 'instruction', returnType: null, args: 'cXX', category: 'Sound' },
    playsoundvp: { kind: 'instruction', returnType: null, args: 'cff', category: 'Sound' },
    playsound3d: { kind: 'instruction', returnType: null, args: 'cXX', category: 'Sound' },
    playsound3dvp: { kind: 'instruction', returnType: null, args: 'cff', category: 'Sound' },
    playloopsound3d: { kind: 'instruction', returnType: null, args: 'cXX', category: 'Sound' },
    playloopsound3dvp: { kind: 'instruction', returnType: null, args: 'cff', category: 'Sound' },
    stopsound: { kind: 'instruction', returnType: null, args: 'cXX', category: 'Sound' },
    getsoundplaying: { kind: 'function', returnType: 'l', args: 'c', category: 'Sound' },

    // =========================================================================
    //  Stats  (attributes, dynamics, skills, magic effects generated below)
    // =========================================================================
    getpccrimelevel: { kind: 'function', returnType: 'f', args: '', category: 'Stats' },
    setpccrimelevel: { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' },
    modpccrimelevel: { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' },
    addspell: { kind: 'instruction', returnType: null, args: 'cz', category: 'Stats' },
    removespell: { kind: 'instruction', returnType: null, args: 'cz', category: 'Stats' },
    removespelleffects: { kind: 'instruction', returnType: null, args: 'c', category: 'Stats' },
    removeeffects: { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' },
    resurrect: { kind: 'instruction', returnType: null, args: '', category: 'Stats' },
    getspell: { kind: 'function', returnType: 'l', args: 'c', category: 'Stats' },
    pcraiserank: { kind: 'instruction', returnType: null, args: '/S', category: 'Stats' },
    pclowerrank: { kind: 'instruction', returnType: null, args: '/S', category: 'Stats' },
    pcjoinfaction: { kind: 'instruction', returnType: null, args: '/S', category: 'Stats' },
    moddisposition: { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' },
    setdisposition: { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' },
    getdisposition: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    getpcrank: { kind: 'function', returnType: 'l', args: '/S', category: 'Stats' },
    setlevel: { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' },
    getlevel: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    getstat: { kind: 'function', returnType: 'l', args: 'c', category: 'Stats' },
    getdeadcount: { kind: 'function', returnType: 'l', args: 'c', category: 'Stats' },
    getpcfacrep: { kind: 'function', returnType: 'l', args: '/c', category: 'Stats' },
    setpcfacrep: { kind: 'instruction', returnType: null, args: 'l/c', category: 'Stats' },
    modpcfacrep: { kind: 'instruction', returnType: null, args: 'l/c', category: 'Stats' },
    getcommondisease: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    getblightdisease: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    getrace: { kind: 'function', returnType: 'l', args: 'c', category: 'Stats' },
    getwerewolfkills: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    pcexpelled: { kind: 'function', returnType: 'l', args: '/S', category: 'Stats' },
    pcexpell: { kind: 'instruction', returnType: null, args: '/S', category: 'Stats' },
    pcclearexpelled: { kind: 'instruction', returnType: null, args: '/S', category: 'Stats' },
    raiserank: { kind: 'instruction', returnType: null, args: 'x', category: 'Stats' },
    lowerrank: { kind: 'instruction', returnType: null, args: 'x', category: 'Stats' },
    ondeath: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    onmurder: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    onknockout: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    iswerewolf: { kind: 'function', returnType: 'l', args: '', category: 'Stats' },
    becomewerewolf: { kind: 'instruction', returnType: null, args: '', category: 'Stats' },
    undowerewolf: { kind: 'instruction', returnType: null, args: '', category: 'Stats' },
    setwerewolfacrobatics: { kind: 'instruction', returnType: null, args: '', category: 'Stats' },
    getpcvisionbonus: { kind: 'function', returnType: 'f', args: '', category: 'Stats' },
    setpcvisionbonus: { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' },
    modpcvisionbonus: { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' },

    // =========================================================================
    //  Transformation
    // =========================================================================
    getdistance: { kind: 'function', returnType: 'f', args: 'c', category: 'Transformation' },
    setscale: { kind: 'instruction', returnType: null, args: 'f', category: 'Transformation' },
    getscale: { kind: 'function', returnType: 'f', args: '', category: 'Transformation' },
    setangle: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    getangle: { kind: 'function', returnType: 'f', args: 'c', category: 'Transformation' },
    setpos: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    getpos: { kind: 'function', returnType: 'f', args: 'c', category: 'Transformation' },
    getstartingpos: { kind: 'function', returnType: 'f', args: 'c', category: 'Transformation' },
    position: { kind: 'instruction', returnType: null, args: 'ffffz', category: 'Transformation' },
    positioncell: { kind: 'instruction', returnType: null, args: 'ffffczz', category: 'Transformation' },
    placeitemcell: { kind: 'instruction', returnType: null, args: 'ccffffX', category: 'Transformation' },
    placeitem: { kind: 'instruction', returnType: null, args: 'cffffX', category: 'Transformation' },
    placeatpc: { kind: 'instruction', returnType: null, args: 'clflX', category: 'Transformation' },
    placeatme: { kind: 'instruction', returnType: null, args: 'clflX', category: 'Transformation' },
    modscale: { kind: 'instruction', returnType: null, args: 'f', category: 'Transformation' },
    rotate: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    rotateworld: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    setatstart: { kind: 'instruction', returnType: null, args: '', category: 'Transformation' },
    move: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    moveworld: { kind: 'instruction', returnType: null, args: 'cf', category: 'Transformation' },
    getstartingangle: { kind: 'function', returnType: 'f', args: 'c', category: 'Transformation' },
    resetactors: { kind: 'instruction', returnType: null, args: '', category: 'Transformation' },
    fixme: { kind: 'instruction', returnType: null, args: '', category: 'Transformation' },
    ra: { kind: 'instruction', returnType: null, args: '', category: 'Transformation' },
};

// ---------------------------------------------------------------------------
//  Generate attribute / skill / dynamic / magic-effect commands
// ---------------------------------------------------------------------------

const ATTRIBUTES = [
    'strength', 'intelligence', 'willpower', 'agility',
    'speed', 'endurance', 'personality', 'luck',
] as const;

const DYNAMICS = ['health', 'magicka', 'fatigue'] as const;

const SKILLS = [
    'block', 'armorer', 'mediumarmor', 'heavyarmor',
    'bluntweapon', 'longblade', 'axe', 'spear', 'athletics',
    'enchant', 'destruction', 'alteration', 'illusion',
    'conjuration', 'mysticism', 'restoration', 'alchemy',
    'unarmored', 'security', 'sneak', 'acrobatics',
    'lightarmor', 'shortblade', 'marksman', 'mercantile',
    'speechcraft', 'handtohand',
] as const;

const MAGIC_EFFECTS = [
    'resistmagicka', 'resistfire', 'resistfrost', 'resistshock',
    'resistdisease', 'resistblight', 'resistcorprus', 'resistpoison',
    'resistparalysis', 'resistnormalweapons', 'waterbreathing',
    'chameleon', 'waterwalking', 'swimspeed', 'superjump', 'flying',
    'armorbonus', 'castpenalty', 'silence', 'blindness', 'paralysis',
    'invisible', 'attackbonus', 'defendbonus',
] as const;

// Attributes: get/set/mod
for (const attr of ATTRIBUTES) {
    EXTENSIONS[`get${attr}`] = { kind: 'function', returnType: 'f', args: '', category: 'Stats' };
    EXTENSIONS[`set${attr}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
    EXTENSIONS[`mod${attr}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
}

// Dynamics: get/set/mod/modcurrent/getratio
for (const dyn of DYNAMICS) {
    EXTENSIONS[`get${dyn}`] = { kind: 'function', returnType: 'f', args: 'x', category: 'Stats' };
    EXTENSIONS[`set${dyn}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
    EXTENSIONS[`mod${dyn}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
    EXTENSIONS[`modcurrent${dyn}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
    EXTENSIONS[`get${dyn}getratio`] = { kind: 'function', returnType: 'f', args: '', category: 'Stats' };
}

// Skills: get/set/mod
for (const skill of SKILLS) {
    EXTENSIONS[`get${skill}`] = { kind: 'function', returnType: 'f', args: '', category: 'Stats' };
    EXTENSIONS[`set${skill}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
    EXTENSIONS[`mod${skill}`] = { kind: 'instruction', returnType: null, args: 'f', category: 'Stats' };
}

// Magic effects: get/set/mod
for (const eff of MAGIC_EFFECTS) {
    EXTENSIONS[`get${eff}`] = { kind: 'function', returnType: 'l', args: '', category: 'Stats' };
    EXTENSIONS[`set${eff}`] = { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' };
    EXTENSIONS[`mod${eff}`] = { kind: 'instruction', returnType: null, args: 'l', category: 'Stats' };
}

/** Set of all extension names for fast lookup */
export const EXTENSION_NAMES: ReadonlySet<string> = new Set(Object.keys(EXTENSIONS));

// ---------------------------------------------------------------------------
//  PascalCase display names for autocomplete / tooltips
// ---------------------------------------------------------------------------

/** Known word segments for splitting lowercase MWScript names into PascalCase.
 *  Order matters: longer words must come before shorter prefixes. */
const WORD_SEGMENTS = [
    // common prefixes
    'get', 'set', 'mod', 'add', 'remove', 'has', 'is', 'on', 'toggle', 'clear', 'start', 'stop',
    'place', 'show', 'hide', 'fill', 'play', 'force', 'dont', 'test', 'output',
    'enable', 'disable', 'change', 'turn', 'wake', 'pay', 'goto', 'become', 'undo',
    'hurt', 'raise', 'lower', 'stream', 'reset', 'loop',
    // compound words
    'current', 'square', 'root', 'standing', 'colliding', 'weapon', 'spell', 'armor',
    'button', 'pressed', 'journal', 'index', 'topic', 'greeting', 'reputation',
    'faction', 'reaction', 'info', 'actor', 'creature', 'item', 'cell',
    'levitation', 'collision', 'boxes', 'grid', 'pathgrid', 'wireframe',
    'vanity', 'mode', 'scene', 'graph', 'scripts',
    'interior', 'exterior', 'weather', 'water', 'level', 'region',
    'music', 'sound', 'bink', 'fine', 'thief', 'jail', 'delete',
    'soul', 'gem', 'soulgem', 'effect', 'effects', 'disease', 'blight', 'corprus', 'poison',
    'magicka', 'fatigue', 'health', 'ratio',
    'pc', 'ai', 'npc', 'los',
    'distance', 'scale', 'angle', 'pos', 'position',
    'acrobatics', 'athletics', 'alchemy', 'alteration', 'conjuration',
    'destruction', 'enchant', 'illusion', 'mysticism', 'restoration',
    'security', 'sneak', 'unarmored', 'marksman', 'mercantile',
    'speechcraft', 'handtohand',
    'block', 'armorer', 'medium', 'heavy', 'light', 'blunt', 'long', 'short', 'blade',
    'axe', 'spear', 'combat', 'hello', 'fight', 'flee', 'alarm',
    'strength', 'intelligence', 'willpower', 'agility', 'speed', 'endurance', 'personality', 'luck',
    'resist', 'fire', 'frost', 'shock', 'normal', 'weapons',
    'breathing', 'chameleon', 'walking', 'swim', 'super', 'jump', 'flying',
    'bonus', 'penalty', 'silence', 'blindness', 'paralysis', 'invisible',
    'attack', 'defend', 'cast',
    'moon', 'white', 'red', 'sky', 'masser', 'phase', 'secunda',
    'fog', 'war', 'full', 'help', 'menus', 'map', 'menu',
    'rest', 'birth', 'class', 'name', 'race', 'stat', 'review', 'inventory',
    'magic', 'stats', 'levelup',
    'run', 'running', 'sneaking', 'jumping', 'sleeping', 'sleep', 'traveling', 'travel',
    'move', 'rotate', 'world', 'at', 'me',
    'anim', 'group', 'skip',
    'escort', 'follow', 'wander', 'activate',
    'package', 'done', 'detected', 'target', 'line', 'of', 'sight',
    'face', 'say', 'dead', 'count', 'knocked', 'out', 'knockout', 'murder', 'death',
    'werewolf', 'kills', 'vision',
    'expelled', 'expell', 'joined', 'join',
    'crime', 'disposition',
    'drawn', 'readied', 'attacked',
    'locked', 'lock', 'unlock',
    'rank', 'same',
    'ref', 'beta', 'comment',
    'svars', 'vars',
    'god',
    'in', 'out', 'to', 'from', 'the',
    'random', 'xbox', 'fall', 'wind',
    'lev', 'repaired',
    'hit', 'attempt',
    'fix', 'actors', 'object', 'save',
    'center', 'coc', 'coe',
    'place',
    'teleporting', 'person', '1st', '3rd',
    'drop', 'equip',
    'type', 'equipped', 'playing',
    'time', 'passed', 'seconds',
    'disabled', 'enabled',
];
// Sort by length descending so longer words match before their prefixes
// (e.g. 'disabled' before 'disable', 'soulgem' before 'soul')
const SORTED_SEGMENTS = [...WORD_SEGMENTS].sort((a, b) => b.length - a.length);

/** Convert a lowercase MWScript name to PascalCase display name. */
export function toDisplayName(lower: string): string {
    // Short aliases — keep as uppercase
    if (lower.length <= 4 && /^[a-z]+$/.test(lower)) {
        const allUpper = ['ai', 'pc', 'npc', 'los'];
        if (allUpper.includes(lower)) return lower.toUpperCase();
        // Short names like 'coc', 'coe', 'tai', 'tcl', etc.
        if (lower.length <= 3) return lower.toUpperCase();
    }

    let result = '';
    let remaining = lower;

    while (remaining.length > 0) {
        let matched = false;
        for (const word of SORTED_SEGMENTS) {
            if (remaining.startsWith(word)) {
                // Capitalize the segment
                if (word === 'ai' || word === 'pc' || word === 'npc' || word === 'los') {
                    result += word.toUpperCase();
                } else if (word === '1st' || word === '3rd') {
                    result += word;
                } else {
                    result += word[0].toUpperCase() + word.slice(1);
                }
                remaining = remaining.slice(word.length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Consume one character (capitalize it if at start of a word)
            result += remaining[0].toUpperCase();
            remaining = remaining.slice(1);
        }
    }

    return result;
}

/** Map of lowercase name → PascalCase display name for all extensions. */
export const DISPLAY_NAMES: Record<string, string> = {};
for (const name of Object.keys(EXTENSIONS)) {
    DISPLAY_NAMES[name] = toDisplayName(name);
}
