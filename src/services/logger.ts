import { useToastStore } from '@/stores/toast';

// ---------------------------------------------------------------------------
//  Log levels
// ---------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#6ec6ff',
    warn: '#ffc107',
    error: '#ff5252',
    success: '#66bb6a',
};

const IS_DEV = import.meta.env.DEV;

// ---------------------------------------------------------------------------
//  Core logger
// ---------------------------------------------------------------------------

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
    // In production only warn + error
    if (!IS_DEV && level !== 'warn' && level !== 'error') return;

    const style = `color:${LEVEL_COLORS[level]};font-weight:bold`;
    const prefix = `%c[${tag}]`;
    const consoleFn = level === 'success' ? 'info' : level;

    if (data !== undefined) {
        console[consoleFn](prefix, style, message, data);
    } else {
        console[consoleFn](prefix, style, message);
    }

    // Errors and successes automatically trigger a user-facing toast
    // (except known non-critical init errors that fire before session restores)
    const SILENT_ERRORS = ['NO_ACTIVE_SESSION', 'SESSION_STORE_NOT_INITIALIZED', 'NO_HEADERFOUND'];
    const isSilent = level === 'error' && data !== undefined
        && SILENT_ERRORS.includes(data instanceof Error ? data.message : String(data));

    if ((level === 'error' || level === 'success') && !isSilent) {
        try {
            const store = useToastStore();
            let toastMsg = level === 'success' ? message : `[${tag}] ${message}`;
            // Append a short error hint when available
            if (level === 'error' && data) {
                const hint = data instanceof Error ? data.message : String(data);
                if (hint && hint !== message) toastMsg += ` — ${hint}`;
            }
            store.add(level, toastMsg);
        } catch {
            // Store may not be available during init — silently ignore
        }
    }
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

export const logger = {
    debug: (tag: string, msg: string, data?: unknown) => log('debug', tag, msg, data),
    info: (tag: string, msg: string, data?: unknown) => log('info', tag, msg, data),
    warn: (tag: string, msg: string, data?: unknown) => log('warn', tag, msg, data),
    error: (tag: string, msg: string, data?: unknown) => log('error', tag, msg, data),
    success: (tag: string, msg: string, data?: unknown) => log('success', tag, msg, data),
};
