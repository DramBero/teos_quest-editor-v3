/**
 * MWScript parser — recursive descent with AST generation & diagnostics.
 *
 * Produces a `ParseResult` containing both an AST and diagnostic messages.
 * The AST is consumed by the code generator; diagnostics power the editor.
 *
 * Grammar (simplified):
 *   script     → 'Begin' NAME newlines body 'End' NAME?
 *   body       → (statement newlines)*
 *   statement  → declaration | assignment | ifBlock | whileBlock
 *               | instruction | functionCall | 'Return'
 *   declaration → ('Short'|'Long'|'Float') NAME
 *   assignment  → 'Set' target 'To' expression
 *   target      → NAME | NAME '->' NAME
 *   ifBlock     → 'If' '(' expression ')' body
 *                  ('ElseIf' '(' expression ')' body)*
 *                  ('Else' body)?
 *                  'EndIf'
 *   whileBlock  → 'While' '(' expression ')' body 'EndWhile'
 *   expression  → comparison ( ('==' | '!=' | '<' | '<=' | '>' | '>=') comparison )?
 *   comparison  → term ( ('+' | '-') term )*
 *   term        → factor ( ('*' | '/') factor )*
 *   factor      → '-' factor | atom
 *   atom        → NUMBER | NAME | NAME '->' NAME | '(' expression ')' | functionCall
 */

import {
    type Token,
    type TokenLoc,
    TokenType,
    Keyword,
    Special,
} from './tokens';
import { Scanner } from './scanner';
import { EXTENSION_NAMES, EXTENSIONS } from './extensions';
import type {
    ScriptNode, StmtNode, ExprNode, DeclareNode, VarType,
    SetNode, IfNode, IfBranch, WhileNode, ReturnNode,
    CallStmtNode, MessageBoxNode, CallExprNode,
    LiteralIntNode, LiteralFloatNode, LiteralStringNode,
    IdentNode, MemberAccessNode, BinaryNode, UnaryNode, Loc,
} from './ast';

// ---------------------------------------------------------------------------
//  Diagnostic
// ---------------------------------------------------------------------------

export type Severity = 'error' | 'warning' | 'info';

export interface Diagnostic {
    line: number;
    column: number;
    message: string;
    severity: Severity;
}

// ---------------------------------------------------------------------------
//  Parse result
// ---------------------------------------------------------------------------

export interface ParseResult {
    diagnostics: Diagnostic[];
    ast: ScriptNode | null;
}

// ---------------------------------------------------------------------------
//  Parser
// ---------------------------------------------------------------------------

export class Parser {
    private scanner: Scanner;
    private diagnostics: Diagnostic[] = [];
    private declaredVars = new Map<string, VarType>(); // name → type
    private scriptName = '';

    constructor(source: string) {
        this.scanner = new Scanner(source);
    }

    /** Parse the source and return AST + diagnostics. */
    parse(): ParseResult {
        let ast: ScriptNode | null = null;
        try {
            ast = this.parseScript();
        } catch {
            // Fatal parse error — diagnostics already recorded
        }
        return { diagnostics: this.diagnostics, ast };
    }

    // -----------------------------------------------------------------------
    //  Helpers
    // -----------------------------------------------------------------------

    private loc(tok: Token | TokenLoc): Loc {
        if ('line' in tok && 'column' in tok && !('type' in tok)) {
            return { line: tok.line, column: tok.column };
        }
        return { line: (tok as Token).loc.line, column: (tok as Token).loc.column };
    }

    // -----------------------------------------------------------------------
    //  Top-level
    // -----------------------------------------------------------------------

