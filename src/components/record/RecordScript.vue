<template>
  <div class="record-script">
    <!-- Header -->
    <div class="record-script__header">
      <div class="record-script__title">
        <span>{{ scriptName }}</span>
      </div>
      <div class="record-script__meta">
        <span v-if="diagnosticCounts.errors > 0" class="record-script__badge record-script__badge_error">
          {{ diagnosticCounts.errors }} {{ diagnosticCounts.errors === 1 ? 'error' : 'errors' }}
        </span>
        <span v-if="diagnosticCounts.warnings > 0" class="record-script__badge record-script__badge_warning">
          {{ diagnosticCounts.warnings }} {{ diagnosticCounts.warnings === 1 ? 'warning' : 'warnings' }}
        </span>
        <span v-if="diagnostics.length === 0 && !needsCompile" class="record-script__badge record-script__badge_ok">
          OK
        </span>
        <span v-if="needsCompile" class="record-script__badge record-script__badge_modified">
          Modified
        </span>

        <div class="record-script__actions">
          <button
            type="button"
            class="record-script__action-btn"
            :class="{ 'record-script__action-btn_success': compileStatus === 'ok', 'record-script__action-btn_error': compileStatus === 'error' }"
            title="Compile script (Ctrl+B)"
            @click.stop="compileScript"
          >
            Compile
          </button>
          <button
            type="button"
            class="record-script__action-btn record-script__action-btn_save"
            :disabled="!isDirty"
            title="Save changes (Ctrl+S)"
            @click.stop="saveScript"
          >
            Save
          </button>
        </div>

        <button
          type="button"
          class="record-script__close-btn"
          title="Close script"
          @click.stop="closeScript"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- CM6 Editor -->
    <div ref="editorContainer" class="record-script__editor" />

    <!-- Diagnostics panel -->
    <div v-if="diagnostics.length > 0" class="record-script__diagnostics">
      <div class="record-script__diagnostics-header">
        Problems ({{ diagnostics.length }})
      </div>
      <div class="record-script__diagnostics-list">
        <div
          v-for="(d, i) in diagnostics"
          :key="i"
          class="record-script__diagnostic"
          :class="{
            'record-script__diagnostic_error': d.severity === 'error',
            'record-script__diagnostic_warning': d.severity === 'warning',
          }"
          @click="goToLine(d.line)"
        >
          <span class="record-script__diagnostic-loc">
            {{ d.line }}:{{ d.column }}
          </span>
          <span class="record-script__diagnostic-msg">
            {{ d.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintGutter } from '@codemirror/lint';
import { acceptCompletion } from '@codemirror/autocomplete';

import { useSelectedRecord } from '@/stores/selectedRecord';
import { modifyEntry } from '@/api/import-export';
import { parseForDiagnostics } from '@/mwscript';
import type { Diagnostic } from '@/mwscript';
import { compile } from '@/mwscript/codegen';
import { buildScriptRecord } from '@/mwscript/serializer';
import { loadGlobals } from '@/mwscript/globals';
import type { BaseEntry } from '@/types/pluginEntries';
import { mwscript } from '@/mwscript/cm6-mwscript';
import { vscodeDarkExtensions } from '@/mwscript/cm6-theme';

// ---------- Data ----------

const selectedRecordStore = useSelectedRecord();

function closeScript() {
  selectedRecordStore.setSelectedRecord(null);
}

const entry = computed(() => {
  const records = selectedRecordStore.getSelectedRecord;
  return records?.[0] as Record<string, unknown> | undefined;
});

const scriptName = computed(() => {
  const e = entry.value;
  if (!e) return 'Script';
  return (e.id as string) || 'Script';
});

const diagnostics = ref<Diagnostic[]>([]);
const editorContainer = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const compileStatus = ref<'idle' | 'ok' | 'error'>('idle');
const isDirty = ref(false);
const needsCompile = ref(false);
const savedCode = ref('');
const lastCompiledCode = ref('');
let compileStatusTimer: ReturnType<typeof setTimeout> | null = null;

const diagnosticCounts = computed(() => {
  let errors = 0;
  let warnings = 0;
  for (const d of diagnostics.value) {
    if (d.severity === 'error') errors++;
    else if (d.severity === 'warning') warnings++;
  }
  return { errors, warnings };
});

// Theme imported from @/mwscript/cm6-theme

// ---------- Init ----------

function createEditor(initialCode: string) {
  if (!editorContainer.value) return;

  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        { key: 'Tab', run: acceptCompletion },
        { key: 'Mod-b', run: () => { compileScript(); return true; } },
        { key: 'Mod-s', run: () => { saveScript(); return true; } },
        indentWithTab,
      ]),
      mwscript(),
      lintGutter(),
      ...vscodeDarkExtensions,
      EditorView.lineWrapping,
      EditorState.tabSize.of(4),
      // Listen for changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const code = update.state.doc.toString();
          debouncedParse(code);
          // Track dirty state
          isDirty.value = code !== savedCode.value;
          // Track compile state
          needsCompile.value = code !== lastCompiledCode.value;
          // Reset compile status flash on new edits
          if (compileStatus.value !== 'idle') {
            compileStatus.value = 'idle';
            if (compileStatusTimer) clearTimeout(compileStatusTimer);
          }
        }
      }),
    ],
  });

  editorView.value = new EditorView({
    state,
    parent: editorContainer.value,
  });
}

