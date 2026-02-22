/**
 * MWScript scanner (tokenizer).
 *
 * Converts a source string into a stream of `Token` objects.
 * Case-insensitive for keywords; preserves original casing in `value`.
 *
 * Design mirrors OpenMW `components/compiler/scanner.cpp`.
 */

import {
    type Token,
    type TokenLoc,
    TokenType,
    Keyword,
    Special,
    KEYWORD_MAP,
} from './tokens';

export class Scanner {
    private readonly source: string;
    private pos = 0;
    private line = 1;
    private col = 0;

    /** Peeked token (one-token lookahead) */
    private peeked: Token | null = null;

    constructor(source: string) {
        this.source = source;
    }

    // -----------------------------------------------------------------------
    //  Public API
    // -----------------------------------------------------------------------

    /** Return the next token, consuming it from the stream. */
    scan(): Token {
        if (this.peeked) {
            const t = this.peeked;
            this.peeked = null;
            return t;
        }
        return this.readToken();
    }

    /** Return the next token without consuming it. */
    peek(): Token {
        if (!this.peeked) {
            this.peeked = this.readToken();
        }
        return this.peeked;
    }

    // -----------------------------------------------------------------------
    //  Core reader
    // -----------------------------------------------------------------------

    private readToken(): Token {
        this.skipWhitespace();

        if (this.pos >= this.source.length) {
            return this.makeToken(TokenType.EOF, '', this.loc());
        }

        const loc = this.loc();
        const ch = this.current();

        // Comments: ; until end of line
        if (ch === ';') {
            return this.readComment(loc);
        }

        // String literals: "..."
        if (ch === '"') {
            return this.readString(loc);
        }

        // Numbers: digit or leading dot-digit
        if (this.isDigit(ch) || (ch === '.' && this.pos + 1 < this.source.length && this.isDigit(this.source[this.pos + 1]))) {
            return this.readNumber(loc);
        }

        // Identifiers / keywords
        if (this.isIdentStart(ch)) {
            return this.readName(loc);
        }

        // Newlines (significant in MWScript)
        if (ch === '\n') {
            this.advance();
            return this.makeToken(TokenType.Special, '\n', loc, undefined, Special.Newline);
        }
        if (ch === '\r') {
            this.advance();
            if (this.current() === '\n') this.advance();
            return this.makeToken(TokenType.Special, '\n', loc, undefined, Special.Newline);
        }

        // Multi-char operators
        const two = this.pos + 1 < this.source.length ? ch + this.source[this.pos + 1] : '';
        if (two === '->') { this.advance(); this.advance(); return this.makeToken(TokenType.Special, '->', loc, undefined, Special.Arrow); }
        if (two === '==') { this.advance(); this.advance(); return this.makeToken(TokenType.Special, '==', loc, undefined, Special.Equal); }
        if (two === '!=') { this.advance(); this.advance(); return this.makeToken(TokenType.Special, '!=', loc, undefined, Special.NotEqual); }
        if (two === '<=') { this.advance(); this.advance(); return this.makeToken(TokenType.Special, '<=', loc, undefined, Special.LessEqual); }
        if (two === '>=') { this.advance(); this.advance(); return this.makeToken(TokenType.Special, '>=', loc, undefined, Special.GreaterEqual); }

        // Single-char operators
        const specialMap: Record<string, Special> = {
            '(': Special.OpenParen,
            ')': Special.CloseParen,
            '+': Special.Plus,
            '-': Special.Minus,
            '*': Special.Star,
            '/': Special.Slash,
            '<': Special.LessThan,
            '>': Special.GreaterThan,
            ',': Special.Comma,
            '.': Special.Dot,
        };
        if (ch in specialMap) {
            this.advance();
            return this.makeToken(TokenType.Special, ch, loc, undefined, specialMap[ch]);
        }

        // Unknown character — skip and return as Name
        this.advance();
        return this.makeToken(TokenType.Name, ch, loc);
    }

    // -----------------------------------------------------------------------
    //  Sub-readers
    // -----------------------------------------------------------------------

    private readComment(loc: TokenLoc): Token {
        const start = this.pos;
        while (this.pos < this.source.length && this.source[this.pos] !== '\n' && this.source[this.pos] !== '\r') {
            this.advance();
        }
        return this.makeToken(TokenType.Comment, this.source.slice(start, this.pos), loc);
    }

    private readString(loc: TokenLoc): Token {
        this.advance(); // skip opening "
        const start = this.pos;
        while (this.pos < this.source.length && this.source[this.pos] !== '"' && this.source[this.pos] !== '\n') {
            this.advance();
        }
        const value = this.source.slice(start, this.pos);
        if (this.current() === '"') {
            this.advance(); // skip closing "
        }
        return this.makeToken(TokenType.String, value, loc);
    }

    private readNumber(loc: TokenLoc): Token {
        const start = this.pos;
        let isFloat = false;

        // Integer part
        while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
            this.advance();
        }

        // Decimal part
        if (this.current() === '.' && this.pos + 1 < this.source.length && this.isDigit(this.source[this.pos + 1])) {
            isFloat = true;
            this.advance(); // skip .
            while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
                this.advance();
            }
        } else if (this.current() === '.' && start === this.pos) {
            // Starts with dot: .123
            isFloat = true;
            this.advance(); // skip .
            while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
                this.advance();
            }
        }

        const value = this.source.slice(start, this.pos);
        return this.makeToken(isFloat ? TokenType.Float : TokenType.Integer, value, loc);
    }

    private readName(loc: TokenLoc): Token {
        const start = this.pos;
        while (this.pos < this.source.length && this.isIdentChar(this.source[this.pos])) {
            this.advance();
        }
        const value = this.source.slice(start, this.pos);
        const lower = value.toLowerCase();

        const kw = KEYWORD_MAP.get(lower);
        if (kw !== undefined) {
            return this.makeToken(TokenType.Keyword, value, loc, kw);
        }
        return this.makeToken(TokenType.Name, value, loc);
    }

    // -----------------------------------------------------------------------
    //  Helpers
    // -----------------------------------------------------------------------

    private skipWhitespace(): void {
        while (this.pos < this.source.length) {
            const ch = this.source[this.pos];
            if (ch === ' ' || ch === '\t') {
                this.advance();
            } else {
                break;
            }
        }
    }

    private current(): string {
        return this.pos < this.source.length ? this.source[this.pos] : '';
    }

    private advance(): void {
        if (this.pos < this.source.length) {
            if (this.source[this.pos] === '\n') {
                this.line++;
                this.col = 0;
            } else {
                this.col++;
            }
            this.pos++;
        }
    }

    private loc(): TokenLoc {
        return { line: this.line, column: this.col };
    }

    private isDigit(ch: string): boolean {
        return ch >= '0' && ch <= '9';
    }

    private isIdentStart(ch: string): boolean {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
    }

    private isIdentChar(ch: string): boolean {
        return this.isIdentStart(ch) || this.isDigit(ch);
    }

    private makeToken(
        type: TokenType,
        value: string,
        loc: TokenLoc,
        keyword?: Keyword,
        special?: Special,
    ): Token {
        return { type, value, loc, keyword, special };
    }
}
