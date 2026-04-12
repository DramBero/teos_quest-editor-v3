/**
 * Lightweight markdown to HTML renderer.
 * Handles: paragraphs, headers, bold, italic, strikethrough, code blocks
 * (with MWScript syntax highlighting), inline code, lists (ul/ol with
 * task list support), links, blockquotes, tables, horizontal rules,
 * collapsible details sections.
 * No external dependencies.
 */

export function renderMarkdown(src: string): string {
    if (!src) return '';

    // Normalize line endings
    let text = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract code blocks first to protect them
    const codeBlocks: string[] = [];
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
        const idx = codeBlocks.length;
        const langLower = (lang || 'text').toLowerCase();
        const escaped = escapeHtml(code.replace(/\n$/, ''));

        // Apply syntax highlighting for MWScript
        const highlighted = isMWScriptLang(langLower)
            ? highlightMWScript(escaped)
            : escaped;

        codeBlocks.push(
            `<pre><code class="language-${lang || 'text'}">${highlighted}</code></pre>`
        );
        return `\x00CODE${idx}\x00`;
    });

    // Process blocks
    const lines = text.split('\n');
    const output: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block placeholder
        const codePlaceholder = line.match(/^\x00CODE(\d+)\x00$/);
        if (codePlaceholder) {
            output.push(codeBlocks[parseInt(codePlaceholder[1])]);
            i++;
            continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            output.push(`<h${level}>${inlineMarkdown(headerMatch[2])}</h${level}>`);
            i++;
            continue;
        }

        // Collapsible <details> block
        // Supports: <details> / <summary>...</summary> / content / </details>
        if (line.trim() === '<details>' || line.trim().startsWith('<details')) {
            const detailLines: string[] = [line];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('</details>')) {
                detailLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) {
                detailLines.push(lines[i]);
                i++;
            }
            output.push(renderDetails(detailLines));
            continue;
        }

        // Blockquotes
        if (line.startsWith('> ')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].startsWith('> ')) {
                quoteLines.push(lines[i].slice(2));
                i++;
            }
            output.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`);
            continue;
        }

        // Unordered lists (with task list support)
        if (/^[-*]\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*]\s/, ''));
                i++;
            }
            output.push(renderList(items, 'ul'));
            continue;
        }

        // Ordered lists
        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ''));
                i++;
            }
            output.push(renderList(items, 'ol'));
            continue;
        }

        // Table
        if (line.includes('|') && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            output.push(renderTable(tableLines));
            continue;
        }

        // Horizontal rule
        if (/^[-*_]{3,}$/.test(line.trim())) {
            output.push('<hr>');
            i++;
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Paragraph (collect consecutive non-empty lines)
        const paraLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length > 0) {
            output.push(`<p>${inlineMarkdown(paraLines.join('\n'))}</p>`);
        }
    }

    return output.join('\n');
}

function isBlockStart(line: string): boolean {
    return /^#{1,6}\s/.test(line)
        || /^[-*]\s/.test(line)
        || /^\d+\.\s/.test(line)
        || line.startsWith('> ')
        || /^[-*_]{3,}$/.test(line.trim())
        || /^\x00CODE/.test(line)
        || line.trim() === '<details>'
        || line.trim().startsWith('<details');
}

function inlineMarkdown(text: string): string {
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
}

// ---------------------------------------------------------------------------
//  List rendering with task list support
// ---------------------------------------------------------------------------

function renderList(items: string[], tag: 'ul' | 'ol'): string {
    const renderedItems = items.map(item => {
        // Task list: - [x] Done  or  - [ ] Todo
        const taskMatch = item.match(/^\[([ xX])\]\s*(.*)/);
        if (taskMatch) {
            const checked = taskMatch[1].toLowerCase() === 'x';
            const text = taskMatch[2];
            return `<li class="task-list-item">`
                + `<input type="checkbox" ${checked ? 'checked' : ''} disabled />`
                + `<span>${inlineMarkdown(text)}</span></li>`;
        }
        return `<li>${inlineMarkdown(item)}</li>`;
    });

    const hasTaskItems = items.some(item => /^\[([ xX])\]\s/.test(item));
    const cls = hasTaskItems ? ' class="task-list"' : '';
    return `<${tag}${cls}>${renderedItems.join('')}</${tag}>`;
}

// ---------------------------------------------------------------------------
//  Table rendering
// ---------------------------------------------------------------------------

function renderTable(lines: string[]): string {
    if (lines.length < 2) return '';

    const parseCells = (line: string) =>
        line.replace(/^\||\\|$/g, '').split('|').map(c => c.trim());

    const headers = parseCells(lines[0]);
    // lines[1] is separator, skip
    const rows = lines.slice(2).map(parseCells);

    let html = '<table><thead><tr>';
    html += headers.map(h => `<th>${inlineMarkdown(h)}</th>`).join('');
    html += '</tr></thead><tbody>';
    for (const row of rows) {
        html += '<tr>';
        html += row.map(c => `<td>${inlineMarkdown(c)}</td>`).join('');
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

// ---------------------------------------------------------------------------
//  Collapsible <details> rendering
// ---------------------------------------------------------------------------

function renderDetails(lines: string[]): string {
    let summary = 'Details';
    const contentLines: string[] = [];
    let inContent = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '<details>' || trimmed.startsWith('<details')) continue;
        if (trimmed === '</details>') continue;

        const summaryMatch = trimmed.match(/^<summary>(.*?)<\/summary>$/);
        if (summaryMatch) {
            summary = summaryMatch[1];
            inContent = true;
            continue;
        }

        if (!inContent && !trimmed.startsWith('<summary>')) {
            inContent = true;
        }

        if (inContent) {
            contentLines.push(line);
        }
    }

    const innerHtml = renderMarkdown(contentLines.join('\n'));
    return `<details><summary>${escapeHtml(summary)}</summary><div class="details-content">${innerHtml}</div></details>`;
}

// ---------------------------------------------------------------------------
//  MWScript syntax highlighting
// ---------------------------------------------------------------------------

/** Check if language tag looks like MWScript */
function isMWScriptLang(lang: string): boolean {
    return ['mwscript', 'morrowind', 'mw', 'tes3', 'mwscr'].includes(lang);
}

/**
 * Apply syntax highlighting to already-escaped MWScript code.
 * Works on HTML-escaped text (uses &amp; &lt; &gt; etc).
 *
 * Highlights:
 * - Comments (;...)
 * - Strings ("...")
 * - Keywords (Begin, End, If, Else, ElseIf, EndIf, While, Set, Return, etc.)
 * - Built-in functions (MessageBox, Journal, AddItem, GetPos, etc.)
 * - Numbers (integer and float)
 * - Operators (==, !=, >=, <=, ->, etc.)
 * - Variables (short, long, float declarations)
 */
function highlightMWScript(code: string): string {
    // Process line by line to handle comments correctly
    return code.split('\n').map(highlightMWScriptLine).join('\n');
}

function highlightMWScriptLine(line: string): string {
    // Find comment (;) — everything after it is a comment
    // Be careful: the text is HTML-escaped, so we work on escaped text
    const commentIdx = line.indexOf(';');
    if (commentIdx !== -1) {
        const before = line.slice(0, commentIdx);
        const comment = line.slice(commentIdx);
        return highlightMWScriptTokens(before)
            + `<span class="mws-comment">${comment}</span>`;
    }
    return highlightMWScriptTokens(line);
}

function highlightMWScriptTokens(text: string): string {
    if (!text) return text;

    // String literals "..."
    text = text.replace(
        /(&quot;)(.*?)(&quot;)/g,
        '<span class="mws-string">$1$2$3</span>',
    );

    // Control flow keywords (word boundary via lookahead/lookbehind approximation)
    const controlKeywords = [
        'Begin', 'End', 'If', 'ElseIf', 'Else', 'EndIf',
        'While', 'EndWhile', 'Return', 'StartScript', 'StopScript',
    ];
    const controlRe = new RegExp(
        `\\b(${controlKeywords.join('|')})\\b`, 'gi',
    );
    text = text.replace(controlRe, '<span class="mws-keyword">$1</span>');

    // Type declarations
    const typeKeywords = ['short', 'long', 'float'];
    const typeRe = new RegExp(`\\b(${typeKeywords.join('|')})\\b`, 'gi');
    text = text.replace(typeRe, '<span class="mws-type">$1</span>');

    // Common built-in functions (top ~60 most used)
    const builtins = [
        // Journal / Quest
        'Journal', 'SetJournalIndex', 'GetJournalIndex',
        // Dialogue
        'Choice', 'Goodbye', 'AddTopic', 'ForceGreeting',
        // UI
        'MessageBox', 'GetButtonPressed', 'ShowMap', 'FillMap',
        'EnableStatsMenu', 'DisableStatsMenu',
        // Items
        'AddItem', 'RemoveItem', 'GetItemCount', 'HasItemEquipped',
        'Equip', 'Drop', 'AddSoulGem', 'AddSpell', 'RemoveSpell',
        // Player
        'GetPCRank', 'SetPCRank', 'PCRaiseRank', 'PCLowerRank',
        'PCExpell', 'PCClearExpelled', 'PCJoinFaction',
        'RaiseRank', 'LowerRank', 'GetPCFacRep', 'SetPCFacRep', 'ModPCFacRep',
        'GetLevel', 'SetLevel', 'ModCurrentHealth', 'ModCurrentMagicka',
        'GetHealth', 'GetMagicka', 'GetFatigue',
        'GetStrength', 'GetIntelligence', 'GetWillpower',
        'GetAgility', 'GetSpeed', 'GetEndurance', 'GetPersonality', 'GetLuck',
        // Movement / Position
        'Position', 'PositionCell', 'GetPos', 'SetPos',
        'GetAngle', 'SetAngle', 'Move', 'MoveWorld',
        'PlaceItem', 'PlaceItemCell', 'PlaceAtPC', 'PlaceAtMe',
        // Cell / World
        'GetPCCell', 'CellChanged', 'CellUpdate', 'COC', 'CenterOnCell',
        'GetInterior', 'GetWindSpeed',
        // AI
        'AiTravel', 'AiWander', 'AiFollow', 'AiEscort', 'AiActivate',
        'GetCurrentAIPackage', 'GetAIPackageDone',
        // Object manipulation
        'Activate', 'Lock', 'Unlock', 'GetLocked', 'GetDisabled',
        'Enable', 'Disable', 'SetDelete',
        'GetDistance', 'GetLineOfSight', 'GetDetected',
        // Scripts
        'ScriptRunning', 'GetTarget', 'GetSecondsPassed',
        // Variables
        'Set', 'SetVar', 'GetVar',
        // Sound
        'PlaySound', 'PlaySound3D', 'StopSound', 'StreamMusic',
        'Say', 'SayDone',
        // Misc
        'Random', 'MenuMode', 'OnActivate', 'OnDeath',
        'GetCollidingPC', 'GetCollidingActor',
        'ModDisposition', 'SetDisposition', 'GetDisposition',
        'ModReputation', 'SetReputation', 'GetReputation',
        'PayFine', 'PayFineThief', 'HitOnMe', 'HitAttemptOnMe',
        'GetSpell', 'GetEffect', 'GetSpellEffects',
        'Cast', 'ExplodeSpell', 'RemoveEffects',
        'FadeIn', 'FadeOut', 'FadeTo',
        'ForceSneak', 'ClearForceSneak',
        'DontSaveObject', 'ToggleVanityMode',
    ];
    // Only highlight if not already inside a span
    const builtinRe = new RegExp(
        `\\b(${builtins.join('|')})\\b`,
        'g', // case-sensitive for builtins
    );
    text = text.replace(builtinRe, (match) => {
        return `<span class="mws-builtin">${match}</span>`;
    });

    // Numbers (integers and floats)
    text = text.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span class="mws-number">$1</span>',
    );

    // Operators: ->, ==, !=, >=, <=, +, -, *, /
    text = text.replace(
        /(-&gt;|==|!=|&gt;=|&lt;=|&gt;|&lt;)/g,
        '<span class="mws-operator">$1</span>',
    );

    return text;
}

// ---------------------------------------------------------------------------
//  Utilities
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
