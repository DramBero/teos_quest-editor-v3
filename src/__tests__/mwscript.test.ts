import { describe, it, expect } from 'vitest';
import { Scanner } from '@/mwscript/scanner';
import { TokenType, Keyword, Special } from '@/mwscript/tokens';
import { parseForDiagnostics as parse } from '@/mwscript/parser';
import { EXTENSIONS, EXTENSION_NAMES } from '@/mwscript/extensions';

// ===========================================================================
//  Scanner
// ===========================================================================

describe('Scanner', () => {
    it('tokenizes keywords case-insensitively', () => {
        const s = new Scanner('Begin Set If End');
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.Begin });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.Set });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.If });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.End });
        expect(s.scan()).toMatchObject({ type: TokenType.EOF });
    });

    it('handles mixed case keywords', () => {
        const s = new Scanner('BEGIN set IF');
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.Begin, value: 'BEGIN' });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.Set, value: 'set' });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.If, value: 'IF' });
    });

    it('tokenizes identifiers', () => {
        const s = new Scanner('myVariable _test123');
        expect(s.scan()).toMatchObject({ type: TokenType.Name, value: 'myVariable' });
        expect(s.scan()).toMatchObject({ type: TokenType.Name, value: '_test123' });
    });

    it('tokenizes integers', () => {
        const s = new Scanner('42 0 999');
        expect(s.scan()).toMatchObject({ type: TokenType.Integer, value: '42' });
        expect(s.scan()).toMatchObject({ type: TokenType.Integer, value: '0' });
        expect(s.scan()).toMatchObject({ type: TokenType.Integer, value: '999' });
    });

    it('tokenizes floats', () => {
        const s = new Scanner('3.14 .5 100.0');
        expect(s.scan()).toMatchObject({ type: TokenType.Float, value: '3.14' });
        expect(s.scan()).toMatchObject({ type: TokenType.Float, value: '.5' });
        expect(s.scan()).toMatchObject({ type: TokenType.Float, value: '100.0' });
    });

    it('tokenizes strings', () => {
        const s = new Scanner('"Hello World" "test"');
        expect(s.scan()).toMatchObject({ type: TokenType.String, value: 'Hello World' });
        expect(s.scan()).toMatchObject({ type: TokenType.String, value: 'test' });
    });

    it('tokenizes comments', () => {
        const s = new Scanner('; This is a comment\nset');
        expect(s.scan()).toMatchObject({ type: TokenType.Comment, value: '; This is a comment' });
        expect(s.scan()).toMatchObject({ type: TokenType.Special, special: Special.Newline });
        expect(s.scan()).toMatchObject({ type: TokenType.Keyword, keyword: Keyword.Set });
    });

    it('tokenizes operators', () => {
        const s = new Scanner('+ - * / == != <= >= < > -> , ( )');
        expect(s.scan()).toMatchObject({ special: Special.Plus });
        expect(s.scan()).toMatchObject({ special: Special.Minus });
        expect(s.scan()).toMatchObject({ special: Special.Star });
        expect(s.scan()).toMatchObject({ special: Special.Slash });
        expect(s.scan()).toMatchObject({ special: Special.Equal });
        expect(s.scan()).toMatchObject({ special: Special.NotEqual });
        expect(s.scan()).toMatchObject({ special: Special.LessEqual });
        expect(s.scan()).toMatchObject({ special: Special.GreaterEqual });
        expect(s.scan()).toMatchObject({ special: Special.LessThan });
        expect(s.scan()).toMatchObject({ special: Special.GreaterThan });
        expect(s.scan()).toMatchObject({ special: Special.Arrow });
        expect(s.scan()).toMatchObject({ special: Special.Comma });
        expect(s.scan()).toMatchObject({ special: Special.OpenParen });
        expect(s.scan()).toMatchObject({ special: Special.CloseParen });
    });

    it('tokenizes newlines', () => {
        const s = new Scanner('a\nb');
        expect(s.scan()).toMatchObject({ type: TokenType.Name, value: 'a' });
        expect(s.scan()).toMatchObject({ type: TokenType.Special, special: Special.Newline });
        expect(s.scan()).toMatchObject({ type: TokenType.Name, value: 'b' });
    });

    it('peek does not consume token', () => {
        const s = new Scanner('hello');
        expect(s.peek()).toMatchObject({ value: 'hello' });
        expect(s.peek()).toMatchObject({ value: 'hello' });
        expect(s.scan()).toMatchObject({ value: 'hello' });
        expect(s.scan()).toMatchObject({ type: TokenType.EOF });
    });

    it('tracks line and column numbers', () => {
        const s = new Scanner('a\nb c');
        const a = s.scan();
        expect(a.loc).toEqual({ line: 1, column: 0 });
        s.scan(); // newline
        const b = s.scan();
        expect(b.loc).toEqual({ line: 2, column: 0 });
        const c = s.scan();
        expect(c.loc).toEqual({ line: 2, column: 2 });
    });
});

// ===========================================================================
//  Parser
// ===========================================================================

