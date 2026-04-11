/**
 * Chat history — Pinia store for persisting AI chat sessions in localStorage.
 */

import { ref } from 'vue';
import { logger } from '@/services/logger';
import { defineStore } from 'pinia';
import type { ChatMessage } from './llm-client';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface DisplayMessage {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolName?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    conversation: ChatMessage[];
    displayMessages: DisplayMessage[];
    createdAt: number;
    updatedAt: number;
}

interface StoredData {
    activeId: string;
    sessions: ChatSession[];
}

// ---------------------------------------------------------------------------
//  Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'teos-ai-chat-history';
const MAX_SESSIONS = 50;

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage(): StoredData | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveToStorage(data: StoredData) {
    try {
        const trimmed = {
            ...data,
            sessions: data.sessions.slice(0, MAX_SESSIONS),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        logger.warn('AI Chat', 'Failed to save history', e);
    }
}

function autoTitle(messages: DisplayMessage[]): string {
    const first = messages.find(m => m.role === 'user');
    if (!first) return 'New Chat';
    const text = first.content.trim();
    return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

// ---------------------------------------------------------------------------
//  Store
// ---------------------------------------------------------------------------

export const useChatHistory = defineStore('chatHistory', () => {
    const stored = loadFromStorage();

    const sessions = ref<ChatSession[]>(stored?.sessions ?? []);
    const activeSessionId = ref<string>(stored?.activeId ?? '');

    // If no sessions exist, create an initial empty one
    if (sessions.value.length === 0) {
        const s = makeEmptySession();
        sessions.value.push(s);
        activeSessionId.value = s.id;
    }

    // Ensure activeId points to a valid session
    if (!sessions.value.find(s => s.id === activeSessionId.value)) {
        activeSessionId.value = sessions.value[0].id;
    }

    // Persist initial state (covers first-ever creation)
    persist();

    // -----------------------------------------------------------------------
    //  Getters
    // -----------------------------------------------------------------------

    function activeSession(): ChatSession | undefined {
        return sessions.value.find(s => s.id === activeSessionId.value);
    }

    function sortedSessions(): ChatSession[] {
        return [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // -----------------------------------------------------------------------
    //  Actions
    // -----------------------------------------------------------------------

    function makeEmptySession(): ChatSession {
        return {
            id: generateId(),
            title: 'New Chat',
            conversation: [],
            displayMessages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    function createSession(): ChatSession {
        const s = makeEmptySession();
        sessions.value.unshift(s);
        activeSessionId.value = s.id;
        persist();
        return s;
    }

    function switchSession(id: string) {
        if (sessions.value.find(s => s.id === id)) {
            activeSessionId.value = id;
            persist();
        }
    }

    function deleteSession(id: string) {
        const idx = sessions.value.findIndex(s => s.id === id);
        if (idx === -1) return;

        sessions.value.splice(idx, 1);

        if (activeSessionId.value === id) {
            if (sessions.value.length === 0) {
                const s = makeEmptySession();
                sessions.value.push(s);
                activeSessionId.value = s.id;
            } else {
                activeSessionId.value = sessions.value[0].id;
            }
        }
        persist();
    }

    function renameSession(id: string, title: string) {
        const s = sessions.value.find(s => s.id === id);
        if (s) {
            s.title = title;
            persist();
        }
    }

    /**
     * Save current messages into the active session.
     * Makes deep copies to avoid storing reactive references.
     */
    function saveMessages(conversation: ChatMessage[], displayMessages: DisplayMessage[]) {
        const s = activeSession();
        if (!s) return;

        // Deep-copy to detach from reactive refs
        s.conversation = JSON.parse(JSON.stringify(conversation));
        s.displayMessages = JSON.parse(JSON.stringify(displayMessages));
        s.updatedAt = Date.now();

        // Auto-title from first user message
        if (s.title === 'New Chat' && displayMessages.length > 0) {
            s.title = autoTitle(displayMessages);
        }

        persist();
    }

    function clearActiveSession() {
        const s = activeSession();
        if (!s) return;
        s.conversation = [];
        s.displayMessages = [];
        s.title = 'New Chat';
        s.updatedAt = Date.now();
        persist();
    }

    function persist() {
        saveToStorage({
            activeId: activeSessionId.value,
            sessions: sessions.value,
        });
    }

    return {
        sessions,
        activeSessionId,
        activeSession,
        sortedSessions,
        createSession,
        switchSession,
        deleteSession,
        renameSession,
        saveMessages,
        clearActiveSession,
    };
});
