/**
 * CodeMirror 6 language support for MWScript.
 *
 * Provides:
 * - Syntax highlighting via StreamLanguage
 * - Linting via AST-based static analysis
 * - Autocomplete for functions, keywords, and variables
 * - Hover tooltips with function signatures
 */

import {
    StreamLanguage,
    LanguageSupport,
} from '@codemirror/language';
import type { StreamParser, StringStream } from '@codemirror/language';
import { linter, type Diagnostic as CM6Diagnostic } from '@codemirror/lint';
import {
    autocompletion,
    type CompletionContext,
    type CompletionResult,
    type Completion,
} from '@codemirror/autocomplete';
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import { EXTENSIONS, EXTENSION_NAMES, DISPLAY_NAMES } from './extensions';
import { KEYWORD_MAP } from './tokens';
import { parse } from './parser';
import { StaticAnalyzer, formatSignature } from './analyzer';
import { MWSCRIPT_DOCS } from './mwscript-docs';

// ---------------------------------------------------------------------------
//  1. Syntax Highlighting — StreamLanguage adapter
// ---------------------------------------------------------------------------

const keywordsSet = new Set(KEYWORD_MAP.keys());

interface MWScriptState {
    /** Not used currently, placeholder for future multi-line states */
    inString: boolean;
}

