<template>
  <div class="ai-msg" :class="'ai-msg--' + message.role">
    <!-- User message -->
    <div v-if="message.role === 'user'" class="ai-msg__user">
      <TdesignUser class="ai-msg__avatar" />
      <div class="ai-msg__text">{{ message.content }}</div>
    </div>

    <!-- Assistant message -->
    <div v-else-if="message.role === 'assistant'" class="ai-msg__assistant">
      <GameIconsGears class="ai-msg__avatar" />
      <div class="ai-msg__content">
        <div ref="markdownEl" v-html="renderedHtml" class="ai-msg__markdown" />
      </div>
    </div>

    <!-- Tool call indicator -->
    <div v-else-if="message.role === 'tool'" class="ai-msg__tool">
      <div class="ai-msg__tool-header" @click="toolExpanded = !toolExpanded">
        <TdesignTools class="ai-msg__tool-icon" />
        <span class="ai-msg__tool-name">{{ toolName }}</span>
        <TdesignChevronDown v-if="toolExpanded" class="ai-msg__tool-toggle" />
        <TdesignChevronRight v-else class="ai-msg__tool-toggle" />
      </div>
      <div v-if="toolExpanded" class="ai-msg__tool-body">
        <pre>{{ message.content }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUpdated, nextTick, watch } from 'vue';
import { renderMarkdown } from '@/ai/markdown';
import { useScriptTabs } from '@/stores/scriptTabs';
import {
  parseJournalBlock,
  parseDialogueBlock,
  insertJournal,
  insertDialogue,
  type AiJournalData,
  type AiDialogueData,
} from '@/ai/ai-insert';
import TdesignUser from '~icons/tdesign/user';
import GameIconsGears from '~icons/game-icons/gears';
import TdesignTools from '~icons/tdesign/tools';
import TdesignChevronDown from '~icons/tdesign/chevron-down';
import TdesignChevronRight from '~icons/tdesign/chevron-right';

