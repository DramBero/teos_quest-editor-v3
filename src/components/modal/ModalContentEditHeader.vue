<template>
  <div class="frame-upload">
    <h2 class="modal__title">Edit Plugin Header</h2>

    <div class="header-edit" v-if="loaded">
      <!-- Plugin Name + Type -->
      <div class="header-edit__section">
        <span class="header-edit__label">Plugin name</span>
        <div class="header-edit__row">
          <label class="modal-field" style="flex: 1">
            <input
              class="modal-field__input"
              autocomplete="off"
              placeholder="Plugin name"
              v-model="pluginName"
            />
          </label>
          <div class="header-edit__type-toggle">
            <button
              class="header-edit__type-btn"
              :class="{ 'header-edit__type-btn--active': fileType === 'Esp' }"
              @click="fileType = 'Esp'"
            >
              ESP
            </button>
            <button
              class="header-edit__type-btn"
              :class="{ 'header-edit__type-btn--active': fileType === 'Esm' }"
              @click="fileType = 'Esm'"
            >
              ESM
            </button>
          </div>
        </div>
      </div>

      <!-- Version + Author -->
      <div class="header-edit__row">
        <label class="modal-field" style="flex: 0 0 120px">
          <span class="header-edit__label">Version</span>
          <input
            class="modal-field__input"
            type="number"
            step="0.01"
            min="0"
            autocomplete="off"
            placeholder="1.0"
            v-model.number="version"
          />
        </label>
        <label class="modal-field" style="flex: 1">
          <span class="header-edit__label">Author</span>
          <input
            class="modal-field__input"
            autocomplete="off"
            placeholder="Author name"
            v-model="author"
          />
        </label>
      </div>

      <!-- Description -->
      <label class="modal-field">
        <span class="header-edit__label">Description</span>
        <textarea
          class="modal-field__input header-edit__textarea"
          autocomplete="off"
          placeholder="Mod description..."
          rows="4"
          v-model="description"
        ></textarea>
      </label>

      <!-- Dependencies -->
      <div class="header-edit__section">
        <span class="header-edit__label">
          Dependencies
          <span class="header-edit__count">({{ dependencies.length }})</span>
        </span>
        <div class="header-edit__deps" v-if="dependencies.length">
          <div
            v-for="(dep, i) in dependencies"
            :key="dep[0] + i"
            class="header-edit__dep"
          >
            <span class="header-edit__dep-name">{{ dep[0] }}</span>
            <span class="header-edit__dep-size">{{ formatBytes(dep[1]) }}</span>
          </div>
        </div>
        <p v-else class="header-edit__empty">No master files</p>
      </div>

      <!-- Record count (read-only info) -->
      <div class="header-edit__info">
        <span class="header-edit__info-item">
          Records: <strong>{{ numObjects }}</strong>
        </span>
        <span class="header-edit__info-item" v-if="fileType">
          Format: <strong>{{ fileType === 'Esm' ? 'Elder Scrolls Master' : 'Elder Scrolls Plugin' }}</strong>
        </span>
      </div>

      <!-- Actions -->
      <div class="header-edit__actions">
        <button class="modal-button header-edit__save" @click="saveHeader" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button class="modal-button header-edit__cancel" @click="cancel">Cancel</button>
      </div>

      <!-- Success message -->
      <transition name="fade-msg">
        <div v-if="saved" class="header-edit__saved">✓ Header saved</div>
      </transition>
    </div>

    <p v-else class="header-edit__empty">No plugin loaded</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { usePluginHeader } from '@/stores/pluginHeader';
import { usePrimaryModal } from '@/stores/modals';
import { useSessionStore } from '@/stores/session';
import { updateHeader } from '@/api/idb';
import { logger } from '@/services/logger';

const headerStore = usePluginHeader();
const primaryModalStore = usePrimaryModal();
const sessionStore = useSessionStore();

const loaded = ref(false);
const saving = ref(false);
const saved = ref(false);

// Editable fields
const pluginName = ref('');
const fileType = ref<'Esp' | 'Esm'>('Esp');
const version = ref<number>(1.0);
const author = ref('');
const description = ref('');
const dependencies = ref<Array<[string, number]>>([]);
const numObjects = ref(0);

