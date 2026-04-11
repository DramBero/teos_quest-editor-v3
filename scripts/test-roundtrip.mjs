/**
 * Round-trip test: load .esp → parse via WASM → serialize back → compare bytes
 * Usage: node --experimental-wasm-modules scripts/test-roundtrip.mjs [path-to-esp]
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load WASM synchronously
const wasmPath = resolve(projectRoot, 'src/tes3_wasm/tes3_wasm_bg.wasm');
const wasmBytes = readFileSync(wasmPath);

// We need to import the JS glue code, but it uses import.meta.url for WASM loading.
// Instead, let's manually init with initSync.
const glue = await import(resolve(projectRoot, 'src/tes3_wasm/tes3_wasm.js'));
glue.initSync({ module: wasmBytes });

// Get the test file
const espPath = process.argv[2] || resolve(projectRoot, 'docs/tes3/libs/esp/tests/assets/all_types.esp');
console.log(`\n📂 Loading: ${espPath}`);

const originalBytes = readFileSync(espPath);
const original = new Uint8Array(originalBytes);
console.log(`   Size: ${original.length} bytes`);

// Step 1: Parse
console.log(`\n🔧 Parsing with load_objects()...`);
let objects;
try {
    objects = glue.load_objects(original);
    console.log(`   ✅ Parsed ${objects.length} records`);
} catch (err) {
    console.error(`   ❌ Parse failed:`, err.message);
    process.exit(1);
}

// Show record types
const typeCounts = {};
for (const obj of objects) {
    const t = obj.type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
}
console.log(`   Record types:`, JSON.stringify(typeCounts));

// Step 2: Serialize back
console.log(`\n💾 Serializing with save_objects()...`);
let saved;
try {
    saved = glue.save_objects(objects);
    console.log(`   ✅ Serialized to ${saved.length} bytes`);
} catch (err) {
    console.error(`   ❌ Serialize failed:`, err.message);
    process.exit(1);
}

// Step 3: Compare
console.log(`\n📊 Comparing...`);
console.log(`   Original: ${original.length} bytes`);
console.log(`   Saved:    ${saved.length} bytes`);

if (original.length !== saved.length) {
    console.log(`   ⚠️  Size mismatch: ${saved.length - original.length} bytes difference`);
}

// Byte-by-byte comparison
let firstDiff = -1;
let diffCount = 0;
const minLen = Math.min(original.length, saved.length);
for (let i = 0; i < minLen; i++) {
    if (original[i] !== saved[i]) {
        if (firstDiff === -1) firstDiff = i;
        diffCount++;
    }
}
// Count extra bytes as diffs too
diffCount += Math.abs(original.length - saved.length);

if (diffCount === 0) {
    console.log(`\n   ✅ PERFECT ROUND-TRIP — files are byte-identical!`);
} else {
    console.log(`\n   ❌ ${diffCount} byte(s) differ`);
    if (firstDiff >= 0) {
        console.log(`   First diff at offset 0x${firstDiff.toString(16)} (${firstDiff})`);
        console.log(`   Original: ${Array.from(original.slice(firstDiff, firstDiff + 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        console.log(`   Saved:    ${Array.from(saved.slice(firstDiff, firstDiff + 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    }

    // Save the output for manual inspection
    const outputPath = espPath + '.roundtrip.esp';
    writeFileSync(outputPath, saved);
    console.log(`\n   Saved round-trip output to: ${outputPath}`);
}

console.log('');
