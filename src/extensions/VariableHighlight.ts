/**
 * TipTap extension that highlights Morrowind dialogue text variables.
 *
 * Variables use the `%` prefix: `%PCName`, `%Name`, `%Faction`, etc.
 * - Known built-in macros → white text
 * - Unknown / not found in DB → reddish text
 *
 * Optionally validates custom variables against GlobalVariable records.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { PluginData } from '@/api/collection';

// -----------------------------------------------------------------------
//  Known Morrowind built-in text defines (dialogue substitutions)
// -----------------------------------------------------------------------
const BUILTIN_VARIABLES = new Set([
    // Player
    'PCName', 'PCRace', 'PCClass', 'PCRank', 'PCNextRank',
    // NPC / Speaker
    'Name', 'Race', 'Class', 'Faction', 'Rank', 'NextPCRank',
    // Location
    'Cell',
    // Misc
    'Gold',
]);

// Regex: `%` followed by letters, digits, or underscores (at least 1 char)
const VARIABLE_REGEX = /%([A-Za-z_][A-Za-z0-9_]*)/g;

const variableHighlightKey = new PluginKey('variableHighlight');

/**
 * Cache of validated variable names → exists in DB.
 * Shared across all editor instances to avoid duplicate queries.
 */
const validationCache = new Map<string, boolean | 'pending'>();

/**
 * Check if a variable name exists as a GlobalVariable in IndexedDB.
 * Returns cached result or triggers async lookup.
 */
function isValidVariable(name: string): boolean | null {
    // Built-in macros are always valid
    if (BUILTIN_VARIABLES.has(name)) return true;

    const cached = validationCache.get(name);
    if (cached === true || cached === false) return cached;

    // Not yet looked up — return null (unknown) and trigger async check
    return null;
}

async function lookupVariable(name: string): Promise<boolean> {
    if (BUILTIN_VARIABLES.has(name)) return true;

    const cached = validationCache.get(name);
    if (cached === true || cached === false) return cached;

    // Mark as pending to avoid duplicate queries
    validationCache.set(name, 'pending');

    try {
        const results = await PluginData
            .where({ type: 'GlobalVariable', TMP_id: name })
            .first()
            .acrossPlugins({ reverseDeps: true });
        const exists = !!results;
        validationCache.set(name, exists);
        return exists;
    } catch {
        validationCache.set(name, false);
        return false;
    }
}

/**
 * Build decorations for all `%Variable` occurrences in the document.
 */
function buildDecorations(doc: any): DecorationSet {
    const decorations: Decoration[] = [];

    doc.descendants((node: any, pos: number) => {
        if (!node.isText) return;

        const text = node.text!;
        let match: RegExpExecArray | null;
        VARIABLE_REGEX.lastIndex = 0;

        while ((match = VARIABLE_REGEX.exec(text)) !== null) {
            const varName = match[1];
            const from = pos + match.index;
            const to = from + match[0].length;

            const validity = isValidVariable(varName);

            let className = 'mw-var mw-var--pending';
            if (validity === true) {
                className = 'mw-var mw-var--valid';
            } else if (validity === false) {
                className = 'mw-var mw-var--invalid';
            }

            decorations.push(
                Decoration.inline(from, to, { class: className }),
            );
        }
    });

    return DecorationSet.create(doc, decorations);
}

export const VariableHighlight = Extension.create({
    name: 'variableHighlight',

    addProseMirrorPlugins() {
        const editorView = { current: null as any };

        return [
            new Plugin({
                key: variableHighlightKey,
                state: {
                    init(_, { doc }) {
                        return buildDecorations(doc);
                    },
                    apply(tr, oldDecorations) {
                        if (tr.docChanged) {
                            return buildDecorations(tr.doc);
                        }
                        // Also rebuild when metadata signals a cache update
                        if (tr.getMeta(variableHighlightKey)) {
                            return buildDecorations(tr.doc);
                        }
                        return oldDecorations;
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
                view(view) {
                    editorView.current = view;

                    // Trigger async lookups for all pending variables after mount
                    scheduleValidation(view);

                    return {
                        update(view) {
                            editorView.current = view;
                            scheduleValidation(view);
                        },
                    };
                },
            }),
        ];
    },
});

let validationTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule async validation of all variables in the document.
 * Debounced to avoid spamming DB on every keystroke.
 */
function scheduleValidation(view: any) {
    if (validationTimer) clearTimeout(validationTimer);

    validationTimer = setTimeout(async () => {
        const doc = view.state.doc;
        const pending: string[] = [];

        doc.descendants((node: any) => {
            if (!node.isText) return;
            let match: RegExpExecArray | null;
            VARIABLE_REGEX.lastIndex = 0;
            while ((match = VARIABLE_REGEX.exec(node.text!)) !== null) {
                const varName = match[1];
                if (!BUILTIN_VARIABLES.has(varName) && validationCache.get(varName) === undefined) {
                    pending.push(varName);
                }
            }
        });

        if (pending.length === 0) return;

        // Lookup all pending variables in parallel
        const unique = [...new Set(pending)];
        await Promise.all(unique.map(lookupVariable));

        // Force decoration rebuild by dispatching a metadata transaction
        if (!view.isDestroyed) {
            const tr = view.state.tr.setMeta(variableHighlightKey, true);
            view.dispatch(tr);
        }
    }, 300);
}

export default VariableHighlight;
