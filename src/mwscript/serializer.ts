/**
 * MWScript binary serializers.
 *
 * Converts CompileResult into binary formats compatible with TES3 Script records:
 *   - SCDT (bytecode blob): raw uint32 LE instructions
 *   - SCVR (variable names): null-terminated ASCII strings grouped by type
 *   - ScriptHeader: variable counts + bytecode/variables lengths
 *
 * Reference: OpenMW components/compiler/output.cpp + docs/tes3/libs/esp/src/types/script.rs
 */

import type { CompileResult } from './codegen';
import type { Locals } from './codegen';
import type { ScriptHeader } from '@/types/tes3';

// ---------------------------------------------------------------------------
//  SCDT — bytecode blob
// ---------------------------------------------------------------------------

/**
 * Serialize compiled bytecode (uint32 words) into a raw byte array (LE).
 *
 * The SCDT subrecord in an ESP file is simply the instruction words
 * written as little-endian uint32 values — no additional headers.
 */
export function serializeSCDT(code: number[]): Uint8Array {
    const buf = new ArrayBuffer(code.length * 4);
    const view = new DataView(buf);
    for (let i = 0; i < code.length; i++) {
        view.setUint32(i * 4, code[i], true); // little-endian
    }
    return new Uint8Array(buf);
}

// ---------------------------------------------------------------------------
//  SCVR — variable names
// ---------------------------------------------------------------------------

/**
 * Serialize local variable names into a null-terminated byte array.
 *
 * Names are ordered by type (short, then long, then float),
 * then by declaration order within each type — matching
 * `Locals.getVariableNames()`.
 *
 * Each name is encoded as ASCII followed by a null byte (0x00).
 */
export function serializeSCVR(locals: Locals): Uint8Array {
    const names = locals.getVariableNames();
    if (names.length === 0) return new Uint8Array(0);

    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    let totalLength = 0;

    for (const name of names) {
        const encoded = encoder.encode(name);
        // name bytes + null terminator
        totalLength += encoded.length + 1;
        parts.push(encoded);
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
        result[offset] = 0; // null terminator
        offset += 1;
    }

    return result;
}

// ---------------------------------------------------------------------------
//  ScriptHeader
// ---------------------------------------------------------------------------

/**
 * Build a ScriptHeader from compile result.
 *
 * Matches the Rust struct:
 * ```rust
 * pub struct ScriptHeader {
 *     pub num_shorts: u32,
 *     pub num_longs: u32,
 *     pub num_floats: u32,
 *     pub bytecode_length: u32,
 *     pub variables_length: u32,
 * }
 * ```
 */
export function buildScriptHeader(
    locals: Locals,
    bytecodeLength: number,
    variablesLength: number,
): ScriptHeader {
    return {
        num_shorts: locals.getShortCount(),
        num_longs: locals.getLongCount(),
        num_floats: locals.getFloatCount(),
        bytecode_length: bytecodeLength,
        variables_length: variablesLength,
    };
}

// ---------------------------------------------------------------------------
//  Full Script record assembly
// ---------------------------------------------------------------------------

/**
 * Data produced by buildScriptRecord, compatible with TES3_Script fields.
 * Can be merged into an existing record via Object.assign().
 */
export interface ScriptRecordData {
    header: ScriptHeader;
    bytecode: number[];   // raw bytes as number[] (matches TES3_Script.bytecode)
    variables: number[];  // raw bytes as number[] (matches TES3_Script.variables)
    text: string;
}

/**
 * Build a full Script record data object from source text and compile result.
 *
 * The returned object contains all fields needed to update a TES3_Script
 * record in IndexedDB: header, bytecode (SCDT), variables (SCVR), and
 * source text (SCTX).
 *
 * @param source    - Original MWScript source text
 * @param result    - Output from codegen.compile()
 * @returns         - Script record data ready to merge into entry
 */
export function buildScriptRecord(
    source: string,
    result: CompileResult,
): ScriptRecordData {
    const scdtBytes = serializeSCDT(result.code);
    const scvrBytes = serializeSCVR(result.locals);

    const header = buildScriptHeader(
        result.locals,
        scdtBytes.length,
        scvrBytes.length,
    );

    return {
        header,
        bytecode: Array.from(scdtBytes),
        variables: Array.from(scvrBytes),
        text: source,
    };
}
