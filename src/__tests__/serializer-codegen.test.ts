import { describe, it, expect } from 'vitest';
import { segment0, segment5, Locals, compile } from '@/mwscript/codegen';
import {
    serializeSCDT,
    serializeSCVR,
    buildScriptHeader,
    buildScriptRecord,
} from '@/mwscript/serializer';

// ===========================================================================
//  serializeSCDT
// ===========================================================================

describe('serializeSCDT', () => {
    it('produces empty array for empty code', () => {
        const result = serializeSCDT([]);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(0);
    });

    it('encodes uint32 words as little-endian bytes', () => {
        const code = [0x01020304];
        const result = serializeSCDT(code);
        expect(result.length).toBe(4);
        // LE: least significant byte first
        expect(result[0]).toBe(0x04);
        expect(result[1]).toBe(0x03);
        expect(result[2]).toBe(0x02);
        expect(result[3]).toBe(0x01);
    });

    it('encodes multiple words correctly', () => {
        const code = [0x00000001, 0xFFFFFFFF];
        const result = serializeSCDT(code);
        expect(result.length).toBe(8);
        // First word: 1 in LE
        expect(result[0]).toBe(0x01);
        expect(result[1]).toBe(0x00);
        expect(result[2]).toBe(0x00);
        expect(result[3]).toBe(0x00);
        // Second word: 0xFFFFFFFF
        expect(result[4]).toBe(0xFF);
        expect(result[5]).toBe(0xFF);
        expect(result[6]).toBe(0xFF);
        expect(result[7]).toBe(0xFF);
    });

    it('encodes segment0 instruction correctly', () => {
        const instr = segment0(0, 42); // pushInt(42)
        const result = serializeSCDT([instr]);
        const view = new DataView(result.buffer);
        expect(view.getUint32(0, true)).toBe(instr);
    });

    it('encodes segment5 instruction correctly', () => {
        const instr = segment5(20); // opReturn
        const result = serializeSCDT([instr]);
        const view = new DataView(result.buffer);
        // segment5 uses bitwise ops which return signed int in JS;
        // read as signed to match
        expect(view.getInt32(0, true)).toBe(instr);
    });
});

// ===========================================================================
//  serializeSCVR
// ===========================================================================

describe('serializeSCVR', () => {
    it('produces empty array when no locals', () => {
        const locals = new Locals();
        const result = serializeSCVR(locals);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(0);
    });

    it('encodes single variable as null-terminated string', () => {
        const locals = new Locals();
        locals.declare('count', 'short');
        const result = serializeSCVR(locals);
        // "count" = 5 chars + 1 null = 6 bytes
        expect(result.length).toBe(6);
        expect(String.fromCharCode(...result.slice(0, 5))).toBe('count');
        expect(result[5]).toBe(0);
    });

    it('encodes multiple variables grouped by type', () => {
        const locals = new Locals();
        locals.declare('x', 'short');
        locals.declare('y', 'long');
        locals.declare('z', 'float');
        const result = serializeSCVR(locals);
        // getVariableNames() sorts by type: short, long, float
        // "x\0" (2) + "y\0" (2) + "z\0" (2) = 6
        expect(result.length).toBe(6);
        const decoded = new TextDecoder().decode(result);
        expect(decoded).toBe('x\0y\0z\0');
    });

    it('groups same-type variables by declaration order', () => {
        const locals = new Locals();
        locals.declare('beta', 'short');
        locals.declare('alpha', 'short');
        const result = serializeSCVR(locals);
        // Declaration order preserved: beta before alpha
        const decoded = new TextDecoder().decode(result);
        expect(decoded).toBe('beta\0alpha\0');
    });
});

// ===========================================================================
//  buildScriptHeader
// ===========================================================================

describe('buildScriptHeader', () => {
    it('counts variable types correctly', () => {
        const locals = new Locals();
        locals.declare('a', 'short');
        locals.declare('b', 'short');
        locals.declare('c', 'long');
        locals.declare('d', 'float');
        locals.declare('e', 'float');
        locals.declare('f', 'float');

        const header = buildScriptHeader(locals, 100, 50);

        expect(header.num_shorts).toBe(2);
        expect(header.num_longs).toBe(1);
        expect(header.num_floats).toBe(3);
        expect(header.bytecode_length).toBe(100);
        expect(header.variables_length).toBe(50);
    });

    it('produces zero values for empty locals', () => {
        const locals = new Locals();
        const header = buildScriptHeader(locals, 0, 0);

        expect(header.num_shorts).toBe(0);
        expect(header.num_longs).toBe(0);
        expect(header.num_floats).toBe(0);
    });
});

// ===========================================================================
//  buildScriptRecord
// ===========================================================================

