<template>
  <div class="text-reader__wrapper" :class="{ 'text-reader__wrapper--dep': dep }">
    <!-- Status badge -->
    <span
      class="text-reader__badge"
      :class="depLoaded ? 'text-reader__badge--loaded' : 'text-reader__badge--missing'"
    >
      {{ loading ? '' : (depLoaded ? 'Loaded' : 'Not loaded') }}
    </span>

    <!-- Action buttons -->
    <div class="text-reader__actions">
      <label class="text-reader__btn" :title="depLoaded ? 'Change file' : 'Load file'">
        <input
          type="file"
          accept=".esp,.esm"
          @change="loadTextFromFile"
          :disabled="loading"
        />
        <TdesignUpload />
      </label>
      <button
        v-if="depLoaded"
        class="text-reader__btn text-reader__btn--danger"
        @click="handleDelete"
        :disabled="loading"
        title="Delete"
      >
        <TdesignDelete />
      </button>
    </div>

    <!-- Progress bar (full-width bottom overlay) -->
    <Transition name="progress-fade">
      <div v-if="loading" class="text-reader__progress">
        <div
          class="text-reader__progress-bar"
          :style="{ width: progressPct + '%' }"
        />
        <span class="text-reader__progress-label">{{ stage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { importPlugin, getActiveHeader, deleteDB, makePluginKey, getDependencies, initPlugin, isPluginLoaded, invalidateDependencyCache } from '@/api/idb.ts';
import { usePluginHeader } from '@/stores/pluginHeader';
import { useSessionStore } from '@/stores/session';
import { useReloadTrigger } from '@/stores/reloadTrigger';
import { useParseWorker } from '@/composables/useParseWorker';
import TdesignUpload from '~icons/tdesign/upload';
import TdesignDelete from '~icons/tdesign/delete';

interface Props {
  dep?: string;
}
const props = defineProps<Props>();

const sessionStore = useSessionStore();
const { parse, stage: workerStage, terminate } = useParseWorker();
const headerStore = usePluginHeader();
const reloadTriggerStore = useReloadTrigger();

const loading = ref(false);
const depLoaded = ref(false);
const stage = ref('');
const progressPct = ref(0);

// --- Dep loaded detection ---
async function checkLoaded() {
  try {
    const dbKey = props.dep || sessionStore.getActivePluginKey;
    if (!dbKey) { depLoaded.value = false; return; }
    depLoaded.value = await isPluginLoaded(dbKey);
  } catch {
    depLoaded.value = false;
  }
}

watch(loading, async (val) => {
  if (!val) await checkLoaded();
}, { immediate: true });

// --- Worker stage → progress mapping ---
const STAGE_PROGRESS: Record<string, number> = {
  'Reading…': 5,
  'Initializing…': 10,
  'Parsing…': 20,
};

watch(workerStage, (val) => {
  if (val) {
    stage.value = val;
    if (val in STAGE_PROGRESS) {
      progressPct.value = STAGE_PROGRESS[val];
    }
  }
});

// --- Actions ---
async function handleDelete() {
  loading.value = true;
  try {
    if (props.dep) {
      // Dep name is raw (e.g. "Morrowind.esm") but DB key includes size.
      // Look up the actual DB key from IDB.
      const prefix = `plugin_${props.dep}_`;
      if (typeof indexedDB.databases === 'function') {
        const allDbs = await indexedDB.databases();
        const match = allDbs.find(db => db.name?.startsWith(prefix));
        if (match?.name) {
          await deleteDB(match.name);
        }
      } else {
        // Fallback: delete by raw name (legacy)
        await deleteDB(props.dep);
      }
    } else if (sessionStore.getActivePluginKey) {
      await deleteDB(sessionStore.getActivePluginKey);
    }
  } finally {
    loading.value = false;
  }
}

async function loadTextFromFile(event: Event) {
  try {
    stage.value = 'Reading…';
    progressPct.value = 0;
    loading.value = true;

    const element = event.target as HTMLInputElement;
    if (!element.files?.length) return;
    const file = element.files[0];
    const fileName = file.name;

    // 1. Read file
    const buffer = await file.arrayBuffer();
    progressPct.value = 5;

    // 2. Parse via Web Worker (off main thread)
    const objects = await parse(buffer);
    progressPct.value = 30;

    // 3. Import to IDB with real chunked progress (30%→90%)
    const pluginKey = makePluginKey(fileName, file.size);

    const onImportProgress = (ratio: number) => {
      stage.value = 'Writing…';
      progressPct.value = 30 + Math.round(ratio * 60);
    };

    if (!props.dep) {
      await importPlugin(objects, pluginKey, fileName, true, onImportProgress);
      progressPct.value = 92;
      stage.value = 'Finalizing…';

      await sessionStore.createSession(fileName, file.size, []);
      const deps = await getDependencies();
      for (const dep of deps) {
        await initPlugin(dep);
      }
      if (deps.length) {
        await sessionStore.createSession(fileName, file.size, deps);
      }

      const headerResponse = await getActiveHeader();
      headerStore.setPluginHeader(headerResponse);
    } else {
      const depKey = makePluginKey(props.dep, file.size);
      await importPlugin(objects, depKey, props.dep, false, onImportProgress);
      // Open the dep DB in memory so queryAcrossPlugins can see it
      await initPlugin(depKey);
      invalidateDependencyCache();
    }

    progressPct.value = 100;
    reloadTriggerStore.triggerReload();

    // Reset input so the same file can be re-selected
    element.value = '';
  } catch (error) {
    console.error(error);
  } finally {
    stage.value = '';
    progressPct.value = 0;
    loading.value = false;
  }
}

onUnmounted(() => {
  terminate();
});
</script>

<style lang="scss">
input[type='file'] {
  display: none;
}

.text-reader {
  &__wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    min-height: 42px;
    overflow: hidden;
    border-radius: 4px;
  }

  &__badge {
    font-size: 13px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
    min-width: 72px;
    text-align: center;

    &--loaded {
      color: #2e6a30;
      background: rgba(46, 106, 48, 0.12);
    }
    &--missing {
      color: #8b4513;
      background: rgba(139, 69, 19, 0.10);
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
    z-index: 1;
    min-width: 70px;
    justify-content: flex-end;
  }

  &__btn {
    cursor: pointer;
    background: rgba(0, 0, 0, 0.65);
    color: rgb(202, 165, 96);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7px;
    border-radius: 4px;
    border: none;
    font-size: 16px;
    font-family: inherit;
    transition: all 80ms ease;
    white-space: nowrap;
    min-width: 32px;
    min-height: 32px;

    &:hover {
      color: white;
    }

    &--danger {
      color: #c44;

      &:hover {
        color: #ff6666;
        background: rgba(139, 30, 30, 0.7);
      }
    }

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  // --- Progress bar ---
  &__progress {
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    height: 100%;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  &__progress-bar {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, rgba(202, 165, 96, 0.20), rgba(202, 165, 96, 0.35));
    border-radius: 4px;
    transition: width 150ms ease;
  }

  &__progress-label {
    position: relative;
    z-index: 1;
    padding-left: 10px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.5);
    font-style: italic;
  }
}

// Transition
.progress-fade-enter-active,
.progress-fade-leave-active {
  transition: opacity 200ms ease;
}
.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
}
</style>