    private parseScript(): ScriptNode {
        const startTok = this.scanner.peek();
        const scriptLoc = this.loc(startTok);

        this.skipNewlines();

        // Begin ScriptName
        const begin = this.scanner.peek();
        if (begin.type !== TokenType.Keyword || begin.keyword !== Keyword.Begin) {
            this.error(begin.loc, 'Expected "Begin" at start of script');
            return { kind: 'script', name: '', declarations: [], body: [], loc: scriptLoc };
        }
        this.scanner.scan(); // consume Begin
        this.skipNewlines();

        const nameTok = this.scanner.peek();
        if (nameTok.type === TokenType.Name || nameTok.type === TokenType.Keyword) {
            this.scriptName = nameTok.value;
            this.scanner.scan();
        } else {
            this.error(nameTok.loc, 'Expected script name after "Begin"');
        }

        this.expectNewline();

        // Body
        const stmts = this.parseBody([Keyword.End]);

        // Separate declarations from body statements
        const declarations: DeclareNode[] = [];
        const body: StmtNode[] = [];
        for (const s of stmts) {
            if (s.kind === 'declare') declarations.push(s);
            else body.push(s);
        }

        // End (optional script name)
        const end = this.scanner.peek();
        if (end.type === TokenType.Keyword && end.keyword === Keyword.End) {
            this.scanner.scan();
            const nextTok = this.scanner.peek();
            if (nextTok.type === TokenType.Name || nextTok.type === TokenType.Keyword) {
                this.scanner.scan();
            }
        } else {
            this.error(end.loc, 'Expected "End"');
        }

        this.skipNewlines();

        // Warn if content after End
        const after = this.scanner.peek();
        if (after.type !== TokenType.EOF) {
            this.warn(after.loc, 'Content after "End" is ignored');
        }

        return {
            kind: 'script',
            name: this.scriptName,
            declarations,
            body,
            loc: scriptLoc,
        };
    }

    // -----------------------------------------------------------------------
    //  Body — sequence of statements
    // -----------------------------------------------------------------------

    private parseBody(terminators: Keyword[]): StmtNode[] {
        const stmts: StmtNode[] = [];
        while (true) {
            this.skipNewlines();

            const tok = this.scanner.peek();
            if (tok.type === TokenType.EOF) break;
            if (tok.type === TokenType.Keyword && tok.keyword !== undefined && terminators.includes(tok.keyword)) {
                break;
            }
            if (tok.type === TokenType.Comment) {
                this.scanner.scan();
                continue;
            }

            const stmt = this.parseStatement();
            if (stmt) stmts.push(stmt);
        }
        return stmts;
    }

    // -----------------------------------------------------------------------
    //  Statement dispatcher
    // -----------------------------------------------------------------------

    private parseStatement(): StmtNode | null {
        const tok = this.scanner.peek();

        if (tok.type === TokenType.Comment) {
            this.scanner.scan();
            return null;
        }

        if (tok.type === TokenType.Keyword) {
            switch (tok.keyword) {
                case Keyword.Short:
                case Keyword.Long:
                case Keyword.Float:
                    return this.parseDeclaration();
                case Keyword.Set:
                    return this.parseAssignment();
                case Keyword.If:
                    return this.parseIf();
                case Keyword.While:
                    return this.parseWhile();
                case Keyword.Return:
                    this.scanner.scan();
                    return { kind: 'return', loc: this.loc(tok) } as ReturnNode;
                case Keyword.MessageBox:
                    return this.parseMessageBox();
                default:
                    break;
            }
        }

        // Name → instruction, function call, or explicit reference
        if (tok.type === TokenType.Name) {
            return this.parseNameStatement();
        }

        // Skip unknown token
        this.error(tok.loc, `Unexpected token: "${tok.value}"`);
        this.scanner.scan();
        return null;
    }

    // -----------------------------------------------------------------------
    //  Declarations
    // -----------------------------------------------------------------------

