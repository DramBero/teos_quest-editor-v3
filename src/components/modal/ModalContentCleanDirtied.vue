<template>
  <div class="clean-modal">
    <div class="clean-modal__header">
      <h3>Dirtied Entries</h3>
      <button class="clean-modal__close" @click="closeModal">&times;</button>
    </div>

    <div v-if="loading" class="clean-modal__loading">
      <SVGSpinners90RingWithBg />
      Scanning plugin…
    </div>

    <template v-else>
      <div class="clean-modal__info">
        Entries identical to their master version — likely touched by CS without changes.
      </div>

      <div v-if="entries.length === 0" class="clean-modal__empty">
        No dirtied entries found. Plugin is clean! ✓
      </div>

      <template v-else>
        <div class="clean-modal__toolbar">
          <label class="clean-modal__select-all">
            <input
              type="checkbox"
              :checked="allChecked"
              :indeterminate="someChecked && !allChecked"
              @change="toggleAll"
            />
            <span v-if="allChecked">Deselect all</span>
            <span v-else>Select all</span>
          </label>
          <span class="clean-modal__count">{{ checkedCount }} / {{ entries.length }}</span>
        </div>

        <div class="clean-modal__list">
          <label
            v-for="item in entries"
            :key="item.entry.TMP_index"
            class="clean-modal__item"
          >
            <input type="checkbox" v-model="item.checked" />
            <div class="clean-modal__item-info">
              <span class="clean-modal__item-topic">{{ item.entry.TMP_topic }}</span>
              <span class="clean-modal__item-text">{{ truncateText(item.entry) }}</span>
            </div>
            <span v-if="item.entry.TMP_speaker_id" class="clean-modal__item-speaker">
              {{ item.entry.TMP_speaker_id }}
            </span>
          </label>
        </div>

        <div class="clean-modal__footer">
          <div class="clean-modal__footer-info">
            Deleting dirtied entries removes overrides that don't change anything.
          </div>
          <button
            class="clean-modal__btn-clean"
            :disabled="checkedCount === 0 || cleaning"
            @click="cleanSelected"
          >
            <template v-if="cleaning">Cleaning…</template>
            <template v-else>Clean {{ checkedCount }} {{ checkedCount === 1 ? 'entry' : 'entries' }}</template>
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getDirtiedEntries, bulkDeleteEntries } from '@/api/idb';
import { usePrimaryModal } from '@/stores/modals';
import { logger } from '@/services/logger';
import type { BaseEntry } from '@/types/pluginEntries';
import SVGSpinners90RingWithBg from '~icons/svg-spinners/90-ring-with-bg';

interface DirtiedItem {
  entry: BaseEntry;
  checked: boolean;
}

const primaryModalStore = usePrimaryModal();
const loading = ref(true);
const cleaning = ref(false);
const entries = ref<DirtiedItem[]>([]);

const checkedCount = computed(() => entries.value.filter(e => e.checked).length);
const allChecked = computed(() => entries.value.length > 0 && checkedCount.value === entries.value.length);
const someChecked = computed(() => checkedCount.value > 0);

function toggleAll() {
  const newVal = !allChecked.value;
  entries.value.forEach(e => e.checked = newVal);
}

function truncateText(entry: BaseEntry): string {
  const text = (entry as unknown as Record<string, unknown>).text as string || '';
  if (text.length > 80) return text.slice(0, 80) + '…';
  return text || '(no text)';
}

async function loadEntries() {
  loading.value = true;
  try {
    const dirtied = await getDirtiedEntries();
    entries.value = dirtied.map(entry => ({ entry, checked: true }));
  } catch (error) {
    logger.error('CleanDirtied', 'Failed to scan for dirtied entries', error);
  } finally {
    loading.value = false;
  }
}

async function cleanSelected() {
  const toDelete = entries.value.filter(e => e.checked).map(e => e.entry);
  if (toDelete.length === 0) return;
  cleaning.value = true;
  try {
    const deleted = await bulkDeleteEntries(toDelete);
    logger.success('CleanDirtied', `Cleaned ${deleted} dirtied entries`);
    // Refresh the list
    await loadEntries();
  } catch (error) {
    logger.error('CleanDirtied', 'Failed to clean entries', error);
  } finally {
    cleaning.value = false;
  }
}

function closeModal() {
  primaryModalStore.setActiveModal('');
}

onMounted(loadEntries);
</script>

<style scoped lang="scss">
.clean-modal {
  background: #d4b896;
  width: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Pelagiad', serif;
  color: rgb(50, 40, 25);
  max-height: 70vh;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    h3 {
      color: rgb(50, 40, 25);
      font-size: 24px;
      font-weight: 500;
      margin: 0;
    }
  }

  &__close {
    background: none;
    border: none;
    color: rgba(50, 40, 25, 0.4);
    font-size: 26px;
    cursor: pointer;
    font-family: 'Pelagiad', serif;
    line-height: 1;
    padding: 0 4px;
    transition: color 0.15s;

    &:hover {
      color: rgba(50, 40, 25, 0.8);
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 24px;
    font-size: 18px;
    color: rgba(50, 40, 25, 0.6);

    svg {
      width: 24px;
      height: 24px;
      color: rgba(50, 40, 25, 0.4);
    }
  }

  &__info {
    padding: 12px 24px;
    font-size: 14px;
    color: rgba(50, 40, 25, 0.55);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    line-height: 1.4;
  }

  &__empty {
    padding: 48px 24px;
    text-align: center;
    font-size: 18px;
    color: rgb(30, 120, 50);
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 24px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(0, 0, 0, 0.02);
  }

  &__select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 15px;
    user-select: none;

    input {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: rgb(50, 40, 25);
    }
  }

  &__count {
    font-size: 14px;
    color: rgba(50, 40, 25, 0.5);
  }

  &__list {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 24px;
    cursor: pointer;
    transition: background 80ms ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    input {
      cursor: pointer;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      accent-color: rgb(50, 40, 25);
    }
  }

  &__item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  &__item-topic {
    font-size: 16px;
    font-weight: 500;
    color: rgb(50, 40, 25);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-text {
    font-size: 13px;
    color: rgba(50, 40, 25, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-speaker {
    font-size: 12px;
    color: rgb(30, 100, 50);
    background: rgba(60, 160, 80, 0.12);
    padding: 2px 8px;
    border-radius: 8px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.02);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__footer-info {
    font-size: 12px;
    color: rgba(50, 40, 25, 0.5);
    line-height: 1.3;
    max-width: 280px;
  }

  &__btn-clean {
    background: rgb(180, 60, 60);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Pelagiad', serif;
    font-size: 16px;
    transition: all 80ms ease;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: rgb(200, 70, 70);
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
}
</style>
