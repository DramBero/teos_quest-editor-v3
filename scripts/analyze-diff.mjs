/**
 * Analyze byte differences between original and round-trip ESP files.
 * Identifies which records have diffs and what type of fields are affected.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const origPath = process.argv[2] || resolve(projectRoot, 'docs/TR_Mainland.esm');
const rtPath = process.argv[3] || origPath + '.roundtrip.esp';

const orig = readFileSync(origPath);
const rt = readFileSync(rtPath);

console.log(`Original: ${orig.length} bytes`);
console.log(`Roundtrip: ${rt.length} bytes`);

// Find all diff regions
const diffs = [];
let inDiff = false;
let diffStart = -1;

for (let i = 0; i < Math.min(orig.length, rt.length); i++) {
    if (orig[i] !== rt[i]) {
        if (!inDiff) {
            diffStart = i;
            inDiff = true;
        }
    } else {
        if (inDiff) {
            diffs.push({ start: diffStart, end: i - 1, length: i - diffStart });
            inDiff = false;
        }
    }
}
if (inDiff) {
    diffs.push({ start: diffStart, end: Math.min(orig.length, rt.length) - 1, length: Math.min(orig.length, rt.length) - diffStart });
}

console.log(`\nFound ${diffs.length} diff regions\n`);

// Show first 30 diff regions with context
const showCount = Math.min(30, diffs.length);
for (let i = 0; i < showCount; i++) {
    const d = diffs[i];
    // Try to find what TES3 record type we're in by searching backwards for a known record header
    // TES3 records have a 4-char type followed by 4-byte size
    let recordType = '????';
    const searchStart = Math.max(0, d.start - 200);
    // Look for common record types
    const chunk = orig.slice(searchStart, d.start + 4);
    const str = chunk.toString('latin1');
    // Find last occurrence of a known 4-letter type tag
    const types = ['TES3', 'GMST', 'GLOB', 'CLAS', 'FACT', 'RACE', 'SOUN', 'SKIL', 'MGEF', 'SCPT',
        'REGN', 'BSGN', 'SSCR', 'LTEX', 'SPEL', 'STAT', 'DOOR', 'MISC', 'WEAP', 'CONT',
        'CREA', 'BODY', 'LIGH', 'ENCH', 'NPC_', 'ARMO', 'CLOT', 'REPA', 'ACTI', 'APPA',
        'LOCK', 'PROB', 'INGR', 'BOOK', 'ALCH', 'LEVI', 'LEVC', 'CELL', 'LAND', 'PGRD',
        'SNDG', 'DIAL', 'INFO'];

    let lastTypePos = -1;
    for (const t of types) {
        const pos = str.lastIndexOf(t);
        if (pos > lastTypePos) {
            lastTypePos = pos;
            recordType = t;
        }
    }

    // Also find the subrecord we're in
    let subrecType = '????';
    const subSearch = orig.slice(Math.max(0, d.start - 30), d.start + 4);
    const subStr = subSearch.toString('latin1');
    // Subrecords are 4 chars, look for last one
    for (let j = subStr.length - 4; j >= 0; j--) {
        const candidate = subStr.substring(j, j + 4);
        if (/^[A-Z][A-Z_0-9]{3}$/.test(candidate)) {
            subrecType = candidate;
            break;
        }
    }

    const origBytes = Array.from(orig.slice(d.start, Math.min(d.start + 8, d.end + 1)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');
    const rtBytes = Array.from(rt.slice(d.start, Math.min(d.start + 8, d.end + 1)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ');

    console.log(`Diff #${i + 1}: offset 0x${d.start.toString(16)} (${d.length} bytes) [${recordType}/${subrecType}]`);
    console.log(`  orig: ${origBytes}`);
    console.log(`  rt:   ${rtBytes}`);
}

// Summary: what values are being lost?
// Count how many diffs are single-byte 0x80→0x00 pattern
let singleByteDiffs = 0;
let flag80to00 = 0;
for (const d of diffs) {
    if (d.length === 1) {
        singleByteDiffs++;
        if (orig[d.start] === 0x80 && rt[d.start] === 0x00) {
            flag80to00++;
        }
    }
}

console.log(`\n--- Summary ---`);
console.log(`Total diff regions: ${diffs.length}`);
console.log(`Single-byte diffs: ${singleByteDiffs}`);
console.log(`0x80→0x00 pattern: ${flag80to00}`);
console.log(`Total differing bytes: ${diffs.reduce((s, d) => s + d.length, 0)}`);