    private parseDeclaration(): DeclareNode {
        const typeTok = this.scanner.scan();
        const varType = typeTok.value.toLowerCase() as VarType;

        const nameTok = this.scanner.peek();
        if (nameTok.type !== TokenType.Name && nameTok.type !== TokenType.Keyword) {
            this.error(nameTok.loc, `Expected variable name after "${typeTok.value}"`);
            return { kind: 'declare', varType, name: '', loc: this.loc(typeTok) };
        }
        this.scanner.scan();

        const lowerName = nameTok.value.toLowerCase();
        if (this.declaredVars.has(lowerName)) {
            this.warn(nameTok.loc, `Variable "${nameTok.value}" already declared`);
        }
        this.declaredVars.set(lowerName, varType);

        return { kind: 'declare', varType, name: nameTok.value, loc: this.loc(typeTok) };
    }

    // -----------------------------------------------------------------------
    //  Assignment: Set target To expression
    // -----------------------------------------------------------------------

    private parseAssignment(): SetNode {
        const setTok = this.scanner.scan(); // consume Set

        // target: NAME or NAME -> NAME
        const nameTok = this.scanner.peek();
        if (nameTok.type !== TokenType.Name && nameTok.type !== TokenType.Keyword) {
            this.error(nameTok.loc, 'Expected variable name after "Set"');
            this.skipToNewline();
            return { kind: 'set', target: this.dummyIdent(nameTok), value: this.dummyInt(nameTok), loc: this.loc(setTok) };
        }
        this.scanner.scan();

        let target: IdentNode | MemberAccessNode;

        // Check for -> (member access)
        const arrow = this.scanner.peek();
        if (arrow.type === TokenType.Special && arrow.special === Special.Arrow) {
            this.scanner.scan();
            const memberTok = this.scanner.peek();
            if (memberTok.type !== TokenType.Name && memberTok.type !== TokenType.Keyword) {
                this.error(memberTok.loc, 'Expected member name after "->"');
                this.skipToNewline();
                return { kind: 'set', target: this.dummyIdent(nameTok), value: this.dummyInt(nameTok), loc: this.loc(setTok) };
            }
            this.scanner.scan();
            target = { kind: 'member_access', object: nameTok.value, member: memberTok.value, loc: this.loc(nameTok) };
        } else {
            target = { kind: 'ident', name: nameTok.value, loc: this.loc(nameTok) };
        }

        // 'To'
        const toTok = this.scanner.peek();
        if (toTok.type !== TokenType.Keyword || toTok.keyword !== Keyword.To) {
            this.error(toTok.loc, 'Expected "To" in Set statement');
            this.skipToNewline();
            return { kind: 'set', target, value: this.dummyInt(toTok), loc: this.loc(setTok) };
        }
        this.scanner.scan();

        // Expression
        const value = this.parseExpression();
        return { kind: 'set', target, value, loc: this.loc(setTok) };
    }

    // -----------------------------------------------------------------------
    //  If / ElseIf / Else / EndIf
    // -----------------------------------------------------------------------

    private parseIf(): IfNode {
        const ifTok = this.scanner.scan(); // consume If
        const branches: IfBranch[] = [];

        // First branch (if)
        const hasParen = this.tryConsume(Special.OpenParen);
        const cond = this.parseExpression();
        if (hasParen) this.expect(Special.CloseParen, '")"');

        this.expectNewline();
        const body = this.parseBody([Keyword.ElseIf, Keyword.Else, Keyword.EndIf, Keyword.End]);
        branches.push({ condition: cond, body, loc: this.loc(ifTok) });

        // ElseIf chain
        while (true) {
            const tok = this.scanner.peek();
            if (tok.type === TokenType.Keyword && tok.keyword === Keyword.ElseIf) {
                this.scanner.scan();
                const hasP = this.tryConsume(Special.OpenParen);
                const elseIfCond = this.parseExpression();
                if (hasP) this.expect(Special.CloseParen, '")"');
                this.expectNewline();
                const elseIfBody = this.parseBody([Keyword.ElseIf, Keyword.Else, Keyword.EndIf, Keyword.End]);
                branches.push({ condition: elseIfCond, body: elseIfBody, loc: this.loc(tok) });
            } else {
                break;
            }
        }

        // Else
        const elseTok = this.scanner.peek();
        if (elseTok.type === TokenType.Keyword && elseTok.keyword === Keyword.Else) {
            this.scanner.scan();
            this.expectNewline();
            const elseBody = this.parseBody([Keyword.EndIf, Keyword.End]);
            branches.push({ condition: null, body: elseBody, loc: this.loc(elseTok) });
        }

        // EndIf
        const endifTok = this.scanner.peek();
        if (endifTok.type === TokenType.Keyword && endifTok.keyword === Keyword.EndIf) {
            this.scanner.scan();
        } else {
            this.error(endifTok.loc, 'Expected "EndIf"');
        }

        return { kind: 'if', branches, loc: this.loc(ifTok) };
    }

