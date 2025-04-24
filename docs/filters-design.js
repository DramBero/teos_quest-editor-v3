
- Choice (opens current choice select, or lets write a custom number)
+ Speakers
    - ID (opens speaker search, or lets write custom string) (has a button to set to exclusion mode for NOT filters)
    - Cell (same but with cells)
    - Class ---
    - Faction ---
    - Race ---
    - Rank --- (doesnt have NOT)

+ Current Actor
    - Is werewolf (only 1 as true)

- Journal (opens search for quest names, and shows quest names and id)
+ Faction 
    - Player faction/rank
    - 
- Items (opens item search or input id)
- Dead (opens NPC or creature search or input id)

+ Player (boa tarde nerevarine)
    healthbar with percent near (red heart or red heart with percent)
    magickabar (blue potion)
    staminabar (green legs)

    - Level (int) 
    - Reputation (int) [boa tarde statue or with crown]
    - Bounty (int) [boa tarde wanted poster]
    - Sex (1/0, 1 - female) [boa tarde with mars or venus symbol]
    + Skills (int) 
    + Attributes (int)
    + Disease
        - Common (1/0) [boa tarde sick] (no - is crossed)
        - Blight (1/0) [sick gray boa tarde]
        - Corprus (1/0) [corprus walker with boa tarde hat]
    - Vampire (1/0) [boa tarde as vampire]
    - Clothes on (int) [boa tarde and crassius]
    - Werewolf Kills (int) [??]
    - Gold (int) [??]
    - Other item (item search or input and enter int) [??]
    
+ Scripting 
    + Global var 
    + Local var 
    + No local var 

+ Weather
    - Clear (0)
    - Cloudy (1)
    - Foggy (2)
    - Overcast (3)
    - Rain (4)
    - Thunder (5)
    - Ash (6)
    - Blight (7)
    - Snow (8)
    - Blizzrd (9)
    - Other (int)







Faction:
    In faction
    Not in Faction
    Same faction
    Rank difference
    Rank requirement
        -0 not enought rep and Skills
        -1 not enought rep
        -2 not enough Skills
        -3 ok
    Expelled
    Reaction High
    Reaction Low

NPC characteristics:
    Level
    Health
    Health Percent
    Reputation
    Werewolf
    Same faction
    Same race
    Same sex

NPC interaction:
    Disposition
    Alarm Level (Alarm)
    Is Alarmed 1/0 (Alarmed)
    Attacked 1/0 (Attacked)
    Should Attack 1/0
    Detected 1 (Detected)
    Hello , hello value
    Fight , fight Value
    Flee, flee Value
    Talked to PC
    Friend Hit
        -0 - never Hit
        -1 - 1 time
        -2 - 2 times
        -3 - 3 times
        -4 - 4+ times
    

Choice

Weather
    0 = Clear
    1 = Cloudy
    2 = Foggy
    3 = Overcast
    4 = Rain
    5 = Thunder
    6 = Ash
    7 = Blight
    (8 = Snow?)
    (9 = Blizzard?)

Player Characteristics:
    Health
    Health percent
    Magicka
    Stamina
    Level
    Reputation
    Crime Level, bounty
    Sex, 1 - female
    Gold
    Vampire, 1/0
    Clothing Modifier - amount of items
    Werewolf Kills
    Attributes:
        Strength
        Agility
        Willpower
        Intelligence
        Speed
        Endurance
        Personality
        Luck
    Skills:
        Block
        Armorer
        MediumArmor
        HeavyArmor
        BluntWeapon
        LongBlade
        Axe
        Spear
        Athletics
        Enchant
        Destruction
        Alteration
        Illusion
        Conjuration
        Mysticism
        Restoration
        Alchemy
        Unarmored
        Security
        Sneak
        Acrobatics
        LightArmor
        ShortBlade
        Marksman
        Mercantile
        Speechcraft
        HandToHand
    Disease:
        Common
        Blight
        Corprus
        
Variables:
    Global
    Local
    NotLocal

Journal
Dead
Item

Not:
    NotId
    NotFaction
    NotClass
    NotRace
    NotCell


    pub enum FilterType {
        #[default]
        None = b'0',
        Function = b'1',
        Global = b'2',
        Local = b'3',
        Journal = b'4',
        Item = b'5',
        Dead = b'6',
        NotId = b'7',
        NotFaction = b'8',
        NotClass = b'9',
        NotRace = b'A',
        NotCell = b'B',
        NotLocal = b'C',
    }
    
    #[derive(LoadSave, Clone, Copy, Debug, Eq, PartialEq, Default)]
    #[repr(u16)]
    #[rustfmt::skip]
    pub enum FilterFunction {
        #[default]
        ReactionLow = 12336,           // b"00",
        ReactionHigh = 12592,          // b"01",

        PcClothingModifier = 12852,    // b"42",
        SameSex = 13364,               // b"44",
        SameRace = 13620,              // b"45",
        Detected = 14388,              // b"48",
        Alarmed = 14644,               // b"49",
        Choice = 12341,                // b"50",
        Weather = 14645,               // b"59",
        Level = 12598,                 // b"61",
        Attacked = 12854,              // b"62",
        TalkedToPc = 13110,            // b"63",
        CreatureTarget = 13622,        // b"65",
        FriendHit = 13878,             // b"66",
        Fight = 14134,                 // b"67",
        Hello = 14390,                 // b"68",
        Alarm = 14646,                 // b"69",
        Flee = 12343,                  // b"70",
        ShouldAttack = 12599,          // b"71",
        Werewolf = 12855,              // b"72",
        WerewolfKills = 13111,         // b"73",
        NotClass = 22595,              // b"CX",
        DeadType = 22596,              // b"DX",
        ItemType = 22601,              // b"IX",
        JournalType = 22602,           // b"JX",
        NotCell = 22604,               // b"LX",
        NotRace = 22610,               // b"RX",
        NotIdType = 22616,             // b"XX",

        Global = 22630,                // b"fX",
        CompareGlobal = 22578,         // b"2X",
        CompareLocal = 22579,          // b"3X",
        VariableCompare = 22643,       // b"sX",
    }

