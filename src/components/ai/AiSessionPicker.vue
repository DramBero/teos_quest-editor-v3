<template>
  <div class="ai-sessions" v-if="isOpen">
    <div class="ai-sessions__backdrop" @click="$emit('close')" />
    <div class="ai-sessions__dropdown">
      <button class="ai-sessions__new" @click="handleNew">
        <TdesignAdd />
        <span>New Chat</span>
      </button>

      <div class="ai-sessions__list">
        <div
          v-for="session in sorted"
          :key="session.id"
          class="ai-sessions__item"
          :class="{ 'ai-sessions__item--active': session.id === store.activeSessionId }"
          @click="handleSwitch(session.id)"
        >
          <div class="ai-sessions__item-title">{{ session.title }}</div>
          <div class="ai-sessions__item-meta">
            {{ formatTime(session.updatedAt) }}
             ·
            {{ session.displayMessages.filter(m => m.role === 'user').length }} msgs
          </div>
          <button
            class="ai-sessions__item-delete"
            title="Delete session"
            @click.stop="handleDelete(session.id)"
          >×</button>
        </div>

        <div v-if="sorted.length === 0" class="ai-sessions__empty">
          No sessions yet
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatHistory } from '@/ai/chat-history';
import TdesignAdd from '~icons/tdesign/add';

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch'): void;
}>();

const store = useChatHistory();

const sorted = computed(() => store.sortedSessions());

function handleNew() {
  store.createSession();
  emit('switch');
  emit('close');
}

function handleSwitch(id: string) {
  store.switchSession(id);
  emit('switch');
  emit('close');
}

function handleDelete(id: string) {
  store.deleteSession(id);
  emit('switch');
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
</script>

<style lang="scss">
.ai-sessions {
  position: relative;

  &__backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  &__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgb(30, 28, 20);
    border: 1px solid rgba(170, 169, 98, 0.25);
    border-radius: 0 0 8px 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    max-height: 320px;
    overflow-y: auto;
  }

  &__new {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: rgba(170, 169, 98, 0.06);
    color: rgba(216, 186, 131, 0.8);
    font-family: 'Pelagiad', serif;
    font-size: 14px;
    cursor: pointer;
    border-bottom: 1px solid rgba(170, 169, 98, 0.12);

    svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &:hover {
      background: rgba(170, 169, 98, 0.12);
      color: rgb(216, 186, 131);
    }
  }

  &__list {
    padding: 4px 0;
  }

  &__item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    padding: 8px 14px;
    cursor: pointer;
    position: relative;
    transition: background 80ms ease;

    &:hover {
      background: rgba(170, 169, 98, 0.08);
    }

    &--active {
      background: rgba(202, 165, 96, 0.1);
      border-left: 3px solid rgba(202, 165, 96, 0.5);
      padding-left: 11px;
    }

    &-title {
      flex: 1;
      min-width: 0;
      font-family: 'Pelagiad', serif;
      font-size: 14px;
      color: rgba(216, 216, 216, 0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &--active &-title {
      color: rgb(216, 186, 131);
    }

    &-meta {
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: rgba(216, 216, 216, 0.3);
      white-space: nowrap;
    }

    &-delete {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(216, 216, 216, 0.2);
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      opacity: 0;
      transition: all 80ms ease;

      .ai-sessions__item:hover & {
        opacity: 1;
      }

      &:hover {
        color: rgb(200, 80, 80);
        background: rgba(200, 80, 80, 0.1);
      }
    }
  }

  &__empty {
    padding: 20px 14px;
    text-align: center;
    color: rgba(216, 216, 216, 0.3);
    font-family: 'Pelagiad', serif;
    font-size: 14px;
  }
}
</style>