    // -----------------------------------------------------------------------
    //  While / EndWhile
    // -----------------------------------------------------------------------

    private parseWhile(): WhileNode {
        const whileTok = this.scanner.scan(); // consume While

        const hasParen = this.tryConsume(Special.OpenParen);
        const condition = this.parseExpression();
        if (hasParen) this.expect(Special.CloseParen, '")"');

        this.expectNewline();
        const body = this.parseBody([Keyword.EndWhile, Keyword.End]);

        const endTok = this.scanner.peek();
        if (endTok.type === TokenType.Keyword && endTok.keyword === Keyword.EndWhile) {
            this.scanner.scan();
        } else {
            this.error(endTok.loc, 'Expected "EndWhile"');
        }

        return { kind: 'while', condition, body, loc: this.loc(whileTok) };
    }

    // -----------------------------------------------------------------------
    //  MessageBox (special syntax)
    // -----------------------------------------------------------------------

    private parseMessageBox(): MessageBoxNode {
        const mbTok = this.scanner.scan(); // consume MessageBox

        // Expect string message
        const msgTok = this.scanner.peek();
        let message: ExprNode;
        if (msgTok.type !== TokenType.String) {
            this.error(msgTok.loc, 'Expected message string after "MessageBox"');
            this.skipToNewline();
            message = { kind: 'literal_string', value: '', loc: this.loc(mbTok) };
            return { kind: 'messagebox', message, buttons: [], loc: this.loc(mbTok) };
        }
        this.scanner.scan();
        message = { kind: 'literal_string', value: msgTok.value, loc: this.loc(msgTok) };

        // Optional button labels — space-separated or comma-separated strings
        const buttons: ExprNode[] = [];
        while (!this.isLineEnd(this.scanner.peek())) {
            this.tryConsume(Special.Comma); // optional comma
            const next = this.scanner.peek();
            if (next.type === TokenType.String) {
                this.scanner.scan();
                buttons.push({ kind: 'literal_string', value: next.value, loc: this.loc(next) });
            } else if (this.isExprStart(next)) {
                buttons.push(this.parseExpression());
            } else {
                break;
            }
        }

        return { kind: 'messagebox', message, buttons, loc: this.loc(mbTok) };
    }

    // -----------------------------------------------------------------------
    //  Name statement: instruction, function call, or explicit ref
    // -----------------------------------------------------------------------

    private parseNameStatement(): CallStmtNode | null {
        const nameTok = this.scanner.scan();
        const lower = nameTok.value.toLowerCase();

        // Explicit reference: "objectId"->function ...
        const arrow = this.scanner.peek();
        if (arrow.type === TokenType.Special && arrow.special === Special.Arrow) {
            this.scanner.scan();
            const funcTok = this.scanner.peek();
            if (funcTok.type === TokenType.Name || funcTok.type === TokenType.Keyword) {
                const funcLower = funcTok.value.toLowerCase();
                this.scanner.scan();
                if (EXTENSION_NAMES.has(funcLower)) {
                    const args = this.consumeArgs(funcLower);
                    return { kind: 'call_stmt', name: funcLower, args, explicit: nameTok.value, loc: this.loc(nameTok) };
                }
                return { kind: 'call_stmt', name: funcLower, args: [], explicit: nameTok.value, loc: this.loc(nameTok) };
            } else {
                this.error(funcTok.loc, 'Expected function name after "->"');
            }
            return null;
        }

        // Dot member access: objectId.member
        if (arrow.type === TokenType.Special && arrow.special === Special.Dot) {
            this.scanner.scan();
            const memberTok = this.scanner.peek();
            if (memberTok.type === TokenType.Name || memberTok.type === TokenType.Keyword) {
                this.scanner.scan();
            }
            return null;
        }

        // Known instruction/function
        if (EXTENSION_NAMES.has(lower)) {
            const args = this.consumeArgs(lower);
            return { kind: 'call_stmt', name: lower, args, loc: this.loc(nameTok) };
        }

        // Unknown name — could be a variable output or typo.
        return null;
    }

