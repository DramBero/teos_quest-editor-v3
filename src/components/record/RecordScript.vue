<template>
  <div class="record-script">
    <!-- Tab Bar -->
    <ScriptTabBar @renamed="onTabRenamed" />

    <!-- Toolbar (visible when a tab is active) -->
    <div v-if="activeTab" class="record-script__header">
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
            :disabled="!activeTab?.isDirty"
            title="Save changes (Ctrl+S)"
            @click.stop="saveScript"
          >
            Save
          </button>
          <button
            type="button"
            class="record-script__action-btn record-script__action-btn_startup"
            :class="{ 'record-script__action-btn_startup-active': isStartScript }"
            :title="isStartScript ? 'Remove from startup scripts' : 'Add as startup script'"
            @click.stop="toggleStartScript"
          >
            ⚡ Startup
          </button>
          <button
            v-if="isActiveEntry"
            type="button"
            class="record-script__action-btn record-script__action-btn_delete"
            title="Delete this script"
            @click.stop="deleteScript"
          >
            🗑
          </button>
        </div>
      </div>
    </div>

    <!-- CM6 Editor -->
    <div v-show="activeTab" ref="editorContainer" class="record-script__editor" />

    <!-- Empty state when no tabs -->
    <div v-if="!activeTab" class="record-script__empty">
      <span>Open a script from the sidebar</span>
    </div>

    <!-- Diagnostics panel -->
    <div v-if="activeTab && diagnostics.length > 0" class="record-script__diagnostics">
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
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';
import { lintGutter } from '@codemirror/lint';
import { acceptCompletion } from '@codemirror/autocomplete';

import { useScriptTabs } from '@/stores/scriptTabs';
import { modifyEntry, addEntry, deleteEntry } from '@/api/import-export';
import { parseForDiagnostics } from '@/mwscript';
import type { Diagnostic } from '@/mwscript';
import { compile } from '@/mwscript/codegen';
import { buildScriptRecord } from '@/mwscript/serializer';
import { loadGlobals } from '@/mwscript/globals';
import type { BaseEntry } from '@/types/pluginEntries';
import { mwscript } from '@/mwscript/cm6-mwscript';
import { vscodeDarkExtensions } from '@/mwscript/cm6-theme';
import { getActiveDB } from '@/api/db';
import { logger } from '@/services/logger';
import ScriptTabBar from './ScriptTabBar.vue';

// ---------- Stores ----------

const scriptTabsStore = useScriptTabs();
const activeTab = computed(() => scriptTabsStore.activeTab);

// ---------- Per-session state ----------

const diagnostics = ref<Diagnostic[]>([]);
const editorContainer = ref<HTMLElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const compileStatus = ref<'idle' | 'ok' | 'error'>('idle');
const needsCompile = ref(false);
const isStartScript = ref(false);
const isActiveEntry = computed(() => !!(activeTab.value?.entry as Record<string, unknown> | undefined)?.TMP_is_active);
let compileStatusTimer: ReturnType<typeof setTimeout> | null = null;

/** Track which tab the editor currently shows, to avoid redundant dispatches */
let currentEditorTabId: string | null = null;

const diagnosticCounts = computed(() => {
  let errors = 0;
  let warnings = 0;
  for (const d of diagnostics.value) {
    if (d.severity === 'error') errors++;
    else if (d.severity === 'warning') warnings++;
  }
  return { errors, warnings };
});

// ---------- Editor ----------

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
      search(),
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
          // Update tab store with current code
          if (scriptTabsStore.activeTabId) {
            scriptTabsStore.updateTabCode(scriptTabsStore.activeTabId, code);
          }
          // Track compile state
          needsCompile.value = true;
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
  // Create the editor with empty content initially
  const tab = activeTab.value;
  const initialCode = tab ? tab.unsavedCode : '';
  currentEditorTabId = tab?.id ?? null;
  createEditor(initialCode);

  if (initialCode) {
    diagnostics.value = parseForDiagnostics(initialCode);
  }
  if (tab) {
    checkIsStartScript();
  }
});

onBeforeUnmount(() => {
  editorView.value?.destroy();
  if (parseTimer) clearTimeout(parseTimer);
});

// ---------- Tab switching ----------

watch(() => scriptTabsStore.activeTabId, (newTabId, oldTabId) => {
  const view = editorView.value;
  if (!view) return;
  if (newTabId === currentEditorTabId) return;

  const newTab = scriptTabsStore.activeTab;
  if (!newTab) {
    // No active tab — clear editor
    const currentCode = view.state.doc.toString();
    if (currentCode) {
      view.dispatch({
        changes: { from: 0, to: currentCode.length, insert: '' },
      });
    }
    currentEditorTabId = null;
    diagnostics.value = [];
    needsCompile.value = false;
    compileStatus.value = 'idle';
    return;
  }

  // Swap editor content to the new tab's code
  const newCode = newTab.unsavedCode;
  const currentCode = view.state.doc.toString();

  currentEditorTabId = newTabId;

  if (newCode !== currentCode) {
    view.dispatch({
      changes: { from: 0, to: currentCode.length, insert: newCode },
    });
  }

  diagnostics.value = newCode ? parseForDiagnostics(newCode) : [];
  needsCompile.value = true;
  compileStatus.value = 'idle';
  if (compileStatusTimer) clearTimeout(compileStatusTimer);

  // Re-check startup status for new script
  checkIsStartScript();

  // Focus the editor
  nextTick(() => view.focus());
});