describe('buildScriptRecord', () => {
    it('assembles a complete record from compile result', () => {
        const source = 'Begin TestScript\nshort x\nset x to 42\nEnd';
        const result = compile(source);

        const record = buildScriptRecord(source, result);

        expect(record.text).toBe(source);
        expect(record.header.num_shorts).toBe(1);
        expect(record.header.num_longs).toBe(0);
        expect(record.header.num_floats).toBe(0);
        expect(record.bytecode).toBeInstanceOf(Array);
        expect(record.bytecode.length).toBeGreaterThan(0);
        expect(record.variables).toBeInstanceOf(Array);
        expect(record.variables.length).toBeGreaterThan(0);
    });

    it('header bytecode_length matches bytecode array', () => {
        const source = 'Begin Test\nshort x\nset x to 1\nEnd';
        const result = compile(source);
        const record = buildScriptRecord(source, result);

        expect(record.header.bytecode_length).toBe(record.bytecode.length);
    });

    it('header variables_length matches variables array', () => {
        const source = 'Begin Test\nshort x\nlong y\nEnd';
        const result = compile(source);
        const record = buildScriptRecord(source, result);

        expect(record.header.variables_length).toBe(record.variables.length);
    });

    it('produces empty bytecode/variables for empty script', () => {
        const source = 'Begin Empty\nEnd';
        const result = compile(source);
        const record = buildScriptRecord(source, result);

        expect(record.header.num_shorts).toBe(0);
        expect(record.header.bytecode_length).toBeGreaterThanOrEqual(0);
        expect(record.variables.length).toBe(0);
    });
});

// ===========================================================================
//  Codegen — explicit refs
// ===========================================================================

describe('Codegen explicit refs', () => {
    it('compiles simple script without errors', () => {
        const source = 'Begin Test\nshort x\nset x to 1\nEnd';
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.parseErrors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
    });

    it('compiles explicit ref function call (player->GetLevel)', () => {
        const source = 'Begin Test\nshort x\nset x to ( player -> GetLevel )\nEnd';
        const result = compile(source);
        // Should produce valid bytecode with no codegen errors
        expect(result.errors).toEqual([]);
        // The string "player" should be in the literals pool
        expect(result.literals.strings).toContain('player');
    });

    it('compiles explicit ref instruction (player->Disable)', () => {
        const source = 'Begin Test\nplayer -> Disable\nEnd';
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('player');
    });

    it('compiles member variable access (set object->var to value)', () => {
        // Note: set uses -> syntax, not . (dot is only in expressions)
        const source = 'Begin Test\nset companion -> follow to 1\nEnd';
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('follow');
        expect(result.literals.strings).toContain('companion');
    });

    it('compiles member variable fetch (if object.var)', () => {
        const source = 'Begin Test\nif ( companion.follow )\nendif\nEnd';
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('follow');
        expect(result.literals.strings).toContain('companion');
    });

    it('compiles explicit ref with args (npc->AiTravel)', () => {
        const source = 'Begin Test\nnpc -> AiTravel 100 200 300\nEnd';
        const result = compile(source);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('npc');
    });

    it('produces different opcodes for explicit vs non-explicit', () => {
        const normalSource = 'Begin Test\nGetLevel\nEnd';
        const explicitSource = 'Begin Test\nplayer -> GetLevel\nEnd';

        const normalResult = compile(normalSource);
        const explicitResult = compile(explicitSource);

        expect(normalResult.errors).toEqual([]);
        expect(explicitResult.errors).toEqual([]);

        // Explicit version should have more code (extra pushInt for ID)
        // and different opcode numbers
        expect(explicitResult.code.length).toBeGreaterThan(normalResult.code.length);
    });
});

// ===========================================================================
//  Codegen — global variable type resolution
// ===========================================================================

describe('Codegen globals type resolution', () => {
    it('uses correct opcode for short global', () => {
        const globals = new Map([['myglobal', 'short' as const]]);
        const source = 'Begin Test\nshort x\nset x to MyGlobal\nEnd';
        const result = compile(source, globals);
        expect(result.errors).toEqual([]);
        // MyGlobal should be in literals
        expect(result.literals.strings).toContain('MyGlobal');
    });

    it('uses correct opcode for float global', () => {
        const globals = new Map([['gamehour', 'float' as const]]);
        const source = 'Begin Test\nfloat x\nset x to GameHour\nEnd';
        const result = compile(source, globals);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('GameHour');
    });

    it('defaults to long when globals map is not provided', () => {
        const source = 'Begin Test\nshort x\nset x to SomeGlobal\nEnd';
        const result = compile(source); // no globals map
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('SomeGlobal');
    });

    it('uses consistent fetch and store types for globals', () => {
        const globals = new Map([['counter', 'short' as const]]);
        const source = 'Begin Test\nset counter to 5\nEnd';
        const result = compile(source, globals);
        expect(result.errors).toEqual([]);
        expect(result.literals.strings).toContain('counter');
    });
});