describe('Parser', () => {
    it('parses a minimal valid script', () => {
        const diags = parse('Begin TestScript\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses a script with variable declarations', () => {
        const diags = parse('Begin Test\nshort x\nlong y\nfloat z\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses set/to assignment', () => {
        const diags = parse('Begin Test\nshort x\nset x to 42\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses if/endif', () => {
        const diags = parse('Begin Test\nshort x\nif (x == 1)\nset x to 2\nendif\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses if/elseif/else/endif', () => {
        const diags = parse(`Begin Test
short x
if (x == 1)
  set x to 2
elseif (x == 3)
  set x to 4
else
  set x to 0
endif
End`);
        expect(diags).toEqual([]);
    });

    it('parses while/endwhile', () => {
        const diags = parse('Begin Test\nshort x\nwhile (x < 10)\nset x to x + 1\nendwhile\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses function calls', () => {
        const diags = parse('Begin Test\nfloat d\nset d to GetDistance player\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses instruction calls', () => {
        const diags = parse('Begin Test\nAITravel 100 200 300\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses explicit references with arrow', () => {
        const diags = parse('Begin Test\nshort x\nset x to player->GetHealth\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses MessageBox', () => {
        const diags = parse('Begin Test\nMessageBox "Hello World"\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses return', () => {
        const diags = parse('Begin Test\nreturn\nEnd');
        expect(diags).toEqual([]);
    });

    it('detects missing Begin', () => {
        const diags = parse('set x to 1\nEnd');
        expect(diags.length).toBeGreaterThan(0);
        expect(diags[0].severity).toBe('error');
    });

    it('detects missing End', () => {
        const diags = parse('Begin Test\nset x to 1');
        expect(diags.length).toBeGreaterThan(0);
    });

    it('detects missing EndIf', () => {
        const diags = parse('Begin Test\nif (1)\nset x to 1\nEnd');
        expect(diags.length).toBeGreaterThan(0);
    });

    it('detects missing EndWhile', () => {
        const diags = parse('Begin Test\nwhile (1)\nset x to 1\nEnd');
        expect(diags.length).toBeGreaterThan(0);
    });

    it('warns about duplicate variable declarations', () => {
        const diags = parse('Begin Test\nshort x\nshort x\nEnd');
        const warn = diags.find(d => d.severity === 'warning');
        expect(warn).toBeDefined();
        expect(warn!.message).toContain('already declared');
    });

    it('parses complex expression', () => {
        const diags = parse('Begin Test\nfloat x\nset x to (1 + 2) * 3 - 4 / 2\nEnd');
        expect(diags).toEqual([]);
    });

    it('parses comparison operators', () => {
        const diags = parse('Begin Test\nshort x\nif (x >= 5)\nendif\nif (x != 0)\nendif\nEnd');
        expect(diags).toEqual([]);
    });

    it('handles comments in scripts', () => {
        const diags = parse('; comment at top\nBegin Test\n; inside comment\nshort x ; inline... sort of\nEnd');
        expect(diags).toEqual([]);
    });
});

// ===========================================================================
//  Extensions
// ===========================================================================

describe('Extensions registry', () => {
    it('contains expected functions', () => {
        expect(EXTENSION_NAMES.has('getdistance')).toBe(true);
        expect(EXTENSION_NAMES.has('aitravel')).toBe(true);
        expect(EXTENSION_NAMES.has('additem')).toBe(true);
        expect(EXTENSION_NAMES.has('getbuttonpressed')).toBe(true);
    });

    it('contains generated attribute commands', () => {
        expect(EXTENSION_NAMES.has('getstrength')).toBe(true);
        expect(EXTENSION_NAMES.has('setstrength')).toBe(true);
        expect(EXTENSION_NAMES.has('modstrength')).toBe(true);
        expect(EXTENSION_NAMES.has('getluck')).toBe(true);
    });

    it('contains generated skill commands', () => {
        expect(EXTENSION_NAMES.has('getblock')).toBe(true);
        expect(EXTENSION_NAMES.has('sethandtohand')).toBe(true);
        expect(EXTENSION_NAMES.has('modalchemy')).toBe(true);
    });

    it('contains generated dynamic commands', () => {
        expect(EXTENSION_NAMES.has('gethealth')).toBe(true);
        expect(EXTENSION_NAMES.has('sethealth')).toBe(true);
        expect(EXTENSION_NAMES.has('modcurrenthealth')).toBe(true);
        expect(EXTENSION_NAMES.has('gethealthgetratio')).toBe(true);
    });

    it('contains generated magic effect commands', () => {
        expect(EXTENSION_NAMES.has('getresistfire')).toBe(true);
        expect(EXTENSION_NAMES.has('setresistfire')).toBe(true);
        expect(EXTENSION_NAMES.has('modresistfire')).toBe(true);
    });

    it('has correct return types for functions', () => {
        expect(EXTENSIONS.getdistance.returnType).toBe('f');
        expect(EXTENSIONS.getdistance.kind).toBe('function');
        expect(EXTENSIONS.aitravel.kind).toBe('instruction');
        expect(EXTENSIONS.aitravel.returnType).toBeNull();
    });

    it('has correct argument types', () => {
        expect(EXTENSIONS.aitravel.args).toBe('fff/lx');
        expect(EXTENSIONS.additem.args).toBe('clX');
        expect(EXTENSIONS.getdistance.args).toBe('c');
    });

    it('has at least 300 commands', () => {
        expect(Object.keys(EXTENSIONS).length).toBeGreaterThanOrEqual(300);
    });
});
