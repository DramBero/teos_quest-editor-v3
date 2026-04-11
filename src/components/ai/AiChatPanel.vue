<template>
  <div class="ai-chat">
    <!-- Header -->
    <div class="ai-chat__header">
      <div class="ai-chat__title">
        <GameIconsGears class="ai-chat__title-icon" />
        <span>AI Assistant</span>
      </div>
      <div class="ai-chat__header-actions">
        <button
          class="ai-chat__header-btn"
          :class="{ 'ai-chat__header-btn--active': showSessions }"
          title="Chat sessions"
          @click="showSessions = !showSessions"
        ><TdesignChat /></button>
        <button
          class="ai-chat__header-btn"
          :class="{ 'ai-chat__header-btn--active': showSettings }"
          title="Settings"
          @click="showSettings = !showSettings"
        ><TdesignSetting /></button>
        <button
          class="ai-chat__header-btn"
          title="New chat"
          @click="startNewChat"
        ><TdesignAdd /></button>
        <button
          class="ai-chat__header-btn ai-chat__header-btn--close"
          title="Close"
          @click="$emit('close')"
        ><TdesignClose /></button>
      </div>
    </div>

    <!-- Session Picker -->
    <AiSessionPicker
      :isOpen="showSessions"
      @close="showSessions = false"
      @switch="loadActiveSession"
    />

    <!-- Settings -->
    <AiSettings v-if="showSettings" @close="showSettings = false" />

    <!-- Not configured warning -->
    <div v-if="!aiSettings.isConfigured && !showSettings" class="ai-chat__unconfigured" @click="showSettings = true">
      <TdesignErrorTriangle class="ai-chat__unconfigured-icon" />
      <span>Enter your API key in settings to start</span>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="ai-chat__messages">
      <div v-if="displayMessages.length === 0" class="ai-chat__empty">
        <GameIconsGears class="ai-chat__empty-icon" />
        <div class="ai-chat__empty-text">
          Ask me about MWScript, your mod, or Morrowind modding in general.
        </div>
        <div class="ai-chat__empty-hints">
          <button @click="sendQuick('What NPCs exist in my mod? Give me an overview')">
            <TdesignUserList class="ai-chat__hint-icon" /> Show my NPCs
          </button>
          <button @click="sendQuick('List all quests and their stages')">
            <TdesignList class="ai-chat__hint-icon" /> Quest overview
          </button>
          <button @click="sendQuick('Find all dialogues related to the first NPC in my mod')">
            <TdesignChatBubble class="ai-chat__hint-icon" /> NPC dialogues
          </button>
          <button @click="sendQuick('Analyze the first script in my mod for errors')">
            <TdesignCode class="ai-chat__hint-icon" /> Analyze script
          </button>
          <button @click="sendQuick('What changes does my plugin make compared to the masters?')">
            <TdesignSearch class="ai-chat__hint-icon" /> Plugin diff
          </button>
        </div>
      </div>

      <AiChatMessage
        v-for="(msg, i) in displayMessages"
        :key="i"
        :message="msg"
      />

      <!-- Streaming indicator -->
      <div v-if="isStreaming" class="ai-chat__streaming">
        <span class="ai-chat__streaming-dot" />
        <span class="ai-chat__streaming-dot" />
        <span class="ai-chat__streaming-dot" />
      </div>
    </div>

    <!-- Input -->
    <div class="ai-chat__input-area">
      <textarea
        ref="inputEl"
        v-model="inputText"
        class="ai-chat__input"
        placeholder="Ask about your mod..."
        :disabled="isStreaming"
        @keydown.enter.exact.prevent="sendMessage"
        rows="1"
        @input="autoResize"
      />
      <button
        class="ai-chat__send"
        :disabled="!canSend"
        @click="sendMessage"
        :title="isStreaming ? 'Generating...' : 'Send (Enter)'"
      >
        <SVGSpinners90RingWithBg v-if="isStreaming" />
        <TdesignSend v-else />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import AiChatMessage from './AiChatMessage.vue';
import AiSettings from './AiSettings.vue';
import AiSessionPicker from './AiSessionPicker.vue';
import { useAiSettings } from '@/ai/settings';
import { useChatHistory, type DisplayMessage } from '@/ai/chat-history';
import { streamChat, type ChatMessage } from '@/ai/llm-client';
import { getToolDefinitions } from '@/ai/tools';
import { executeTool } from '@/ai/tool-executor';
import { buildSystemPrompt } from '@/ai/context';