    /** Consume arguments for a known extension. Best-effort, non-strict. */
    private consumeArgs(name: string): ExprNode[] {
        const ext = EXTENSIONS[name];
        if (!ext) return [];

        const argDefs = ext.args.replace('/', '');
        const args: ExprNode[] = [];

        for (const argType of argDefs) {
            const next = this.scanner.peek();
            if (this.isLineEnd(next)) break;

            switch (argType) {
                case 'f': case 'l': case 's': case 'X':
                    // Numeric arg — use parseUnary() so that space-separated
                    // negative numbers like `712 -2282` are two separate args
                    // instead of one expression `712 - 2282`.
                    if (this.isExprStart(next)) {
                        args.push(this.parseUnary());
                    }
                    break;
                case 'c': case 'S':
                    // String — can be a bare name or quoted string
                    if (next.type === TokenType.String) {
                        this.scanner.scan();
                        args.push({ kind: 'literal_string', value: next.value, loc: this.loc(next) });
                    } else if (next.type === TokenType.Name || next.type === TokenType.Keyword) {
                        this.scanner.scan();
                        args.push({ kind: 'literal_string', value: next.value, loc: this.loc(next) });
                    }
                    break;
                case 'x': case 'z': case 'j':
                    // Ignored / junk — skip one token if present,
                    // but NEVER consume operators or close-parens
                    // (those belong to the surrounding expression).
                    if (!this.isLineEnd(next)
                        && !(next.type === TokenType.Special && this.isOperatorOrParen(next.special))) {
                        this.scanner.scan();
                    }
                    break;
            }

            // Consume optional comma between args
            this.tryConsume(Special.Comma);
        }
        return args;
    }

    // -----------------------------------------------------------------------
    //  Expression parsing (precedence climbing)
    // -----------------------------------------------------------------------

    private parseExpression(): ExprNode {
        return this.parseComparison();
    }

    private parseComparison(): ExprNode {
        let left = this.parseAddSub();
        const tok = this.scanner.peek();
        if (tok.type === TokenType.Special && this.isCompareOp(tok.special)) {
            const op = this.specialToOp(tok.special!);
            this.scanner.scan();
            const right = this.parseAddSub();
            left = { kind: 'binary', op, left, right, loc: left.loc } as BinaryNode;
        }
        return left;
    }

    private parseAddSub(): ExprNode {
        let left = this.parseMulDiv();
        while (true) {
            const tok = this.scanner.peek();
            if (tok.type === TokenType.Special && (tok.special === Special.Plus || tok.special === Special.Minus)) {
                const op = tok.special === Special.Plus ? '+' as const : '-' as const;
                this.scanner.scan();
                const right = this.parseMulDiv();
                left = { kind: 'binary', op, left, right, loc: left.loc } as BinaryNode;
            } else {
                break;
            }
        }
        return left;
    }

    private parseMulDiv(): ExprNode {
        let left = this.parseUnary();
        while (true) {
            const tok = this.scanner.peek();
            if (tok.type === TokenType.Special && (tok.special === Special.Star || tok.special === Special.Slash)) {
                const op = tok.special === Special.Star ? '*' as const : '/' as const;
                this.scanner.scan();
                const right = this.parseUnary();
                left = { kind: 'binary', op, left, right, loc: left.loc } as BinaryNode;
            } else {
                break;
            }
        }
        return left;
    }

