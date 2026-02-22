import { computed, type ComputedRef, toValue, type MaybeRefOrGetter } from 'vue';

export type RecordStatus = 'new' | 'mod' | 'del' | '';

export interface RecordLike {
    TMP_is_active?: boolean;
    old_values?: unknown[];
}

/**
 * Composable for determining record edit status.
 * Replaces duplicated logic in DialogueEntry, SidebarFactionsItem,
 * JournalFrameQuest, JournalFrameQuestExpanded, ModalClassicView, ModalContentDialogue.
 *
 * @param record - A ref/getter to the record object
 * @param options - Optional overrides for custom status detection
 */
export function useRecordStatus(
    record: MaybeRefOrGetter<RecordLike>,
    options?: {
        /** Custom check for 'mod' (e.g., journal uses containsMasterIds) */
        isModified?: MaybeRefOrGetter<boolean>;
        /** Custom check for 'new' (e.g., journal uses is_new) */
        isNew?: MaybeRefOrGetter<boolean>;
    },
) {
    const status: ComputedRef<RecordStatus> = computed(() => {
        const rec = toValue(record);
        if (!rec) return '';

        // Allow custom overrides for components with different detection logic
        if (options?.isNew !== undefined) {
            const isNew = toValue(options.isNew);
            const isModified = options?.isModified !== undefined
                ? toValue(options.isModified)
                : false;

            if (isNew && isModified) return 'mod';
            if (isNew) return 'new';
            return '';
        }

        // Default: use TMP_is_active + old_values pattern
        const isActive = rec.TMP_is_active;
        if (!isActive) return '';

        const oldValues = rec.old_values;
        if (oldValues && oldValues.length > 1) return 'mod';
        return 'new';
    });

    /**
     * CSS class for background markers.
     * Returns e.g. 'marker-new' or 'marker-mod' or ''.
     */
    const statusClass = computed(() => {
        if (!status.value) return '';
        return `marker-${status.value}`;
    });

    return {
        /** Record status: 'new' | 'mod' | 'del' | '' */
        status,
        /** CSS class string: 'marker-new' | 'marker-mod' | 'marker-del' | '' */
        statusClass,
    };
}

/**
 * Simpler version for sidebar items where we have an array of records
 * (faction-style: array of same record from different sources).
 */
export function useRecordArrayStatus(
    records: MaybeRefOrGetter<RecordLike[]>,
) {
    const status: ComputedRef<RecordStatus> = computed(() => {
        const recs = toValue(records);
        if (!recs?.length) return '';

        const first = recs[0];
        if (!first.TMP_is_active) return '';
        if (recs.length > 1) return 'mod';
        return 'new';
    });

    const statusClass = computed(() => {
        if (!status.value) return '';
        return `marker-${status.value}`;
    });

    return { status, statusClass };
}