import GameIconsGears from '~icons/game-icons/gears';
import TdesignSetting from '~icons/tdesign/setting';
import TdesignAdd from '~icons/tdesign/add';
import TdesignChat from '~icons/tdesign/chat';
import TdesignClose from '~icons/tdesign/close';
import TdesignErrorTriangle from '~icons/tdesign/error-triangle';
import TdesignList from '~icons/tdesign/list';
import TdesignCode from '~icons/tdesign/code';
import TdesignSearch from '~icons/tdesign/search';
import TdesignUserList from '~icons/tdesign/user-list';
import TdesignChatBubble from '~icons/tdesign/chat-bubble';
import TdesignSend from '~icons/tdesign/send';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';

defineEmits<{ (e: 'close'): void }>();

const aiSettings = useAiSettings();
const chatHistory = useChatHistory();
const showSettings = ref(false);
const showSessions = ref(false);
const inputText = ref('');
const isStreaming = ref(false);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);

// Full conversation history (for API)
const conversation = ref<ChatMessage[]>([]);

// Display messages (user-visible: user, assistant, tool results)
const displayMessages = ref<DisplayMessage[]>([]);

const canSend = computed(() =>
  inputText.value.trim().length > 0 && !isStreaming.value && aiSettings.isConfigured
);

function autoResize() {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function scrollToBottom() {
  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}

function clearChat() {
  conversation.value = [];
  displayMessages.value = [];
  chatHistory.clearActiveSession();
}

function startNewChat() {
  chatHistory.createSession();
  loadActiveSession();
}

function loadActiveSession() {
  const session = chatHistory.activeSession();
  if (session) {
    conversation.value = [...session.conversation];
    displayMessages.value = [...session.displayMessages];
  } else {
    conversation.value = [];
    displayMessages.value = [];
  }
  scrollToBottom();
}

function persistMessages() {
  chatHistory.saveMessages(
    conversation.value,
    displayMessages.value,
  );
}

function sendQuick(text: string) {
  inputText.value = text;
  sendMessage();
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || isStreaming.value || !aiSettings.isConfigured) return;

  inputText.value = '';
  nextTick(() => autoResize());

  // Add user message
  const userMsg: ChatMessage = { role: 'user', content: text };
  conversation.value.push(userMsg);
  displayMessages.value.push({ role: 'user', content: text });
  scrollToBottom();

  // Build messages for API (system + conversation)
  const systemPrompt = await buildSystemPrompt();
  const apiMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversation.value,
  ];

  isStreaming.value = true;

  try {
    await doStreamRound(apiMessages);
  } catch (err) {
    displayMessages.value.push({
      role: 'assistant',
      content: `Error: ${err}`,
    });
  } finally {
    isStreaming.value = false;
    scrollToBottom();
    persistMessages();
  }
}

async function doStreamRound(apiMessages: ChatMessage[]) {
  const toolDefs = getToolDefinitions();
  let fullText = '';
  const toolCalls: { id: string; name: string; arguments: string }[] = [];

  for await (const event of streamChat(apiMessages, toolDefs, aiSettings.config)) {
    switch (event.type) {
      case 'text':
        fullText += event.content;
        updateStreamingMessage(fullText);
        scrollToBottom();
        break;

      case 'tool_call':
        toolCalls.push({
          id: event.id,
          name: event.name,
          arguments: event.arguments,
        });
        break;

      case 'error':
        displayMessages.value.push({
          role: 'assistant',
          content: `Error: ${event.message}`,
        });
        return;

      case 'done':
        break;
    }
  }

  // Finalize the assistant message in conversation
  if (fullText) {
    finalizeStreamingMessage(fullText);
    const assistantMsg: ChatMessage = { role: 'assistant', content: fullText };
    if (toolCalls.length > 0) {
      assistantMsg.tool_calls = toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    conversation.value.push(assistantMsg);
  } else if (toolCalls.length > 0) {
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
    conversation.value.push(assistantMsg);
  }

  // Execute tool calls if any
  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      const result = await executeTool(tc.name, tc.arguments);
      displayMessages.value.push({
        role: 'tool',
        content: result,
        toolName: tc.name,
      });

      conversation.value.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
      });
      scrollToBottom();
    }

    // Continue conversation with tool results
    const nextApiMessages: ChatMessage[] = [
      { role: 'system', content: await buildSystemPrompt() },
      ...conversation.value,
    ];

    await doStreamRound(nextApiMessages);
  }
}