// Debounced parsing for diagnostics panel
let parseTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedParse(code: string) {
  if (parseTimer) clearTimeout(parseTimer);
  parseTimer = setTimeout(() => {
    diagnostics.value = parseForDiagnostics(code);
  }, 300);
}

onMounted(() => {
  const e = entry.value;
  const initialCode = (e && typeof e.text === 'string') ? e.text : '';
  savedCode.value = initialCode;
  createEditor(initialCode);

  // Initial parse
  if (initialCode) {
    diagnostics.value = parseForDiagnostics(initialCode);
  }
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
  if (parseTimer) clearTimeout(parseTimer);
});

// Watch for sidebar script changes — update editor content
watch(entry, (newEntry) => {
  const view = editorView.value;
  if (!view || !newEntry) return;
  const newCode = (typeof newEntry.text === 'string') ? newEntry.text : '';
  const currentCode = view.state.doc.toString();

  // Reset state for new script
  savedCode.value = newCode;
  lastCompiledCode.value = '';  // unknown compile state
  isDirty.value = false;
  needsCompile.value = true;    // new script hasn't been compiled in this session
  compileStatus.value = 'idle';
  if (compileStatusTimer) clearTimeout(compileStatusTimer);

  if (newCode !== currentCode) {
    view.dispatch({
      changes: { from: 0, to: currentCode.length, insert: newCode },
    });
    diagnostics.value = newCode ? parseForDiagnostics(newCode) : [];
  }
});

// ---------- Navigation ----------

function goToLine(line: number) {
  const view = editorView.value;
  if (!view) return;
  const lineCount = view.state.doc.lines;
  const clampedLine = Math.min(Math.max(line, 1), lineCount);
  const lineObj = view.state.doc.line(clampedLine);
  view.dispatch({
    selection: { anchor: lineObj.from },
    scrollIntoView: true,
  });
  view.focus();
}

// ---------- Compile & Save ----------

async function compileScript() {
  const view = editorView.value;
  if (!view) return;

  const source = view.state.doc.toString();
  const globals = await loadGlobals();
  const result = compile(source, globals);

  // Merge parse errors and codegen errors into diagnostics
  const allErrors = [
    ...result.parseErrors,
    ...result.errors.map((msg: string) => ({
      line: 1,
      column: 1,
      severity: 'error' as const,
      message: msg,
    })),
  ];
  diagnostics.value = allErrors;

  // Update compile state
  const hasErrors = allErrors.some(d => d.severity === 'error');
  compileStatus.value = hasErrors ? 'error' : 'ok';
  lastCompiledCode.value = source;
  needsCompile.value = false;

  // On successful compile, write bytecode/variables/header into record
  if (!hasErrors && entry.value) {
    const record = buildScriptRecord(source, result);
    Object.assign(entry.value, record);
  }

  // Clear flash after delay
  if (compileStatusTimer) clearTimeout(compileStatusTimer);
  compileStatusTimer = setTimeout(() => {
    compileStatus.value = 'idle';
  }, 3000);
}

