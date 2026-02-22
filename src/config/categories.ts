import { defineAsyncComponent, type Component } from 'vue';

export interface CategoryConfig {
    name: string;
    items: string[];
    icon: string;
    /** Background color for sidebar dot pattern */
    bgColor: string;
}

/**
 * Single source of truth for sidebar categories.
 * Used by SidebarMain.vue and WorkspaceControls.vue
 * (previously duplicated in both components).
 */
export const CATEGORIES: CategoryConfig[] = [
    {
        name: 'Social',
        icon: 'organigram',
        bgColor: 'rgb(59, 45, 59)',
        items: ['Class', 'Faction', 'Race', 'Skill', 'Birthsign'],
    },
    {
        name: 'Actors',
        icon: 'character',
        bgColor: 'rgb(45, 59, 45)',
        items: ['Npc', 'Creature', 'LeveledCreature'],
    },
    {
        name: 'Items',
        icon: 'gauntlet',
        bgColor: 'rgb(45, 59, 58)',
        items: [
            'Book', 'Clothing', 'Armor', 'Weapon', 'MiscItem',
            'RepairItem', 'Apparatus', 'Lockpick', 'Probe',
            'Ingredient', 'Alchemy', 'LeveledItem',
        ],
    },
    {
        name: 'Scripts',
        icon: 'gears',
        bgColor: 'rgb(59, 48, 45)',
        items: ['Script', 'GlobalVariable', 'StartScript'],
    },
    {
        name: 'Magic',
        icon: 'fire-spell-cast',
        bgColor: 'rgb(57, 68, 80)',
        items: ['MagicEffect', 'Spell', 'Enchanting'],
    },
    {
        name: 'Interact',
        icon: 'open-chest',
        bgColor: 'rgb(91, 62, 28)',
        items: ['Door', 'Activator', 'Container'],
    },
    {
        name: 'World',
        icon: 'medieval-village-01',
        bgColor: 'rgb(55, 85, 76)',
        items: [
            'Cell', 'Region', 'Sound', 'SoundGen', 'LandscapeTexture',
            'Static', 'Bodypart', 'Light', 'Landscape', 'PathGrid',
            'GameSetting',
        ],
    },
];

/**
 * Map icon key to async icon component.
 * Centralizes the icon imports that were duplicated in
 * SidebarFactions.vue and WorkspaceControls.vue.
 */
const ICON_MAP: Record<string, Component> = {
    'bookmarklet': defineAsyncComponent(
        () => import('~icons/game-icons/bookmarklet/GameIconsBookmarklet.vue'),
    ),
    'gears': defineAsyncComponent(
        () => import('~icons/game-icons/gears/GameIconsGears.vue'),
    ),
    'organigram': defineAsyncComponent(
        () => import('~icons/game-icons/organigram/GameIconsOrganigram.vue'),
    ),
    'character': defineAsyncComponent(
        () => import('~icons/game-icons/character/GameIconsCharacter.vue'),
    ),
    'gauntlet': defineAsyncComponent(
        () => import('~icons/game-icons/gauntlet/GameIconsGauntlet.vue'),
    ),
    'medieval-village-01': defineAsyncComponent(
        () => import('~icons/game-icons/medieval-village-01/GameIconsMedievalVillage01.vue'),
    ),
    'open-chest': defineAsyncComponent(
        () => import('~icons/game-icons/open-chest/OpenChest.vue'),
    ),
    'fire-spell-cast': defineAsyncComponent(
        () => import('~icons/game-icons/fire-spell-cast/FireSpellCast.vue'),
    ),
};

/**
 * Get the icon component for a category or icon key.
 * Falls back to 'bookmarklet' if not found.
 */
export function getCategoryIcon(iconKey: string): Component {
    return ICON_MAP[iconKey] || ICON_MAP['bookmarklet'];
}

/**
 * Get a category config by name
 */
export function getCategoryByName(name: string): CategoryConfig | undefined {
    return CATEGORIES.find((c) => c.name === name);
}