    private parseUnary(): ExprNode {
        const tok = this.scanner.peek();
        if (tok.type === TokenType.Special && tok.special === Special.Minus) {
            this.scanner.scan();
            const operand = this.parseUnary();
            return { kind: 'unary', op: '-', operand, loc: this.loc(tok) } as UnaryNode;
        }
        return this.parseAtom();
    }

    private parseAtom(): ExprNode {
        const tok = this.scanner.peek();

        // Integer
        if (tok.type === TokenType.Integer) {
            this.scanner.scan();
            return { kind: 'literal_int', value: parseInt(tok.value, 10), loc: this.loc(tok) } as LiteralIntNode;
        }

        // Float
        if (tok.type === TokenType.Float) {
            this.scanner.scan();
            return { kind: 'literal_float', value: parseFloat(tok.value), loc: this.loc(tok) } as LiteralFloatNode;
        }

        // String
        if (tok.type === TokenType.String) {
            this.scanner.scan();
            return { kind: 'literal_string', value: tok.value, loc: this.loc(tok) } as LiteralStringNode;
        }

        // Parenthesized expression
        if (tok.type === TokenType.Special && tok.special === Special.OpenParen) {
            this.scanner.scan();
            const expr = this.parseExpression();
            this.expect(Special.CloseParen, '")"');
            return expr;
        }

        // Name (variable, function call, member access)
        if (tok.type === TokenType.Name || tok.type === TokenType.Keyword) {
            this.scanner.scan();
            const lower = tok.value.toLowerCase();

            // Check for -> (member access or explicit function call)
            const next = this.scanner.peek();
            if (next.type === TokenType.Special && next.special === Special.Arrow) {
                this.scanner.scan();
                const memberTok = this.scanner.peek();
                if (memberTok.type === TokenType.Name || memberTok.type === TokenType.Keyword) {
                    const memberLower = memberTok.value.toLowerCase();
                    this.scanner.scan();
                    // If it's a known function, consume its args
                    if (EXTENSION_NAMES.has(memberLower) && EXTENSIONS[memberLower]?.kind === 'function') {
                        const args = this.consumeArgs(memberLower);
                        return { kind: 'call_expr', name: memberLower, args, explicit: tok.value, loc: this.loc(tok) } as CallExprNode;
                    }
                    return { kind: 'member_access', object: tok.value, member: memberTok.value, loc: this.loc(tok) } as MemberAccessNode;
                }
                return { kind: 'ident', name: tok.value, loc: this.loc(tok) } as IdentNode;
            }

            // Dot member access
            if (next.type === TokenType.Special && next.special === Special.Dot) {
                this.scanner.scan();
                const memberTok = this.scanner.peek();
                if (memberTok.type === TokenType.Name || memberTok.type === TokenType.Keyword) {
                    this.scanner.scan();
                    return { kind: 'member_access', object: tok.value, member: memberTok.value, loc: this.loc(tok) } as MemberAccessNode;
                }
                return { kind: 'ident', name: tok.value, loc: this.loc(tok) } as IdentNode;
            }

            // Known function — consume args
            if (EXTENSION_NAMES.has(lower) && EXTENSIONS[lower]?.kind === 'function') {
                const args = this.consumeArgs(lower);
                return { kind: 'call_expr', name: lower, args, loc: this.loc(tok) } as CallExprNode;
            }

            return { kind: 'ident', name: tok.value, loc: this.loc(tok) } as IdentNode;
        }

        // Unexpected token
        if (!this.isLineEnd(tok)) {
            this.error(tok.loc, `Unexpected token in expression: "${tok.value}"`);
            this.scanner.scan();
        }
        return this.dummyInt(tok);
    }

    // -----------------------------------------------------------------------
    //  Utilities
    // -----------------------------------------------------------------------