const mwscriptStreamParser: StreamParser<MWScriptState> = {
    startState(): MWScriptState {
        return { inString: false };
    },

    token(stream: StringStream): string | null {
        // Whitespace
        if (stream.eatSpace()) return null;

        // Comments: ; to end of line
        if (stream.match(/^;.*/)) return 'comment';

        // Strings: "..."
        if (stream.match(/^"[^"]*"?/)) return 'string';

        // Numbers: float and integer
        if (stream.match(/^\d+\.\d*/)) return 'number';
        if (stream.match(/^\.\d+/)) return 'number';
        if (stream.match(/^\d+/)) return 'number';

        // Arrow operator
        if (stream.match('->')) return 'operator';

        // Two-char operators
        if (stream.match('==') || stream.match('!=') || stream.match('<=') || stream.match('>=')) {
            return 'operator';
        }

        // Single-char operators
        if (stream.match(/^[+\-*/=<>(),]/)) return 'operator';

        // Words: keywords, functions, or names
        if (stream.match(/^[a-zA-Z_]\w*/)) {
            const word = stream.current().toLowerCase();
            if (keywordsSet.has(word)) return 'keyword';
            if (EXTENSION_NAMES.has(word)) return 'variableName.special'; // builtin
            return 'variableName';
        }

        // Skip unknown character
        stream.next();
        return null;
    },
};

const mwscriptLanguage = StreamLanguage.define(mwscriptStreamParser);

// ---------------------------------------------------------------------------
//  2. Linting — AST-based static analysis
// ---------------------------------------------------------------------------

/**
 * Convert 1-based line/col diagnostics to CM6 from/to offsets.
 */
function diagnosticToOffset(
    view: EditorView,
    line: number,
    column: number,
): { from: number; to: number } {
    const lineCount = view.state.doc.lines;
    const clampedLine = Math.min(Math.max(line, 1), lineCount);
    const lineObj = view.state.doc.line(clampedLine);
    const from = lineObj.from + Math.min(column, lineObj.length);
    // Highlight to end of word or at least 1 char
    const to = Math.min(from + 8, lineObj.to);
    return { from, to: Math.max(to, from + 1) };
}

const mwscriptLinter = linter((view) => {
    const source = view.state.doc.toString();
    const result = parse(source);
    const diagnostics: CM6Diagnostic[] = [];

    // Parser diagnostics
    for (const d of result.diagnostics) {
        const { from, to } = diagnosticToOffset(view, d.line, d.column);
        diagnostics.push({
            from,
            to,
            severity: d.severity === 'error' ? 'error' : 'warning',
            message: d.message,
            source: 'mwscript',
        });
    }

    // Static analysis diagnostics (only if AST parsed successfully)
    if (result.ast) {
        const analyzer = new StaticAnalyzer();
        const analysis = analyzer.analyze(result.ast);
        for (const d of analysis) {
            const { from, to } = diagnosticToOffset(view, d.line, d.column);
            diagnostics.push({
                from,
                to,
                severity: d.severity === 'error' ? 'error' : 'warning',
                message: d.message,
                source: 'mwscript-analyzer',
            });
        }
    }

    return diagnostics;
}, { delay: 400 });

// ---------------------------------------------------------------------------
//  3. Autocomplete — functions, keywords, variables
// ---------------------------------------------------------------------------

/** Pre-built completion items for all extensions, enriched with MSFD docs */
const extensionCompletions: Completion[] = Object.entries(EXTENSIONS).map(([name, ext]) => {
    const doc = MWSCRIPT_DOCS[name];
    const displayName = DISPLAY_NAMES[name] || name;
    return {
        label: displayName,
        type: ext.kind === 'function' ? 'function' : 'keyword',
        detail: formatSignature(name),
        info: doc?.description,
        section: ext.category,
        boost: ext.kind === 'function' ? 1 : 0,
    };
});

/** Pre-built completion items for keywords */
const keywordCompletions: Completion[] = Array.from(KEYWORD_MAP.keys()).map(kw => ({
    label: kw,
    type: 'keyword',
    boost: 2,
}));

function mwscriptCompletions(context: CompletionContext): CompletionResult | null {
    // Match word being typed
    const word = context.matchBefore(/[a-zA-Z_]\w*/);
    if (!word) return null;
    // Don't autocomplete for very short prefixes unless explicitly triggered
    if (word.text.length < 2 && !context.explicit) return null;

    // Collect candidates
    const options: Completion[] = [...keywordCompletions, ...extensionCompletions];

    // Add local variable declarations from current document
    const source = context.state.doc.toString();
    const varRegex = /^\s*(?:short|long|float)\s+(\w+)/gim;
    let match;
    const seen = new Set<string>();
    while ((match = varRegex.exec(source)) !== null) {
        const varName = match[1].toLowerCase();
        if (!seen.has(varName)) {
            seen.add(varName);
            options.push({
                label: match[1],
                type: 'variable',
                boost: 3,
            });
        }
    }

    return {
        from: word.from,
        options,
        validFor: /^[a-zA-Z_]\w*$/,
    };
}

// ---------------------------------------------------------------------------
//  4. Hover Tooltips — rich MSFD-powered documentation
// ---------------------------------------------------------------------------

/** Escape HTML special characters */
function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build rich tooltip HTML from extension + MSFD docs */
function buildTooltipHTML(word: string): string | null {
    const ext = EXTENSIONS[word];
    if (!ext) return null;

    const doc = MWSCRIPT_DOCS[word];
    const sig = formatSignature(word);
    const parts: string[] = [];

    // Signature header
    parts.push(`<div class="mw-tt-sig">${esc(sig)}</div>`);

    // Badges row
    const badges: string[] = [];
    badges.push(`<span class="mw-tt-badge">${ext.kind}</span>`);
    badges.push(`<span class="mw-tt-badge">${ext.category}</span>`);
    if (doc?.requires) {
        badges.push(`<span class="mw-tt-badge mw-tt-expansion">${doc.requires}</span>`);
    }
    if (doc?.broken) {
        badges.push(`<span class="mw-tt-badge mw-tt-broken">❌ BROKEN</span>`);
    }
    parts.push(`<div class="mw-tt-badges">${badges.join('')}</div>`);

    // Description
    const desc = doc?.description || ext.description;
    if (desc) {
        parts.push(`<div class="mw-tt-desc">${esc(desc)}</div>`);
    }

    // Gotchas
    if (doc?.gotchas?.length) {
        parts.push('<div class="mw-tt-section">');
        for (const g of doc.gotchas) {
            parts.push(`<div class="mw-tt-gotcha">⚠ ${esc(g)}</div>`);
        }
        parts.push('</div>');
    }

    // Tips
    if (doc?.tips?.length) {
        parts.push('<div class="mw-tt-section">');
        for (const t of doc.tips) {
            parts.push(`<div class="mw-tt-tip">💡 ${esc(t)}</div>`);
        }
        parts.push('</div>');
    }

    // Enum values (compact table)
    if (doc?.enumValues) {
        const entries = Object.entries(doc.enumValues);
        const rows = entries.map(([k, v]) => `<tr><td class="mw-tt-enum-k">${esc(k)}</td><td>${esc(v)}</td></tr>`);
        parts.push(`<table class="mw-tt-enum">${rows.join('')}</table>`);
    }

    // Code example
    if (doc?.example) {
        parts.push(`<pre class="mw-tt-code">${esc(doc.example)}</pre>`);
    }

    // See also
    if (doc?.seeAlso?.length) {
        const links = doc.seeAlso.map(s => `<span class="mw-tt-ref">${s}</span>`);
        parts.push(`<div class="mw-tt-seealso">See also: ${links.join(', ')}</div>`);
    }

    return parts.join('');
}

const mwscriptHover = hoverTooltip((view, pos): Tooltip | null => {
    const line = view.state.doc.lineAt(pos);
    const text = line.text;
    const offset = pos - line.from;

    // Find word boundaries at cursor
    let start = offset;
    let end = offset;
    while (start > 0 && /[a-zA-Z_\w]/.test(text[start - 1])) start--;
    while (end < text.length && /[a-zA-Z_\w]/.test(text[end])) end++;

    const word = text.slice(start, end).toLowerCase();
    if (!word) return null;

    const html = buildTooltipHTML(word);
    if (!html) return null;

    return {
        pos: line.from + start,
        end: line.from + end,
        above: true,
        create() {
            const dom = document.createElement('div');
            dom.className = 'cm-mwscript-tooltip';
            dom.innerHTML = html;
            return { dom };
        },
    };
});

// ---------------------------------------------------------------------------
//  5. Theme — tooltip styling
// ---------------------------------------------------------------------------

import { EditorView as EV } from '@codemirror/view';

const mwscriptTooltipTheme = EV.baseTheme({
    '.cm-mwscript-tooltip': {
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: '#1e1e2e',
        color: '#cdd6f4',
        border: '1px solid rgba(170, 169, 98, 0.3)',
        fontSize: '13px',
        maxWidth: '480px',
        lineHeight: '1.5',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    },
    '.mw-tt-sig': {
        fontFamily: 'monospace',
        fontWeight: '600',
        fontSize: '14px',
        color: '#f5c2e7',
        marginBottom: '6px',
    },
    '.mw-tt-badges': {
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        marginBottom: '6px',
    },
    '.mw-tt-badge': {
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: 'rgba(137,180,250,0.15)',
        color: '#89b4fa',
    },
    '.mw-tt-expansion': {
        backgroundColor: 'rgba(166,227,161,0.15)',
        color: '#a6e3a1',
    },
    '.mw-tt-broken': {
        backgroundColor: 'rgba(243,139,168,0.2)',
        color: '#f38ba8',
    },
    '.mw-tt-desc': {
        color: '#bac2de',
        marginBottom: '6px',
    },
    '.mw-tt-section': {
        marginBottom: '4px',
    },
    '.mw-tt-gotcha': {
        color: '#fab387',
        fontSize: '12px',
        padding: '2px 0',
    },
    '.mw-tt-tip': {
        color: '#a6e3a1',
        fontSize: '12px',
        padding: '2px 0',
    },
    '.mw-tt-enum': {
        borderCollapse: 'collapse',
        width: '100%',
        fontSize: '12px',
        marginBottom: '6px',
        marginTop: '4px',
    },
    '.mw-tt-enum td': {
        padding: '1px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    '.mw-tt-enum-k': {
        fontFamily: 'monospace',
        color: '#89b4fa',
        textAlign: 'right',
        width: '40px',
    },
    '.mw-tt-code': {
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: '4px 8px',
        borderRadius: '4px',
        marginTop: '4px',
        marginBottom: '4px',
        overflowX: 'auto',
        whiteSpace: 'pre',
        color: '#cba6f7',
    },
    '.mw-tt-seealso': {
        fontSize: '11px',
        color: '#6c7086',
        marginTop: '4px',
    },
    '.mw-tt-ref': {
        fontFamily: 'monospace',
        color: '#89b4fa',
    },
});

// ---------------------------------------------------------------------------
//  6. Public API
// ---------------------------------------------------------------------------

/**
 * Full MWScript language support for CodeMirror 6.
 * Includes syntax highlighting, linting, autocomplete, and hover tooltips.
 */
export function mwscript(): LanguageSupport {
    return new LanguageSupport(mwscriptLanguage, [
        mwscriptLinter,
        autocompletion({ override: [mwscriptCompletions] }),
        mwscriptHover,
        mwscriptTooltipTheme,
    ]);
}

/**
 * Minimal MWScript support — highlighting only, no linting/autocomplete.
 * Suitable for read-only result script views.
 */
export function mwscriptBasic(): LanguageSupport {
    return new LanguageSupport(mwscriptLanguage);
}

/**
 * Re-export useful items for external use.
 */
export { mwscriptLinter, mwscriptHover, mwscriptTooltipTheme };

/**
 * Individual extensions for custom configurations.
 */
export function mwscriptExtensions(): Extension[] {
    return [
        mwscriptLinter,
        autocompletion({ override: [mwscriptCompletions] }),
        mwscriptHover,
        mwscriptTooltipTheme,
    ];
}
