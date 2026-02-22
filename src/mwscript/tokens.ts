/**
 * MWScript token definitions.
 *
 * Mirrors the tokenisation rules of the OpenMW compiler
 * (components/compiler/scanner.hpp).
 */

// ---------------------------------------------------------------------------
//  Token types
// ---------------------------------------------------------------------------

export enum TokenType {
    Integer = 'Integer',
    Float = 'Float',
    String = 'String',
    Name = 'Name',      // identifier or unknown name
    Keyword = 'Keyword',
    Special = 'Special',
    Comment = 'Comment',
    EOF = 'EOF',
}

// ---------------------------------------------------------------------------
//  MWScript keywords  (case-insensitive in source)
// ---------------------------------------------------------------------------

export enum Keyword {
    Begin = 'begin',
    End = 'end',
    Short = 'short',
    Long = 'long',
    Float = 'float',
    Set = 'set',
    To = 'to',
    If = 'if',
    ElseIf = 'elseif',
    Else = 'else',
    EndIf = 'endif',
    While = 'while',
    EndWhile = 'endwhile',
    Return = 'return',
    MessageBox = 'messagebox',
}

/** Lowercase keyword → enum value lookup */
export const KEYWORD_MAP: ReadonlyMap<string, Keyword> = new Map(
    Object.values(Keyword).map(k => [k, k]),
);

// ---------------------------------------------------------------------------
//  Special characters / operators
// ---------------------------------------------------------------------------

export enum Special {
    Newline = 'newline',
    OpenParen = '(',
    CloseParen = ')',
    Plus = '+',
    Minus = '-',
    Star = '*',
    Slash = '/',
    Equal = '==',
    NotEqual = '!=',
    LessThan = '<',
    LessEqual = '<=',
    GreaterThan = '>',
    GreaterEqual = '>=',
    Comma = ',',
    Arrow = '->',
    Dot = '.',
}

// ---------------------------------------------------------------------------
//  Source location
// ---------------------------------------------------------------------------

export interface TokenLoc {
    /** 1-based line number */
    line: number;
    /** 0-based column offset */
    column: number;
}

// ---------------------------------------------------------------------------
//  Token
// ---------------------------------------------------------------------------

export interface Token {
    type: TokenType;
    /** Raw text value of the token */
    value: string;
    /** Set when type === Keyword */
    keyword?: Keyword;
    /** Set when type === Special */
    special?: Special;
    /** Location of the first character of this token */
    loc: TokenLoc;
}