    private specialToOp(special: Special): BinaryNode['op'] {
        switch (special) {
            case Special.Equal: return '==';
            case Special.NotEqual: return '!=';
            case Special.LessThan: return '<';
            case Special.LessEqual: return '<=';
            case Special.GreaterThan: return '>';
            case Special.GreaterEqual: return '>=';
            default: return '==';
        }
    }

    private isCompareOp(special?: Special): boolean {
        return special === Special.Equal
            || special === Special.NotEqual
            || special === Special.LessThan
            || special === Special.LessEqual
            || special === Special.GreaterThan
            || special === Special.GreaterEqual;
    }

    /** Returns true if the special token is an operator or paren that should NOT be consumed as a junk arg. */
    private isOperatorOrParen(special?: Special): boolean {
        return this.isCompareOp(special)
            || special === Special.CloseParen
            || special === Special.OpenParen
            || special === Special.Plus
            || special === Special.Minus
            || special === Special.Star
            || special === Special.Slash;
    }

    private isExprStart(tok: Token): boolean {
        return tok.type === TokenType.Integer
            || tok.type === TokenType.Float
            || tok.type === TokenType.String
            || tok.type === TokenType.Name
            || tok.type === TokenType.Keyword
            || (tok.type === TokenType.Special && tok.special === Special.OpenParen)
            || (tok.type === TokenType.Special && tok.special === Special.Minus);
    }

    private isLineEnd(tok: Token): boolean {
        return tok.type === TokenType.EOF
            || tok.type === TokenType.Comment
            || (tok.type === TokenType.Special && tok.special === Special.Newline);
    }

    private skipNewlines(): void {
        while (true) {
            const tok = this.scanner.peek();
            if (tok.type === TokenType.Special && tok.special === Special.Newline) {
                this.scanner.scan();
            } else if (tok.type === TokenType.Comment) {
                this.scanner.scan();
            } else {
                break;
            }
        }
    }

    private expectNewline(): void {
        const tok = this.scanner.peek();
        if (tok.type === TokenType.Comment) { this.scanner.scan(); return; }
        if (tok.type === TokenType.Special && tok.special === Special.Newline) { this.scanner.scan(); return; }
        if (tok.type === TokenType.EOF) return;
    }

    private expect(special: Special, description: string): void {
        const tok = this.scanner.peek();
        if (tok.type === TokenType.Special && tok.special === special) {
            this.scanner.scan();
        } else {
            this.error(tok.loc, `Expected ${description}`);
        }
    }

    private tryConsume(special: Special): boolean {
        const tok = this.scanner.peek();
        if (tok.type === TokenType.Special && tok.special === special) {
            this.scanner.scan();
            return true;
        }
        return false;
    }

    private skipToNewline(): void {
        while (true) {
            const tok = this.scanner.peek();
            if (this.isLineEnd(tok)) break;
            this.scanner.scan();
        }
    }

    private error(loc: TokenLoc, message: string): void {
        this.diagnostics.push({ line: loc.line, column: loc.column, message, severity: 'error' });
    }

    private warn(loc: TokenLoc, message: string): void {
        this.diagnostics.push({ line: loc.line, column: loc.column, message, severity: 'warning' });
    }

    /** Dummy nodes for error recovery */
    private dummyIdent(tok: Token | TokenLoc): IdentNode {
        return { kind: 'ident', name: '', loc: this.loc(tok) };
    }

    private dummyInt(tok: Token | TokenLoc): LiteralIntNode {
        return { kind: 'literal_int', value: 0, loc: this.loc(tok) };
    }
}

// ---------------------------------------------------------------------------
//  Convenience functions
// ---------------------------------------------------------------------------

/** Parse MWScript source and return AST + diagnostics. */
export function parse(source: string): ParseResult {
    return new Parser(source).parse();
}

/** Parse and return only diagnostics (backward-compat helper). */
export function parseForDiagnostics(source: string): Diagnostic[] {
    return new Parser(source).parse().diagnostics;
}
