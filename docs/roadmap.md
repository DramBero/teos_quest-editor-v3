# TODO before release-ready:
- Edit from master
- Disable master dialogue
- Copy / Paste / Replace / Switch entry
- Global dialogue
- Filters drag and drop
- Add filters via context menu
- Delete filters
- Edit filters
- Classic menu - changing order
- Option to show not only NPC-specific dialogue for the NPC, but also his faction, race, class, rank and global dialogue. (Maybe also cell, based on his starting cell)
- Add books
- Edit header
- Create new plugin
- Help menu
- Watch and edit dialogue or journal changes
- Full journal editing for master plugin
- A video about functionality
- Release text for Nexus
- Finish the heads, and think of what to display for other speakers
- Make a logo
- Finalize the naming and version number
- Build for Win (exe), Mac (dmg) and Linux (deb, rpm)

# Non MVP:
These features are not essential for the release
### Edit GMST and variables
### Ability to open several dialogue windows
### Split IndexedDB to plugins and sessions 
- Allows to open several tabs with plugins
- Allows to remove all changes from current session
- Allows to preview all changes from current session
### Make dependency keys in IndexedDB not based on name
- Allows to keep a localized master along with english one for localization

# Theoretical and wished:
Features I really wish to implement, but it would take several lifetimes. Still, some of them are realistic and maybe even would be implemented before the release.
### Change history
- Would allow to undo and redo changes and watch changes
### Custom highlighting for MWScript
- For now, it uses highlighting for different conventional languages
### Code library for scripts
- Would show some specific examples of scripts for usage
### Linting and LSP
- Would allow to lint and autocomplete MWScript, Lua (MWSE) and Morrowind-specific HTML
### Keybindings with editing
- Would allow to set and edit keybindings for certain operations
### Filters for different types of records
- Would allow to filter records in the sidebar by attributes, specific to the type (filter out all NPCs from House Hlaalu, or all NPCs from Balmora)
### Selection of specific records
- Would allow to select records in the sidebar and do certain operations with them (mainly deletion)
### Faction Module
- Would allow to add and edit factions, their ranks and reactions
### NPC Module
- Would allow to add and edit NPCs, along with their inventory and AI
### Creature Module
- Same as above, but with creatures
### Item Module
- Would allow to add and edit different types of items
### Scripts Module
- Would allow to view and possibly edit scripts. May require compilation to bytecode
### Magic Module
- Would allow to add and create spells and enchantments. Maybe also Magic Effects
### Class/Skill/Birthsign Module
### Race Module
### Leveled Module
- For leveled creatures and items
### Region Module
- Just would allow to add and edit regions. Nothing fancy
### File System API
- A user would give permissions to Data Files folder, and the editor could just load dds files from there and render them
- Would need to add an option to change between different data files folders
### Plugin merging
- Would allow to handle plugin merging
### TESAME Mode 
- Would allow to view entries in a table, like in TESAME for low-level editing
### Adaptivity support
- Would allow to use the editor on phones or tablets
- Possible Tauri builds for Android and iOS
### Localization tools and cyrillic support
- Would allow easier localization
- Main focus would be on Russian language localization
### Open plugin via link
- Would allow to give person a link, and on clicking it - the editor would open with the specific plugin and session
### Advanced session system and project folder structure
- Would allow to save not only to ESP, but also to JSON, keeping all session data
- Would allow to make notes for other people using that session
- Probably would require to handle "workspace folders", like in VSCode
- Possible add websockets-based coop mode, like in Figma
- Would be great to add git support to the workspace folder
- A "release button", building the folder with esp and assets would be great too
### Tutorial system
- Would allow to keep tutorials as JSON, and let users play those tutorials. Modals will appear with text on guiding user actions, and specific buttons would be highlighted
### Conceptualization mode for quests
- A mode, where you can create a mindmap for a quest and maybe even convert it to a plugin. Or visualise an existing quest as a mindmap
### Play simulation
- Would run a small 2D or text-RPG simulation of the active session
  