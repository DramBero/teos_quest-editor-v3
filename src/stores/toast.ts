import { ref } from 'vue';
import { defineStore } from 'pinia';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type ToastType = 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    timestamp: number;
}

// ---------------------------------------------------------------------------
//  Store
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 5000;

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([]);

    function add(type: ToastType, message: string) {
        const id = crypto.randomUUID();
        const toast: Toast = { id, type, message, timestamp: Date.now() };
        toasts.value.push(toast);

        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }

    function dismiss(id: string) {
        toasts.value = toasts.value.filter((t) => t.id !== id);
    }

    return { toasts, add, dismiss };
});
