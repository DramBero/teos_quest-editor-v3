import { ref } from 'vue';

const aiPanelOpen = ref(false);
const aiPanelFullscreen = ref(false);

export function useAiPanel() {
    function toggle() {
        aiPanelOpen.value = !aiPanelOpen.value;
        if (!aiPanelOpen.value) aiPanelFullscreen.value = false;
    }

    function open() {
        aiPanelOpen.value = true;
    }

    function close() {
        aiPanelOpen.value = false;
        aiPanelFullscreen.value = false;
    }

    function toggleFullscreen() {
        aiPanelFullscreen.value = !aiPanelFullscreen.value;
    }

    return {
        isOpen: aiPanelOpen,
        isFullscreen: aiPanelFullscreen,
        toggle,
        open,
        close,
        toggleFullscreen,
    };
}
