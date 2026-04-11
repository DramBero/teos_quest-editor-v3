import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export interface AiConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

const STORAGE_KEY = 'teos-ai-settings';

function loadFromStorage(): Partial<AiConfig> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveToStorage(config: AiConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const defaults: AiConfig = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
};

export const useAiSettings = defineStore('aiSettings', () => {
    const stored = loadFromStorage();
    const config = ref<AiConfig>({ ...defaults, ...stored });

    // Persist on change
    watch(config, (val) => saveToStorage(val), { deep: true });

    function update(partial: Partial<AiConfig>) {
        Object.assign(config.value, partial);
    }

    function reset() {
        Object.assign(config.value, defaults);
    }

    const isConfigured = ref(false);
    watch(() => config.value.apiKey, (key) => {
        isConfigured.value = !!key && key.length > 10;
    }, { immediate: true });

    return { config, isConfigured, update, reset };
});