async function saveScript() {
  const view = editorView.value;
  if (!view || !entry.value) return;

  const source = view.state.doc.toString();
  // Persist source text back to the record object
  (entry.value as Record<string, unknown>).text = source;
  savedCode.value = source;
  isDirty.value = false;

  // Persist to IndexedDB
  if ((entry.value as Record<string, unknown>).TMP_index != null) {
    await modifyEntry(entry.value as unknown as BaseEntry);
  }
}
</script>

<style lang="scss">
.record-script {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  border: 1px solid rgba(170, 169, 98, 0.3);
  border-radius: 8px;
  overflow: hidden;

  // Header
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: rgba(170, 169, 98, 0.1);
    border-bottom: 1px solid rgba(170, 169, 98, 0.2);
    flex-shrink: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgb(237, 238, 167);
    font-size: 18px;
    font-weight: 600;
    font-family: 'Fira Code', monospace;
  }

  &__meta {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__badge {
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;

    &_error {
      background: rgba(255, 80, 80, 0.2);
      color: #ff6b6b;
    }
    &_warning {
      background: rgba(255, 200, 50, 0.2);
      color: #ffc832;
    }
    &_ok {
      background: rgba(80, 200, 120, 0.2);
      color: #50c878;
    }
    &_modified {
      background: rgba(255, 165, 0, 0.2);
      color: #ffaa33;
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
    margin-left: 8px;
  }

  &__action-btn {
    background: rgba(170, 169, 98, 0.15);
    border: 1px solid rgba(170, 169, 98, 0.3);
    color: rgba(237, 238, 167, 0.8);
    font-size: 12px;
    font-weight: 500;
    font-family: 'Fira Code', monospace;
    cursor: pointer;
    padding: 3px 12px;
    border-radius: 4px;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &:hover {
      background: rgba(170, 169, 98, 0.3);
      color: rgb(237, 238, 167);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &_success {
      border-color: rgba(80, 200, 120, 0.5);
      color: #50c878;
      background: rgba(80, 200, 120, 0.1);
    }

    &_error {
      border-color: rgba(255, 80, 80, 0.5);
      color: #ff6b6b;
      background: rgba(255, 80, 80, 0.1);
    }

    &_save {
      &:not(:disabled):hover {
        border-color: rgba(100, 180, 255, 0.5);
        color: #64b4ff;
        background: rgba(100, 180, 255, 0.1);
      }
    }
  }

  &__close-btn {
    background: none;
    border: none;
    color: rgba(237, 238, 167, 0.5);
    font-size: 18px;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
    border-radius: 4px;
    margin-left: 4px;
    transition: all 0.15s;

    &:hover {
      color: #ff6b6b;
      background: rgba(255, 80, 80, 0.15);
    }
  }

  // Editor — CM6 container
  &__editor {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .cm-editor {
      height: 100%;
    }

    .cm-scroller {
      overflow: auto;
    }
  }

  // Diagnostics panel
  &__diagnostics {
    max-height: 200px;
    border-top: 1px solid rgba(170, 169, 98, 0.2);
    background: rgba(0, 0, 0, 0.3);
    flex-shrink: 0;

    &-header {
      padding: 6px 16px;
      font-size: 14px;
      font-weight: 600;
      color: rgb(170, 169, 98);
      background: rgba(170, 169, 98, 0.08);
      border-bottom: 1px solid rgba(170, 169, 98, 0.15);
    }

    &-list {
      overflow-y: auto;
      max-height: 160px;
    }
  }

  &__diagnostic {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 4px 16px;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    &_error {
      color: #ff6b6b;
    }
    &_warning {
      color: #ffc832;
    }

    &-loc {
      color: rgba(255, 255, 255, 0.4);
      min-width: 50px;
      font-size: 13px;
    }

    &-msg {
      flex: 1;
    }
  }
}
</style>