interface MessageProp {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

const props = defineProps<{
  message: MessageProp;
}>();

const markdownEl = ref<HTMLElement | null>(null);
const toolExpanded = ref(false);
const toolName = computed(() => props.message.toolName || 'tool');
const scriptTabsStore = useScriptTabs();

const renderedHtml = computed(() => {
  if (props.message.role !== 'assistant') return '';
  try {
    return renderMarkdown(props.message.content || '');
  } catch {
    return props.message.content;
  }
});

// ---------------------------------------------------------------------------
//  Card HTML builders
// ---------------------------------------------------------------------------

function buildJournalCardHtml(data: AiJournalData): string {
  const entriesHtml = data.entries.map(e => `
    <div class="teos-card__entry">
      <span class="teos-card__badge">${e.index}</span>
      <span class="teos-card__entry-text">${escHtml(e.text)}</span>
      ${e.finished ? '<span class="teos-card__finished">✓ Finished</span>' : ''}
    </div>
  `).join('');

  return `
    <div class="teos-card teos-card--journal" data-teos-type="journal">
      <div class="teos-card__header">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
        <span class="teos-card__title">${escHtml(data.questName)}</span>
        <span class="teos-card__id">${escHtml(data.questId)}</span>
      </div>
      <div class="teos-card__body">${entriesHtml}</div>
      <div class="teos-card__actions">
        <button class="teos-card__btn teos-card__btn--insert" data-teos-action="insert-journal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Insert Quest
        </button>
      </div>
    </div>
  `;
}

function buildDialogueCardHtml(data: AiDialogueData): string {
  const entriesHtml = data.entries.map(e => {
    const filtersHtml = (e.filters || []).map(f => {
      const label = f.comp ? `${f.type}: ${f.id} ${f.comp} ${f.value}` : `${f.type}: ${f.id}`;
      return `<span class="teos-card__filter">${escHtml(label)}</span>`;
    }).join('');

    return `
      <div class="teos-card__dialogue-entry">
        ${e.speaker_id ? `<div class="teos-card__speaker">${escHtml(e.speaker_id)}</div>` : ''}
        <div class="teos-card__dialogue-text">${escHtml(e.text)}</div>
        ${filtersHtml ? `<div class="teos-card__filters">${filtersHtml}</div>` : ''}
        ${e.result ? `<div class="teos-card__result"><code>${escHtml(e.result)}</code></div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="teos-card teos-card--dialogue" data-teos-type="dialogue">
      <div class="teos-card__header">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        <span class="teos-card__title">${escHtml(data.topic)}</span>
        <span class="teos-card__type">${escHtml(data.type)}</span>
      </div>
      <div class="teos-card__body">${entriesHtml}</div>
      <div class="teos-card__actions">
        <button class="teos-card__btn teos-card__btn--insert" data-teos-action="insert-dialogue">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Insert Dialogue
        </button>
      </div>
    </div>
  `;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Store parsed data for insert handlers
const parsedBlocks = new Map<HTMLElement, AiJournalData | AiDialogueData>();

// ---------------------------------------------------------------------------
//  DOM injection
// ---------------------------------------------------------------------------

function injectCodeBlockActions() {
  const el = markdownEl.value;
  if (!el) return;

  const preBlocks = el.querySelectorAll('pre');
  preBlocks.forEach((pre) => {
    // Skip if already injected
    if (pre.querySelector('.ai-code-actions') || pre.querySelector('.teos-card')) return;

    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    const codeText = codeEl.textContent || '';
    const langClass = codeEl.className || '';

    // Check for teos-journal block
    if (langClass.includes('teos-journal') || langClass.includes('language-teos-journal')) {
      const data = parseJournalBlock(codeText);
      if (data) {
        const card = document.createElement('div');
        card.innerHTML = buildJournalCardHtml(data);
        const cardEl = card.firstElementChild as HTMLElement;
        parsedBlocks.set(cardEl, data);
        pre.replaceWith(cardEl);

        // Bind insert button
        const btn = cardEl.querySelector('[data-teos-action="insert-journal"]');
        btn?.addEventListener('click', () => handleInsertJournal(btn as HTMLElement, data));
        return;
      }
    }

    // Check for teos-dialogue block
    if (langClass.includes('teos-dialogue') || langClass.includes('language-teos-dialogue')) {
      const data = parseDialogueBlock(codeText);
      if (data) {
        const card = document.createElement('div');
        card.innerHTML = buildDialogueCardHtml(data);
        const cardEl = card.firstElementChild as HTMLElement;
        parsedBlocks.set(cardEl, data);
        pre.replaceWith(cardEl);

        // Bind insert button
        const btn = cardEl.querySelector('[data-teos-action="insert-dialogue"]');
        btn?.addEventListener('click', () => handleInsertDialogue(btn as HTMLElement, data));
        return;
      }
    }

    // Regular code block — existing logic
    const actionsBar = document.createElement('div');
    actionsBar.className = 'ai-code-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'ai-code-actions__btn';
    copyBtn.title = 'Copy code';
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg><span>Copy</span>';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeText);
        const span = copyBtn.querySelector('span');
        if (span) {
          span.textContent = 'Copied';
          setTimeout(() => { span.textContent = 'Copy'; }, 1500);
        }
      } catch {
        const ta = document.createElement('textarea');
        ta.value = codeText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    });
    actionsBar.appendChild(copyBtn);

    // "Insert as Script" button
    const looksLikeMwScript = /\b(begin|Begin|BEGIN)\s+\w/i.test(codeText);
    if (looksLikeMwScript) {
      const insertBtn = document.createElement('button');
      insertBtn.className = 'ai-code-actions__btn ai-code-actions__btn--primary';
      insertBtn.title = 'Create a new script tab with this code';
      insertBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg><span>Insert as Script</span>';
      insertBtn.addEventListener('click', () => {
        const nameMatch = codeText.match(/\bbegin\s+(\w+)/i);
        const scriptName = nameMatch ? nameMatch[1] : 'AIScript';
        const entry = { type: 'Script', id: scriptName, TMP_id: scriptName, text: codeText };
        scriptTabsStore.openTab(entry);
        nextTick(() => { scriptTabsStore.updateTabCode(scriptName, codeText); });
        const span = insertBtn.querySelector('span');
        if (span) {
          span.textContent = 'Inserted';
          insertBtn.classList.add('ai-code-actions__btn--done');
          setTimeout(() => {
            span.textContent = 'Insert as Script';
            insertBtn.classList.remove('ai-code-actions__btn--done');
          }, 2000);
        }
      });
      actionsBar.appendChild(insertBtn);
    }

    pre.style.position = 'relative';
    pre.appendChild(actionsBar);
  });
}

// ---------------------------------------------------------------------------
//  Insert handlers
// ---------------------------------------------------------------------------

async function handleInsertJournal(btn: HTMLElement, data: AiJournalData) {
  btn.textContent = 'Inserting...';
  btn.classList.add('teos-card__btn--loading');

  const result = await insertJournal(data);

  if (result.success) {
    btn.textContent = '✓ Inserted';
    btn.classList.remove('teos-card__btn--loading');
    btn.classList.add('teos-card__btn--done');
  } else {
    btn.textContent = '✗ Error';
    btn.classList.remove('teos-card__btn--loading');
    btn.classList.add('teos-card__btn--error');
    btn.title = result.message;
    setTimeout(() => {
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Insert Quest';
      btn.classList.remove('teos-card__btn--error');
    }, 3000);
  }
}

async function handleInsertDialogue(btn: HTMLElement, data: AiDialogueData) {
  btn.textContent = 'Copying...';
  btn.classList.add('teos-card__btn--loading');

  const result = await insertDialogue(data);

  if (result.success) {
    btn.textContent = '✓ Copied';
    btn.classList.remove('teos-card__btn--loading');
    btn.classList.add('teos-card__btn--done');
    setTimeout(() => {
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Insert Dialogue';
      btn.classList.remove('teos-card__btn--done');
    }, 3000);
  }
}

watch(renderedHtml, () => {
  nextTick(injectCodeBlockActions);
});

onMounted(() => {
  nextTick(injectCodeBlockActions);
});

onUpdated(() => {
  nextTick(injectCodeBlockActions);
});
</script>

<style lang="scss">
.ai-msg {
  padding: 12px 16px;
  font-size: 20px;
  line-height: 1.6;

  &--user {
    background: rgba(202, 165, 96, 0.08);
  }

  &__user, &__assistant {
    display: flex;
    gap: 10px;
  }

  &__avatar {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 3px;
    color: rgba(216, 186, 131, 0.5);
  }

  &__text {
    color: rgba(216, 216, 216, 0.9);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__markdown {
    color: rgba(216, 216, 216, 0.85);
    word-break: break-word;

    p { margin: 0 0 8px; }
    p:last-child { margin-bottom: 0; }

    h1, h2, h3 {
      color: rgb(216, 186, 131);
      margin: 12px 0 6px;
      font-family: 'Pelagiad', serif;
    }
    h1 { font-size: 26px; }
    h2 { font-size: 23px; }
    h3 { font-size: 20px; }

    code {
      background: rgba(0, 0, 0, 0.4);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
      font-size: 17px;
      color: rgb(237, 238, 167);
    }

    pre {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(170, 169, 98, 0.2);
      border-radius: 6px;
      padding: 10px 12px;
      padding-bottom: 36px; // space for action buttons
      margin: 8px 0;
      overflow-x: auto;
      position: relative;

      code {
        background: none;
        padding: 0;
        display: block;
        white-space: pre;
        color: rgba(216, 216, 216, 0.9);
      }
    }

    ul, ol {
      padding-left: 20px;
      margin: 6px 0;
    }

    li { margin: 2px 0; }

    table {
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 16px;
      width: 100%;
    }

    th, td {
      border: 1px solid rgba(170, 169, 98, 0.2);
      padding: 4px 8px;
    }

    th {
      background: rgba(170, 169, 98, 0.1);
      color: rgb(216, 186, 131);
    }

    strong { color: rgb(216, 186, 131); }

    a {
      color: rgb(130, 180, 255);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    blockquote {
      border-left: 3px solid rgba(202, 165, 96, 0.4);
      padding-left: 10px;
      margin: 8px 0;
      color: rgba(216, 216, 216, 0.6);
    }

    // Strikethrough
    del {
      color: rgba(216, 216, 216, 0.4);
      text-decoration: line-through;
    }

    // Horizontal rule
    hr {
      border: none;
      border-top: 1px solid rgba(170, 169, 98, 0.3);
      margin: 16px 0;
    }

    // Task lists
    .task-list {
      list-style: none;
      padding-left: 4px;
    }

    .task-list-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 4px 0;

      input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-width: 18px;
        border: 2px solid rgba(170, 169, 98, 0.4);
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.3);
        margin-top: 3px;
        cursor: default;
        position: relative;

        &:checked {
          background: rgba(202, 165, 96, 0.25);
          border-color: rgb(202, 165, 96);

          &::after {
            content: '✓';
            position: absolute;
            top: -2px;
            left: 2px;
            font-size: 14px;
            color: rgb(216, 186, 131);
          }
        }
      }

      span {
        flex: 1;
      }
    }

    // Collapsible details
    details {
      border: 1px solid rgba(170, 169, 98, 0.2);
      border-radius: 6px;
      margin: 8px 0;
      overflow: hidden;

      summary {
        padding: 8px 12px;
        background: rgba(170, 169, 98, 0.06);
        cursor: pointer;
        color: rgb(216, 186, 131);
        font-weight: 600;
        user-select: none;
        transition: background 80ms ease;

        &:hover {
          background: rgba(170, 169, 98, 0.12);
        }

        &::marker {
          color: rgba(202, 165, 96, 0.5);
        }
      }

      .details-content {
        padding: 8px 12px;
        border-top: 1px solid rgba(170, 169, 98, 0.15);
      }
    }

    // MWScript syntax highlighting
    .mws-comment {
      color: rgba(120, 160, 120, 0.7);
      font-style: italic;
    }

    .mws-keyword {
      color: rgb(237, 178, 90);
      font-weight: 600;
    }

    .mws-type {
      color: rgb(130, 180, 255);
      font-style: italic;
    }

    .mws-builtin {
      color: rgb(200, 220, 140);
    }

    .mws-string {
      color: rgb(200, 160, 130);
    }

    .mws-number {
      color: rgb(180, 140, 220);
    }

    .mws-operator {
      color: rgb(216, 186, 131);
      font-weight: 600;
    }
  }

  // Tool call
  &__tool {
    margin: 4px 12px 4px 28px;
    border: 1px solid rgba(170, 169, 98, 0.15);
    border-radius: 6px;
    overflow: hidden;
    font-size: 17px;
  }

  &__tool-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(170, 169, 98, 0.06);
    cursor: pointer;
    user-select: none;
    color: rgba(216, 216, 216, 0.5);

    &:hover {
      background: rgba(170, 169, 98, 0.1);
      color: rgba(216, 216, 216, 0.7);
    }
  }

  &__tool-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  &__tool-name {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
  }

  &__tool-toggle {
    margin-left: auto;
    width: 12px;
    height: 12px;
  }

  &__tool-body {
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 14px;
      font-family: 'Fira Code', monospace;
      color: rgba(216, 216, 216, 0.6);
      max-height: 200px;
      overflow-y: auto;
    }
  }
}

// Code block action buttons (injected via DOM)
.ai-code-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 1px;
  background: rgba(170, 169, 98, 0.1);
  border-top: 1px solid rgba(170, 169, 98, 0.15);
  border-radius: 0 0 6px 6px;

  &__btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: none;
    border: none;
    color: rgba(216, 216, 216, 0.45);
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    cursor: pointer;
    transition: all 80ms ease;

    &:hover {
      color: rgba(216, 216, 216, 0.8);
      background: rgba(170, 169, 98, 0.08);
    }

    &--primary {
      color: rgba(202, 165, 96, 0.6);

      &:hover {
        color: rgb(216, 186, 131);
        background: rgba(202, 165, 96, 0.12);
      }
    }

    &--done {
      color: rgb(120, 200, 120) !important;
    }

    svg {
      flex-shrink: 0;
    }
  }
}

// ---------------------------------------------------------------------------
//  TEOS Cards (journal & dialogue — injected via DOM)
// ---------------------------------------------------------------------------

.teos-card {
  border-radius: 8px;
  margin: 10px 0;
  overflow: hidden;
  font-family: 'Pelagiad', serif;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 18px;
    font-weight: 600;

    svg {
      flex-shrink: 0;
      opacity: 0.7;
    }
  }

  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__id, &__type {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }

  &__body {
    padding: 6px 14px 10px;
  }

  &__actions {
    padding: 8px 14px;
    display: flex;
    gap: 8px;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: none;
    border-radius: 6px;
    font-family: 'Pelagiad', serif;
    font-size: 17px;
    cursor: pointer;
    transition: all 120ms ease;

    svg { flex-shrink: 0; }

    &--loading {
      opacity: 0.6;
      cursor: wait;
    }

    &--done {
      background: rgba(120, 200, 120, 0.15) !important;
      color: rgb(120, 200, 120) !important;
      cursor: default;
    }

    &--error {
      background: rgba(255, 100, 100, 0.15) !important;
      color: rgb(255, 120, 120) !important;
    }
  }

  // --- Journal card ---
  &--journal {
    border: 1px solid rgba(202, 165, 96, 0.3);
    background: rgba(202, 165, 96, 0.05);

    .teos-card__header {
      background: rgba(202, 165, 96, 0.08);
      color: rgb(216, 186, 131);
      border-bottom: 1px solid rgba(202, 165, 96, 0.15);
    }

    .teos-card__id {
      background: rgba(202, 165, 96, 0.12);
      color: rgba(216, 186, 131, 0.7);
    }

    .teos-card__btn--insert {
      background: rgba(202, 165, 96, 0.12);
      color: rgb(216, 186, 131);

      &:hover {
        background: rgba(202, 165, 96, 0.22);
      }
    }
  }

  &__entry {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(170, 169, 98, 0.08);

    &:last-child { border-bottom: none; }
  }

  &__badge {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 22px;
    background: rgba(202, 165, 96, 0.15);
    color: rgb(216, 186, 131);
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    font-weight: 600;
  }

  &__entry-text {
    flex: 1;
    color: rgba(216, 216, 216, 0.8);
    font-size: 17px;
    line-height: 1.5;
  }

  &__finished {
    flex-shrink: 0;
    color: rgb(120, 200, 120);
    font-size: 14px;
    font-family: 'Fira Code', monospace;
    opacity: 0.8;
  }

  // --- Dialogue card ---
  &--dialogue {
    border: 1px solid rgba(130, 180, 255, 0.2);
    background: rgba(130, 180, 255, 0.03);

    .teos-card__header {
      background: rgba(130, 180, 255, 0.06);
      color: rgb(160, 200, 255);
      border-bottom: 1px solid rgba(130, 180, 255, 0.12);
    }

    .teos-card__type {
      background: rgba(130, 180, 255, 0.1);
      color: rgba(160, 200, 255, 0.7);
    }

    .teos-card__btn--insert {
      background: rgba(130, 180, 255, 0.1);
      color: rgb(160, 200, 255);

      &:hover {
        background: rgba(130, 180, 255, 0.2);
      }
    }
  }

  &__dialogue-entry {
    padding: 8px 0;
    border-bottom: 1px solid rgba(170, 169, 98, 0.08);

    &:last-child { border-bottom: none; }
  }

  &__speaker {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    color: rgb(216, 186, 131);
    margin-bottom: 4px;
    opacity: 0.8;

    &::before {
      content: '👤 ';
      font-size: 13px;
    }
  }

  &__dialogue-text {
    color: rgba(216, 216, 216, 0.85);
    font-size: 17px;
    line-height: 1.5;
    font-style: italic;
    margin-bottom: 6px;

    &::before { content: '"'; color: rgba(216, 186, 131, 0.4); }
    &::after { content: '"'; color: rgba(216, 186, 131, 0.4); }
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  &__filter {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(170, 169, 98, 0.1);
    border: 1px solid rgba(170, 169, 98, 0.15);
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    color: rgba(216, 216, 216, 0.6);
  }

  &__result {
    code {
      display: block;
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 10px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 14px;
      color: rgba(237, 238, 167, 0.7);
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}
</style>
