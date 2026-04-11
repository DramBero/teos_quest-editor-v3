import { ref } from 'vue';

const aiPanelOpen = ref(false);

export function useAiPanel() {
    function toggle() {
        aiPanelOpen.value = !aiPanelOpen.value;
    }

    function open() {
        aiPanelOpen.value = true;
    }

    function close() {
        aiPanelOpen.value = false;
    }

    return { isOpen: aiPanelOpen, toggle, open, close };
}
