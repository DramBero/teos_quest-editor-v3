import { defineStore } from 'pinia';
import { ref } from 'vue';
import { logger } from '@/services/logger';

export const useStorageStats = defineStore('storageStats', () => {
    const storageUsed = ref('—');
    const storageTotal = ref('—');
    const storagePercent = ref(0);
    const isPersisted = ref(false);

    // Helpers to clear state if needed
    const reset = () => {
        storageUsed.value = '—';
        storageTotal.value = '—';
        storagePercent.value = 0;
        isPersisted.value = false;
    };

    async function updateStorageEstimate() {
        if (!navigator.storage?.estimate) return;
        try {
            const [estimate, persisted] = await Promise.all([
                navigator.storage.estimate(),
                navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)
            ]);

            const used = estimate.usage ?? 0;
            const total = estimate.quota ?? 0;
            storageUsed.value = formatBytes(used);
            storageTotal.value = formatBytes(total);
            storagePercent.value = total > 0 ? (used / total) * 100 : 0;
            isPersisted.value = persisted;
        } catch (e) {
            logger.warn('Storage', 'Storage estimate failed', e);
        }
    }

    async function requestPersistence() {
        if (!navigator.storage?.persist) return false;
        const granted = await navigator.storage.persist();
        if (granted) {
            await updateStorageEstimate();
        }
        return granted;
    }

    function formatBytes(bytes: number, decimals: number = 1): string {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    return {
        storageUsed,
        storageTotal,
        storagePercent,
        isPersisted,
        updateStorageEstimate,
        requestPersistence,
        formatBytes // export helper too
    };
});