// ---------- Rename callback ----------

function onTabRenamed(oldId: string, newId: string) {
  // After rename, need to update Begin line in the editor if it's the active tab
  const view = editorView.value;
  if (!view || scriptTabsStore.activeTabId !== newId) return;

  const code = view.state.doc.toString();
  const updatedCode = code.replace(
    /^(\s*Begin\s+)\S+/im,
    `$1${newId}`
  );
  if (updatedCode !== code) {
    view.dispatch({
      changes: { from: 0, to: code.length, insert: updatedCode },
    });
  }
}

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
  const tab = activeTab.value;
  if (!view || !tab) return;

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
  needsCompile.value = false;

  // On successful compile, write bytecode/variables/header into record
  if (!hasErrors && tab.entry) {
    const record = buildScriptRecord(source, result);
    Object.assign(tab.entry, record);
  }

  // Clear flash after delay
  if (compileStatusTimer) clearTimeout(compileStatusTimer);
  compileStatusTimer = setTimeout(() => {
    compileStatus.value = 'idle';
  }, 3000);
}

async function saveScript() {
  const view = editorView.value;
  const tab = activeTab.value;
  if (!view || !tab) return;

  const source = view.state.doc.toString();
  // Persist source text back to the record object
  (tab.entry as Record<string, unknown>).text = source;

  // Mark as saved in tab store
  scriptTabsStore.markSaved(tab.id, source);

  // Persist to IndexedDB
  if ((tab.entry as Record<string, unknown>).TMP_index != null) {
    await modifyEntry(tab.entry as unknown as BaseEntry);
  }
}

// ---------- StartScript toggle ----------

async function findStartScriptFor(name: string): Promise<Record<string, unknown> | undefined> {
  try {
    const db = await getActiveDB();
    const all = await db.table('pluginData')
      .where('type')
      .equals('StartScript')
      .toArray();
    return all.find((rec: Record<string, unknown>) =>
      rec.script === name || rec.id === name
    );
  } catch (err) {
    logger.error('Script', 'StartScript query error', err);
    return undefined;
  }
}

async function checkIsStartScript() {
  const tab = activeTab.value;
  if (!tab) {
    isStartScript.value = false;
    return;
  }
  const name = tab.id;
  if (!name) {
    isStartScript.value = false;
    return;
  }
  const found = await findStartScriptFor(name);
  isStartScript.value = !!found;
}

async function toggleStartScript() {
  const tab = activeTab.value;
  if (!tab) return;
  const name = tab.id;
  if (!name) return;

  try {
    if (isStartScript.value) {
      // Remove StartScript record
      const found = await findStartScriptFor(name);
      if (found) {
        await deleteEntry(found as unknown as BaseEntry);
      }
      isStartScript.value = false;
    } else {
      // Create StartScript record
      await addEntry({
        type: 'StartScript',
        id: name,
        script: name,
        TMP_id: name,
      } as unknown as Partial<BaseEntry>);
      isStartScript.value = true;
    }
  } catch (err) {
    logger.error('Script', 'StartScript toggle error', err);
  }
}

async function deleteScript() {
  const tab = activeTab.value;
  if (!tab) return;
  const name = tab.id;
  if (!confirm(`Delete script "${name}"? This cannot be undone.`)) return;
  try {
    await deleteEntry(tab.entry as unknown as BaseEntry);
    scriptTabsStore.closeTab(tab.id);
  } catch (err) {
    logger.error('Script', 'Script delete error', err);
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

  // Header / Toolbar
  &__header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 6px 16px;
    background: rgba(170, 169, 98, 0.06);
    border-bottom: 1px solid rgba(170, 169, 98, 0.15);
    flex-shrink: 0;
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

    &_startup {
      opacity: 0.5;
      transition: all 0.2s ease;

      &:hover {
        opacity: 0.8;
      }

      &-active {
        opacity: 1;
        border-color: rgba(255, 200, 50, 0.6);
        color: #ffc832;
        background: rgba(255, 200, 50, 0.15);
        box-shadow: 0 0 8px rgba(255, 200, 50, 0.2);

        &:hover {
          background: rgba(255, 200, 50, 0.25);
        }
      }
    }

    &_delete {
      opacity: 0.5;
      &:hover {
        opacity: 1;
        border-color: rgba(255, 80, 80, 0.5);
        color: #ff6b6b;
        background: rgba(255, 80, 80, 0.1);
      }
    }
  }

  // Empty state
  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(216, 216, 216, 0.25);
    font-family: 'Pelagiad', serif;
    font-size: 18px;
    font-style: italic;
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