onMounted(async () => {
  const header = headerStore.getPluginHeader;
  if (!header) return;

  pluginName.value = header.TMP_dep || '';
  fileType.value = header.file_type || 'Esp';
  version.value = header.version ?? 1.0;
  author.value = header.author || '';
  description.value = header.description || '';
  dependencies.value = header.masters ? structuredClone(header.masters) : [];
  numObjects.value = header.num_objects ?? 0;

  await nextTick();
  loaded.value = true;
});

async function saveHeader() {
  saving.value = true;
  saved.value = false;

  try {
    const updated = await updateHeader({
      version: version.value,
      file_type: fileType.value,
      author: author.value,
      description: description.value,
      masters: dependencies.value,
    });

    // Sync Pinia store
    headerStore.setPluginHeader(updated);

    // Update session plugin name if changed
    if (pluginName.value && sessionStore.currentSession) {
      await sessionStore.updateSession({
        ...sessionStore.currentSession,
        pluginName: pluginName.value,
      });
    }

    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
    logger.info('Header', 'Plugin header saved');
  } catch (err) {
    logger.error('Header', 'Failed to save header', err);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  primaryModalStore.setActiveModal('');
}

function formatBytes(bytes: number, decimals: number = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
</script>

<style lang="scss" scoped>
.header-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 10px 10px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 18px;
    color: rgba(0, 0, 0, 0.55);
    font-weight: 500;
  }

  &__count {
    font-weight: 400;
    font-size: 15px;
    opacity: 0.6;
  }

  &__row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  &__type-toggle {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  &__type-btn {
    padding: 10px 16px;
    font-family: 'Pelagiad', serif;
    font-size: 18px;
    border: 2px solid rgb(202, 165, 96);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 80ms ease;

    &:first-child {
      border-radius: 8px 0 0 8px;
    }

    &:last-child {
      border-radius: 0 8px 8px 0;
    }

    &--active {
      background: rgb(202, 165, 96);
      color: rgb(35, 31, 20);
      font-weight: 700;
    }

    &:hover:not(&--active) {
      background: rgba(202, 165, 96, 0.25);
    }
  }

  &__textarea {
    resize: vertical;
    min-height: 80px;
    line-height: 1.35;
  }

  &__deps {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    overflow: hidden;
  }

  &__dep {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 16px;

    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
  }

  &__dep-name {
    color: rgba(0, 0, 0, 0.75);
    font-weight: 500;
  }

  &__dep-size {
    color: rgba(0, 0, 0, 0.35);
    font-size: 14px;
  }

  &__empty {
    color: rgba(0, 0, 0, 0.35);
    font-style: italic;
    font-size: 16px;
    padding: 4px 0;
  }

  &__info {
    display: flex;
    gap: 20px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    font-size: 15px;
    color: rgba(0, 0, 0, 0.5);
  }

  &__info-item strong {
    color: rgba(0, 0, 0, 0.7);
  }

  &__actions {
    display: flex;
    gap: 12px;
    padding-top: 4px;
  }

  &__save {
    background: rgb(202, 165, 96);
    color: rgb(35, 31, 20);
    font-family: 'Pelagiad', serif;
    font-size: 20px;
    font-weight: 600;
    max-width: 160px;

    &:hover:not(:disabled) {
      background: rgb(216, 186, 131);
      color: rgb(25, 21, 10);
    }
  }

  &__cancel {
    background: transparent;
    font-family: 'Pelagiad', serif;
    font-size: 20px;
    color: rgba(0, 0, 0, 0.5);

    &:hover {
      color: rgba(0, 0, 0, 0.8) !important;
    }
  }

  &__saved {
    text-align: center;
    color: rgb(46, 125, 50);
    font-size: 17px;
    font-weight: 600;
    padding: 4px 0;
  }
}

.modal__title {
  color: rgba(0, 0, 0, 0.65);
  padding: 10px 10px 0;
  font-weight: 500;
  margin-bottom: 4px;
}

.frame-upload {
  padding: 10px;
  margin: 2px;
  max-height: 80vh;
  overflow-y: auto;
}

.fade-msg-enter-active,
.fade-msg-leave-active {
  transition: opacity 200ms ease;
}

.fade-msg-enter-from,
.fade-msg-leave-to {
  opacity: 0;
}
</style>
