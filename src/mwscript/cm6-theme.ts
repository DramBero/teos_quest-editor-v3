/**
 * VS Code Dark+ theme for CodeMirror 6.
 *
 * Palette based on the VS Code Dark+ defaults (MIT-licensed).
 * Provides both editor chrome styling and syntax highlight colors.
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

// ---------------------------------------------------------------------------
//  Colors
// ---------------------------------------------------------------------------

const bg = '#1e1e1e';
const fg = '#d4d4d4';
const selection = '#264f78';
const activeLine = '#2a2d2e';
const gutterBg = '#1e1e1e';
const gutterFg = '#858585';
const cursor = '#aeafad';
const tooltip = '#252526';
const tooltipBorder = '#454545';

// Syntax
const keyword = '#569cd6';  // if, else, while, return …
const controlFlow = '#c586c0';  // Begin, End, return (statements)
const string = '#ce9178';
const number = '#b5cea8';
const comment = '#6a9955';
const fn = '#dcdcaa';  // function names / builtins
const variable = '#9cdcfe';
const type = '#4ec9b0';
const operator = '#d4d4d4';
const constant = '#4fc1ff';

// ---------------------------------------------------------------------------
//  1. Editor chrome theme
// ---------------------------------------------------------------------------

export const vscodeDarkTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '16px',
        fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
        backgroundColor: bg,
        color: fg,
    },
    '.cm-content': {
        caretColor: cursor,
        lineHeight: '24px',
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: cursor,
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: `${selection} !important`,
    },
    '.cm-activeLine': {
        backgroundColor: activeLine,
    },
    '.cm-activeLineGutter': {
        backgroundColor: activeLine,
    },
    '.cm-gutters': {
        backgroundColor: gutterBg,
        color: gutterFg,
        borderRight: '1px solid #333',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 8px',
    },
    // Tooltip / autocomplete
    '.cm-tooltip': {
        backgroundColor: tooltip,
        border: `1px solid ${tooltipBorder}`,
        borderRadius: '4px',
        color: fg,
    },
    '.cm-tooltip-autocomplete': {
        '& > ul > li': {
            padding: '4px 8px',
        },
        '& > ul > li[aria-selected]': {
            background: '#04395e',
            color: '#fff',
        },
    },
    '.cm-completionLabel': {
        fontFamily: "'Fira Code', 'Consolas', monospace",
    },
    '.cm-completionDetail': {
        fontStyle: 'normal',
        color: 'rgba(255, 255, 255, 0.45)',
        marginLeft: '8px',
    },
    // Lint decorations
    '.cm-lintRange-error': {
        backgroundImage: 'none',
        textDecoration: 'underline wavy #f44747',
    },
    '.cm-lintRange-warning': {
        backgroundImage: 'none',
        textDecoration: 'underline wavy #cca700',
    },
    '.cm-lint-marker-error': {
        content: '"●"',
        color: '#f44747',
    },
    '.cm-lint-marker-warning': {
        content: '"●"',
        color: '#cca700',
    },
}, { dark: true });

// ---------------------------------------------------------------------------
//  2. Syntax highlighting
// ---------------------------------------------------------------------------

export const vscodeDarkHighlightStyle = HighlightStyle.define([
    // Keywords: if, else, elseif, while, set, to, return, …
    { tag: t.keyword, color: keyword },
    { tag: t.controlKeyword, color: controlFlow },
    // Functions / builtins
    { tag: t.function(t.variableName), color: fn },
    { tag: t.special(t.variableName), color: fn },
    // Variables
    { tag: t.variableName, color: variable },
    // Types
    { tag: t.typeName, color: type },
    { tag: t.className, color: type },
    // Literals
    { tag: t.string, color: string },
    { tag: t.number, color: number },
    { tag: t.bool, color: constant },
    // Operators
    { tag: t.operator, color: operator },
    { tag: t.punctuation, color: fg },
    // Comments
    { tag: t.comment, color: comment, fontStyle: 'italic' },
    { tag: t.lineComment, color: comment, fontStyle: 'italic' },
    { tag: t.blockComment, color: comment, fontStyle: 'italic' },
    // Misc
    { tag: t.meta, color: '#d4d4d4' },
    { tag: t.invalid, color: '#f44747' },
]);

// ---------------------------------------------------------------------------
//  3. Convenience bundles
// ---------------------------------------------------------------------------

/** Full theme + highlight style for the main script editor */
export const vscodeDarkExtensions: Extension[] = [
    vscodeDarkTheme,
    syntaxHighlighting(vscodeDarkHighlightStyle),
];

/** Minimal theme for inline / embedded editors (no gutters, transparent bg) */
export const vscodeDarkInlineTheme = EditorView.theme({
    '&': {
        fontSize: '14px',
        fontFamily: "'Fira Code', 'Consolas', monospace",
        backgroundColor: 'transparent',
        color: fg,
    },
    '.cm-content': {
        lineHeight: '20px',
        padding: '8px 0',
    },
    '.cm-gutters': {
        display: 'none',
    },
    '.cm-activeLine': {
        backgroundColor: 'transparent',
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: cursor,
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: `${selection} !important`,
    },
}, { dark: true });

/** Inline theme + highlight style bundle */
export const vscodeDarkInlineExtensions: Extension[] = [
    vscodeDarkInlineTheme,
    syntaxHighlighting(vscodeDarkHighlightStyle),
];

/** Book editor: no gutters, fits book panel */
export const vscodeDarkBookTheme = EditorView.theme({
    '&': {
        fontSize: '16px',
        fontFamily: "'Fira Code', 'Consolas', monospace",
        backgroundColor: bg,
        color: fg,
    },
    '.cm-content': {
        lineHeight: '24px',
    },
    '.cm-gutters': {
        display: 'none',
    },
    '.cm-activeLine': {
        backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: `${selection} !important`,
    },
}, { dark: true });

/** Book theme + highlight style bundle */
export const vscodeDarkBookExtensions: Extension[] = [
    vscodeDarkBookTheme,
    syntaxHighlighting(vscodeDarkHighlightStyle),
];
