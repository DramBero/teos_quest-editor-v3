<template>
  <div class="ai-settings">
    <div class="ai-settings__header">
      <div class="ai-settings__header-title">
        <TdesignSetting class="ai-settings__header-icon" />
        <span>AI Settings</span>
      </div>
      <button class="ai-settings__close" @click="$emit('close')">
        <TdesignClose />
      </button>
    </div>

    <div class="ai-settings__body">
      <label class="ai-settings__field">
        <span>API Key</span>
        <input
          type="password"
          :value="config.apiKey"
          @input="update({ apiKey: ($event.target as HTMLInputElement).value })"
          placeholder="sk-..."
        />
      </label>

      <label class="ai-settings__field">
        <span>Base URL</span>
        <input
          type="text"
          :value="config.baseUrl"
          @input="update({ baseUrl: ($event.target as HTMLInputElement).value })"
          placeholder="https://api.openai.com/v1"
        />
      </label>

      <label class="ai-settings__field">
        <span>Model</span>
        <input
          type="text"
          :value="config.model"
          @input="update({ model: ($event.target as HTMLInputElement).value })"
          placeholder="gpt-4o"
        />
      </label>

      <label class="ai-settings__field">
        <span>Temperature: {{ config.temperature.toFixed(1) }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="config.temperature"
          @input="update({ temperature: parseFloat(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="ai-settings__field">
        <span>Max Tokens</span>
        <input
          type="number"
          :value="config.maxTokens"
          @input="update({ maxTokens: parseInt(($event.target as HTMLInputElement).value) || 4096 })"
          min="256"
          max="16000"
        />
      </label>

      <div class="ai-settings__hint">
        Settings are saved in your browser's local storage.
      </div>

      <div class="ai-settings__provider-hint">
        <div class="ai-settings__provider-title">Quick Start with OpenRouter</div>
        <div class="ai-settings__provider-steps">
          <span>1. Get a free key at <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></span>
          <span>2. Set Base URL to <code>https://openrouter.ai/api/v1</code></span>
          <span>3. Set Model to <code>openai/gpt-4o-mini</code></span>
        </div>
        <div class="ai-settings__provider-note">OpenRouter supports browser CORS and 100+ models including GPT-4o, Claude, Llama.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAiSettings } from '@/ai/settings';
import TdesignSetting from '~icons/tdesign/setting';
import TdesignClose from '~icons/tdesign/close';

defineEmits<{ (e: 'close'): void }>();

const { config, update } = useAiSettings();
</script>

<style lang="scss">
.ai-settings {
  border-bottom: 1px solid rgba(170, 169, 98, 0.2);
  background: rgba(0, 0, 0, 0.2);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 16px;
    color: rgb(216, 186, 131);
    font-family: 'Pelagiad', serif;
    border-bottom: 1px solid rgba(170, 169, 98, 0.15);

    &-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    &-icon {
      width: 15px;
      height: 15px;
      opacity: 0.7;
    }
  }

  &__close {
    background: none;
    border: none;
    color: rgba(216, 216, 216, 0.5);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;

    svg { width: 16px; height: 16px; }

    &:hover { color: rgba(216, 216, 216, 0.9); }
  }

  &__body {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 14px;
    color: rgba(216, 216, 216, 0.6);

    input[type="text"],
    input[type="password"],
    input[type="number"] {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(170, 169, 98, 0.25);
      color: rgba(216, 216, 216, 0.85);
      font-family: 'Fira Code', monospace;
      font-size: 15px;
      padding: 6px 10px;
      border-radius: 4px;
      outline: none;

      &:focus { border-color: rgba(202, 165, 96, 0.5); }
      &::placeholder { color: rgba(216, 216, 216, 0.2); }
    }

    input[type="range"] {
      accent-color: rgb(202, 165, 96);
    }
  }

  &__hint {
    font-size: 13px;
    color: rgba(216, 216, 216, 0.3);
    line-height: 1.4;
    padding-top: 4px;
  }

  &__provider-hint {
    background: rgba(170, 169, 98, 0.06);
    border: 1px solid rgba(170, 169, 98, 0.15);
    border-radius: 6px;
    padding: 10px 12px;
  }

  &__provider-title {
    font-size: 13px;
    color: rgb(216, 186, 131);
    font-family: 'Pelagiad', serif;
    margin-bottom: 6px;
  }

  &__provider-steps {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: rgba(216, 216, 216, 0.5);

    a {
      color: rgb(130, 180, 255);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    code {
      background: rgba(0, 0, 0, 0.4);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: rgb(237, 238, 167);
    }
  }

  &__provider-note {
    font-size: 11px;
    color: rgba(216, 216, 216, 0.25);
    margin-top: 6px;
    line-height: 1.3;
  }
}
</style>
