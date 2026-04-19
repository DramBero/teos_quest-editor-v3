<template>
  <div class="frame-upload">
    <h2 class="modal__title">{{ isCreateMode ? 'New Plugin' : 'Edit Plugin Header' }}</h2>

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
              :disabled="!isCreateMode"
              required
            />
          </label>
          <div class="header-edit__type-toggle">
            <button
              class="header-edit__type-btn"
              :class="{ 'header-edit__type-btn--active': fileType === 'Esp' }"
              :disabled="!isCreateMode"
              @click="fileType = 'Esp'"
            >
              ESP
            </button>
            <button
              class="header-edit__type-btn"
              :class="{ 'header-edit__type-btn--active': fileType === 'Esm' }"
              :disabled="!isCreateMode"
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
            <div class="header-edit__dep-actions">
              <button
                class="header-edit__dep-btn header-edit__dep-btn_edit"
                title="Replace with file"
                @click="triggerReplace(i)"
              >✎</button>
              <button
                class="header-edit__dep-btn header-edit__dep-btn_remove"
                title="Remove"
                @click="removeDep(i)"
              >×</button>
            </div>
          </div>
        </div>
        <p v-else class="header-edit__empty">No master files</p>

        <button class="header-edit__dep-add" @click="triggerAdd">
          + Add master file
        </button>

        <!-- hidden file inputs -->
        <input
          ref="fileInputAdd"
          type="file"
          style="display:none"
          @change="onFileAdd"
        />
        <input
          ref="fileInputReplace"
          type="file"
          style="display:none"
          @change="onFileReplace"
        />
      </div>

      <!-- Record count (read-only info, only in edit mode) -->
      <div class="header-edit__info" v-if="!isCreateMode">
        <span class="header-edit__info-item">
          Records: <strong>{{ numObjects }}</strong>
        </span>
        <span class="header-edit__info-item" v-if="fileType">
          Format: <strong>{{ fileType === 'Esm' ? 'Elder Scrolls Master' : 'Elder Scrolls Plugin' }}</strong>
        </span>
      </div>

      <!-- Actions -->
      <div class="header-edit__actions">
        <button class="modal-button header-edit__save" @click="saveHeader" :disabled="saving || !pluginName">
          {{ saving ? (isCreateMode ? 'Creating...' : 'Saving...') : (isCreateMode ? 'Create Plugin' : 'Save') }}
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
import { ref, watch, nextTick, toRaw, computed } from 'vue';
import { usePluginHeader } from '@/stores/pluginHeader';
import { usePrimaryModal } from '@/stores/modals';
import { useSessionStore } from '@/stores/session';
import { useReloadTrigger } from '@/stores/reloadTrigger';
import { updateHeader, createBlankPlugin, invalidateDependencyCache } from '@/api/idb';
import { logger } from '@/services/logger';

const headerStore = usePluginHeader();
const primaryModalStore = usePrimaryModal();
const sessionStore = useSessionStore();
const reloadTriggerStore = useReloadTrigger();

const isCreateMode = computed(() => primaryModalStore.activeModal === 'CreatePlugin');

const loaded = ref(false);
const saving = ref(false);
const saved = ref(false);

// Editable fields
const pluginName = ref('');
const fileType = ref<'Esp' | 'Esm'>('Esm');
const version = ref<number>(1.0);
const author = ref('');
const description = ref('');
const dependencies = ref<Array<[string, number]>>([]);
const numObjects = ref(0);

// --- Dependency editing ---
const fileInputAdd = ref<HTMLInputElement | null>(null);
const fileInputReplace = ref<HTMLInputElement | null>(null);
let replaceIndex = -1;

function triggerAdd() {
  fileInputAdd.value!.value = '';
  fileInputAdd.value!.click();
}

function triggerReplace(i: number) {
  replaceIndex = i;
  fileInputReplace.value!.value = '';
  fileInputReplace.value!.click();
}

function removeDep(i: number) {
  dependencies.value.splice(i, 1);
}

function onFileAdd(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  dependencies.value.push([file.name, file.size]);
}

function onFileReplace(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || replaceIndex < 0) return;
  dependencies.value[replaceIndex] = [file.name, file.size];
  replaceIndex = -1;
}

watch(
  () => headerStore.pluginHeader,
  async (header) => {
    // In create mode, show the blank form immediately; don't load existing data
    if (isCreateMode.value) {
      pluginName.value = '';
      fileType.value = 'Esm';
      version.value = 1.0;
      author.value = '';
      description.value = '';
      dependencies.value = [];
      numObjects.value = 0;
      loaded.value = true;
      return;
    }
    if (!header) return;

    pluginName.value = header.TMP_dep || '';
    fileType.value = header.file_type || 'Esp';
    version.value = header.version != null ? parseFloat(header.version.toFixed(2)) : 1.0;
    author.value = header.author || '';
    description.value = header.description || '';
    dependencies.value = header.masters ? structuredClone(toRaw(header.masters)) : [];
    numObjects.value = header.num_objects ?? 0;

    await nextTick();
    loaded.value = true;
  },
  { immediate: true },
);

async function saveHeader() {
  saving.value = true;
  saved.value = false;

  try {
    if (isCreateMode.value) {
      // Strip any existing extension, always append lowercase ext from the toggle
      const rawName = pluginName.value.trim() || 'NewPlugin';
      const baseName = rawName.replace(/\.(esp|esm)$/i, '');
      const ext = fileType.value === 'Esm' ? '.esm' : '.esp';
      const fileName = baseName + ext;

      const { header } = await createBlankPlugin({
        fileName,
        fileType: fileType.value,
        version: version.value,
        author: author.value,
        description: description.value,
        masters: JSON.parse(JSON.stringify(toRaw(dependencies.value))),
      });

      // Create session (size = 0 for new plugin)
      await sessionStore.createSession(fileName, 0, []);

      // Sync header store with the object we already have (no DB roundtrip needed)
      invalidateDependencyCache();
      headerStore.setPluginHeader(header as any);

      // Open Upload modal to load master files immediately after creation
      primaryModalStore.setActiveModal('Upload');

      // Wait for Vue to propagate currentSession to all reactive consumers
      // before triggerReload destroys/recreates components that query the DB
      await nextTick();
      await new Promise((r) => setTimeout(r, 50));
      await reloadTriggerStore.triggerReload();
      logger.info('Header', `New plugin "${fileName}" created`);
    } else {
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
    }
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

  &__dep-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    flex-shrink: 0;
  }

  &__dep-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 2px 7px;
    font-size: 16px;
    line-height: 1;
    transition: background 0.1s, color 0.1s;

    &_edit {
      color: rgba(0, 0, 0, 0.4);
      &:hover { background: rgba(202, 165, 96, 0.2); color: rgba(0,0,0,0.75); }
    }

    &_remove {
      color: rgba(180, 50, 50, 0.5);
      font-size: 20px;
      &:hover { background: rgba(180, 50, 50, 0.1); color: rgba(180, 50, 50, 0.9); }
    }
  }

  &__dep-add {
    margin-top: 6px;
    background: transparent;
    border: 1px dashed rgba(202, 165, 96, 0.6);
    border-radius: 6px;
    color: rgba(0,0,0,0.5);
    font-family: 'Pelagiad', serif;
    font-size: 16px;
    padding: 6px 12px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 0.1s, color 0.1s;

    &:hover {
      background: rgba(202, 165, 96, 0.1);
      color: rgba(0,0,0,0.75);
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
