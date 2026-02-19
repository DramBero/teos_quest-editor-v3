import { useToastStore } from '@/stores/toast';

// ---------------------------------------------------------------------------
//  Log levels
// ---------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#6ec6ff',
    warn: '#ffc107',
    error: '#ff5252',
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

    if (data !== undefined) {
        console[level](prefix, style, message, data);
    } else {
        console[level](prefix, style, message);
    }

    // Errors automatically trigger a user-facing toast
    if (level === 'error') {
        try {
            const store = useToastStore();
            store.add('error', `[${tag}] ${message}`);
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
};
