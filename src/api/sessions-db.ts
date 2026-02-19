import Dexie from 'dexie';

// ---------------------------------------------------------------------------
//  Session type
// ---------------------------------------------------------------------------

export interface Session {
    id: string;
    activePlugin: string;      // DB key: "plugin_MyMod.esp_8192"
    pluginName: string;        // "MyMod.esp" — for UI
    pluginSize: number;        // 8192 — for UI
    dependencies: string[];    // DB keys of masters
    lastOpened: number;        // timestamp
    changes: number;           // change counter (hasChanges = changes > 0)
}

// ---------------------------------------------------------------------------
//  Sessions meta database
// ---------------------------------------------------------------------------

class SessionsMetaDB extends Dexie {
    sessions!: Dexie.Table<Session, string>;

    constructor() {
        super('sessions_meta');
        this.version(1).stores({
            sessions: 'id, activePlugin, lastOpened',
        });
    }
}

const sessionsDB = new SessionsMetaDB();

// ---------------------------------------------------------------------------
//  CRUD operations
// ---------------------------------------------------------------------------

export async function getAllSessions(): Promise<Session[]> {
    return sessionsDB.sessions.toArray();
}

export async function getLastSession(): Promise<Session | undefined> {
    return sessionsDB.sessions.orderBy('lastOpened').last();
}

export async function saveSession(session: Session): Promise<void> {
    await sessionsDB.sessions.put(session);
}

export async function removeSession(id: string): Promise<void> {
    await sessionsDB.sessions.delete(id);
}

export async function getSessionByPluginKey(pluginKey: string): Promise<Session | undefined> {
    return sessionsDB.sessions.where('activePlugin').equals(pluginKey).first();
}

// ---------------------------------------------------------------------------
//  Utilities
// ---------------------------------------------------------------------------

export function makePluginKey(name: string, sizeBytes: number): string {
    return `plugin_${name}_${sizeBytes}`;
}

export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