// --- Streaming message management ---

let streamingMsgIndex = -1;

function updateStreamingMessage(text: string) {
  if (streamingMsgIndex === -1) {
    streamingMsgIndex = displayMessages.value.length;
    displayMessages.value.push({ role: 'assistant', content: text });
  } else {
    displayMessages.value[streamingMsgIndex] = {
      role: 'assistant',
      content: text,
    };
  }
}

function finalizeStreamingMessage(text: string) {
  if (streamingMsgIndex >= 0) {
    displayMessages.value[streamingMsgIndex] = {
      role: 'assistant',
      content: text,
    };
  }
  streamingMsgIndex = -1;
}

// Load active session on mount
onMounted(() => {
  loadActiveSession();
});

// Focus input on mount
watch(() => inputEl.value, (el) => {
  if (el) el.focus();
});
</script>

<style lang="scss">
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(22, 20, 14);
  border-left: 1px solid rgba(170, 169, 98, 0.25);
  font-family: 'Pelagiad', serif;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(170, 169, 98, 0.08);
    border-bottom: 1px solid rgba(170, 169, 98, 0.2);
    flex-shrink: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    color: rgb(216, 186, 131);
    font-weight: 600;

    &-icon {
      width: 20px;
      height: 20px;
      opacity: 0.7;
    }
  }

  &__header-actions {
    display: flex;
    gap: 2px;
  }

  &__header-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    color: rgba(216, 186, 131, 0.4);
    transition: all 80ms ease;
    display: flex;
    align-items: center;

    svg { width: 18px; height: 18px; }

    &:hover { color: rgba(216, 186, 131, 0.9); background: rgba(170, 169, 98, 0.1); }

    &--active {
      color: rgba(216, 186, 131, 0.9);
      background: rgba(170, 169, 98, 0.15);
    }

    &--close:hover { color: rgb(200, 80, 80); }
  }

  &__unconfigured {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    color: rgba(255, 200, 50, 0.6);
    font-size: 15px;
    cursor: pointer;
    background: rgba(255, 200, 50, 0.05);
    border-bottom: 1px solid rgba(170, 169, 98, 0.15);

    &:hover { background: rgba(255, 200, 50, 0.1); }

    &-icon { width: 16px; height: 16px; flex-shrink: 0; }
  }

  &__messages {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    padding: 20px;

    &-icon {
      width: 48px;
      height: 48px;
      color: rgba(216, 186, 131, 0.15);
    }

    &-text {
      color: rgba(216, 216, 216, 0.3);
      font-size: 16px;
      text-align: center;
      max-width: 250px;
    }

    &-hints {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(170, 169, 98, 0.1);
        border: 1px solid rgba(170, 169, 98, 0.2);
        color: rgba(216, 216, 216, 0.5);
        font-family: 'Pelagiad', serif;
        font-size: 15px;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        transition: all 80ms ease;

        &:hover {
          background: rgba(170, 169, 98, 0.2);
          color: rgba(216, 216, 216, 0.8);
        }
      }
    }
  }

  &__hint-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.6;
  }

  &__streaming {
    display: flex;
    gap: 4px;
    padding: 12px 46px;

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(202, 165, 96, 0.5);
      animation: ai-dot-pulse 1.2s ease-in-out infinite;

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  &__input-area {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid rgba(170, 169, 98, 0.2);
    background: rgba(170, 169, 98, 0.04);
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    resize: none;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(170, 169, 98, 0.25);
    color: rgba(216, 216, 216, 0.85);
    font-family: 'Pelagiad', serif;
    font-size: 16px;
    padding: 8px 10px;
    border-radius: 6px;
    outline: none;
    min-height: 36px;
    max-height: 120px;
    line-height: 1.4;

    &:focus { border-color: rgba(202, 165, 96, 0.5); }
    &::placeholder { color: rgba(216, 216, 216, 0.2); }
    &:disabled { opacity: 0.5; }
  }

  &__send {
    background: rgba(170, 169, 98, 0.2);
    border: 1px solid rgba(170, 169, 98, 0.3);
    color: rgb(216, 186, 131);
    width: 36px;
    height: 36px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 80ms ease;

    svg { width: 18px; height: 18px; }

    &:hover:not(:disabled) { background: rgba(170, 169, 98, 0.3); }
    &:disabled { opacity: 0.3; cursor: default; }
  }
}

@keyframes ai-dot-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
