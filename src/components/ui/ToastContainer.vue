<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import { computed } from 'vue';

const store = useToastStore();
const toasts = computed(() => store.toasts);

function iconFor(type: string) {
    if (type === 'error')   return '✕';
    if (type === 'warning') return '⚠';
    if (type === 'success') return '✓';
    return 'ℹ';
}
</script>

<template>
    <Transition name="toast-container">
        <div v-if="toasts.length" class="toast-container">
            <TransitionGroup name="toast">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    :class="['toast', `toast--${toast.type}`]"
                    @click="store.dismiss(toast.id)"
                >
                    <span class="toast__icon">{{ iconFor(toast.type) }}</span>
                    <span class="toast__message">{{ toast.message }}</span>
                </div>
            </TransitionGroup>
        </div>
    </Transition>
</template>

<style scoped lang="scss">
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 420px;
}

.toast {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'Pelagiad', sans-serif;
    font-size: 16px;
    cursor: pointer;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(202, 165, 96, 0.25);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    transition: opacity 0.2s ease, transform 0.2s ease;

    &:hover {
        opacity: 0.85;
    }

    &--error {
        background: rgba(80, 20, 20, 0.92);
        color: #ff8a80;
        border-color: rgba(255, 82, 82, 0.35);
    }

    &--warning {
        background: rgba(80, 60, 10, 0.92);
        color: #ffe082;
        border-color: rgba(255, 193, 7, 0.35);
    }

    &--info {
        background: rgba(20, 40, 60, 0.92);
        color: #90caf9;
        border-color: rgba(110, 198, 255, 0.35);
    }

    &--success {
        background: rgba(20, 60, 30, 0.92);
        color: #a5d6a7;
        border-color: rgba(102, 187, 106, 0.35);
    }

    &__icon {
        flex-shrink: 0;
        font-size: 18px;
        line-height: 1.3;
    }

    &__message {
        line-height: 1.4;
        word-break: break-word;
    }
}

/* --- Transition animations --- */
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}
.toast-enter-from {
    opacity: 0;
    transform: translateX(40px);
}
.toast-leave-to {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
}
</style>
