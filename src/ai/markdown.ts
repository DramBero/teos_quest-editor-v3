/**
 * Lightweight markdown to HTML renderer.
 * Handles: paragraphs, headers, bold, italic, code blocks, inline code,
 * lists (ul/ol), links, blockquotes, tables.
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
        const escaped = escapeHtml(code.replace(/\n$/, ''));
        codeBlocks.push(
            `<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`
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

        // Unordered lists
        if (/^[\-\*]\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[\-\*]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[\-\*]\s/, ''));
                i++;
            }
            output.push('<ul>' + items.map(item => `<li>${inlineMarkdown(item)}</li>`).join('') + '</ul>');
            continue;
        }

        // Ordered lists
        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ''));
                i++;
            }
            output.push('<ol>' + items.map(item => `<li>${inlineMarkdown(item)}</li>`).join('') + '</ol>');
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
        || /^[\-\*]\s/.test(line)
        || /^\d+\.\s/.test(line)
        || line.startsWith('> ')
        || /^[-*_]{3,}$/.test(line.trim())
        || /^\x00CODE/.test(line);
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
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
}

function renderTable(lines: string[]): string {
    if (lines.length < 2) return '';

    const parseCells = (line: string) =>
        line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

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

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
