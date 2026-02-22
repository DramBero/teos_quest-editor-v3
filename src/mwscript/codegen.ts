/**
 * MWScript bytecode code generator.
 *
 * Walks the AST produced by the parser and emits SCDT-compatible bytecode.
 * Mirrors the logic in OpenMW's compiler/generator.cpp.
 *
 * Bytecode format:
 *   - Each instruction is a uint32 encoded via segment0..segment5.
 *   - Literals (ints, floats, strings) are stored in separate pools,
 *     referenced by index on the stack.
 *   - The VM is stack-based: push values, execute ops, results stay on stack.
 */

import type {
    ScriptNode, StmtNode, ExprNode, DeclareNode, VarType,
    SetNode, IfNode, WhileNode, ReturnNode,
    CallStmtNode, MessageBoxNode,
    BinaryNode, UnaryNode, IdentNode, MemberAccessNode, CallExprNode,
} from './ast';
import { lookupOpcode } from './opcodes';
import { parse } from './parser';
import type { Diagnostic } from './parser';

// ---------------------------------------------------------------------------
//  Segment encoding (from OpenMW generator.hpp)
// ---------------------------------------------------------------------------

/** seg0(c, arg0) = c<<24 | arg0&0xFFFFFF  — used for pushInt, jumps */
export function segment0(c: number, arg0: number): number {
    return ((c & 0x3F) << 24) | (arg0 & 0x00FFFFFF);
}

/** seg3(c, arg0) = 0xC0000000 | c<<8 | arg0&0xFF  — used for messageBox */
export function segment3(c: number, arg0: number): number {
    return 0xC0000000 | ((c & 0xFFFFF) << 8) | (arg0 & 0xFF);
}

/** seg5(c) = 0xC8000000 | c  — used for most operations */
export function segment5(c: number): number {
    return 0xC8000000 | (c & 0x07FFFFFF);
}

// ---------------------------------------------------------------------------
//  Literals pool
// ---------------------------------------------------------------------------

export class Literals {
    readonly integers: number[] = [];
    readonly floats: number[] = [];
    readonly strings: string[] = [];

    addInteger(value: number): number {
        const idx = this.integers.indexOf(value);
        if (idx >= 0) return idx;
        this.integers.push(value);
        return this.integers.length - 1;
    }

    addFloat(value: number): number {
        const idx = this.floats.indexOf(value);
        if (idx >= 0) return idx;
        this.floats.push(value);
        return this.floats.length - 1;
    }

    addString(value: string): number {
        const idx = this.strings.indexOf(value);
        if (idx >= 0) return idx;
        this.strings.push(value);
        return this.strings.length - 1;
    }

    clear(): void {
        this.integers.length = 0;
        this.floats.length = 0;
        this.strings.length = 0;
    }
}

// ---------------------------------------------------------------------------
//  Locals tracker
// ---------------------------------------------------------------------------

export interface LocalVar {
    name: string;
    type: VarType;
    index: number;   // index within its type group
}

export class Locals {
    private vars = new Map<string, LocalVar>();
    private shortCount = 0;
    private longCount = 0;
    private floatCount = 0;

    declare(name: string, type: VarType): LocalVar {
        const lower = name.toLowerCase();
        const existing = this.vars.get(lower);
        if (existing) return existing;

        let index: number;
        switch (type) {
            case 'short': index = this.shortCount++; break;
            case 'long': index = this.longCount++; break;
            case 'float': index = this.floatCount++; break;
        }

        const v: LocalVar = { name, type, index };
        this.vars.set(lower, v);
        return v;
    }

    get(name: string): LocalVar | undefined {
        return this.vars.get(name.toLowerCase());
    }

    getShortCount(): number { return this.shortCount; }
    getLongCount(): number { return this.longCount; }
    getFloatCount(): number { return this.floatCount; }

    /** Get all variable names in declaration order for SCVR */
    getVariableNames(): string[] {
        return [...this.vars.values()]
            .sort((a: LocalVar, b: LocalVar) => {
                const typeOrder: Record<VarType, number> = { short: 0, long: 1, float: 2 };
                const to = typeOrder[a.type] - typeOrder[b.type];
                if (to !== 0) return to;
                return a.index - b.index;
            })
            .map((v: LocalVar) => v.name);
    }
}

// ---------------------------------------------------------------------------
//  Compile result
// ---------------------------------------------------------------------------

export interface CompileResult {
    /** Compiled bytecode (uint32 array) */
    code: number[];
    /** Literals pool */
    literals: Literals;
    /** Local variables */
    locals: Locals;
    /** Errors encountered during code generation */
    errors: string[];
}

// ---------------------------------------------------------------------------
//  Type tracking
// ---------------------------------------------------------------------------

/** Internal type code matching OpenMW convention: 's'=short, 'l'=long, 'f'=float */
type TypeCode = 's' | 'l' | 'f';

function varTypeToCode(t: VarType): TypeCode {
    switch (t) {
        case 'short': return 's';
        case 'long': return 'l';
        case 'float': return 'f';
    }
}

// ---------------------------------------------------------------------------
//  Code generator
// ---------------------------------------------------------------------------

export class CodeGen {
    private code: number[] = [];
    private literals = new Literals();
    private locals = new Locals();
    private globals = new Map<string, VarType>();
    private errors: string[] = [];

    /**
     * Compile a ScriptNode AST into bytecode.
     */
    compile(ast: ScriptNode, globals?: Map<string, VarType>): CompileResult {
        if (globals) this.globals = globals;

        // Process declarations first
        for (const decl of ast.declarations) {
            this.emitDeclaration(decl);
        }

        // Generate body
        for (const stmt of ast.body) {
            this.emitStatement(stmt);
        }

        return {
            code: this.code,
            literals: this.literals,
            locals: this.locals,
            errors: this.errors,
        };
    }

    // -----------------------------------------------------------------------
    //  Statements
    // -----------------------------------------------------------------------

    private emitDeclaration(decl: DeclareNode): void {
        this.locals.declare(decl.name, decl.varType);
    }

    private emitStatement(stmt: StmtNode): void {
        switch (stmt.kind) {
            case 'declare': this.emitDeclaration(stmt); break;
            case 'set': this.emitSet(stmt); break;
            case 'if': this.emitIf(stmt); break;
            case 'while': this.emitWhile(stmt); break;
            case 'return': this.emitReturn(stmt); break;
            case 'call_stmt': this.emitCallStmt(stmt); break;
            case 'messagebox': this.emitMessageBox(stmt); break;
        }
    }

    private emitSet(stmt: SetNode): void {
        const target = stmt.target;

        if (target.kind === 'ident') {
            const local = this.locals.get(target.name);
            if (local) {
                // Emit: push local index, push value, store
                this.code.push(segment0(0, local.index)); // pushInt(index)
                this.emitExpression(stmt.value);
                this.emitStoreLocal(varTypeToCode(local.type));
            } else {
                // Global variable — look up type from globals registry
                const globalType = this.globals.get(target.name.toLowerCase());
                const typeCode = globalType ? varTypeToCode(globalType) : 'l'; // default long
                const idx = this.literals.addString(target.name);
                this.code.push(segment0(0, idx)); // pushInt(stringIndex)
                this.emitExpression(stmt.value);
                this.emitStoreGlobal(typeCode);
            }
        } else if (target.kind === 'member_access') {
            // Member access: object.member — push name, push id, push value, storeMember
            const nameIdx = this.literals.addString(target.member);
            const idIdx = this.literals.addString(target.object);
            this.code.push(segment0(0, nameIdx));
            this.code.push(segment0(0, idIdx));
            this.emitExpression(stmt.value);
            this.emitStoreMember('l', false);
        }
    }

    private emitIf(stmt: IfNode): void {
        // We use a simplified approach:
        // For each branch, emit condition check + skip-on-non-zero + body
        // This is a basic implementation — OpenMW uses forward jumps with backpatching
        const endJumps: number[] = [];

        for (let i = 0; i < stmt.branches.length; i++) {
            const branch = stmt.branches[i];

            if (branch.condition) {
                // Emit condition
                this.emitExpression(branch.condition);
                // skipOnNonZero — if condition is true, skip the jump-to-next
                this.code.push(segment5(25)); // opSkipOnNonZero

                // Placeholder for jump to next branch (will be backpatched)
                const jumpIdx = this.code.length;
                this.code.push(0); // placeholder

                // Emit body
                for (const s of branch.body) {
                    this.emitStatement(s);
                }

                // Jump to end (past all branches)
                endJumps.push(this.code.length);
                this.code.push(0); // placeholder for jump to end

                // Backpatch the conditional jump
                const offset = this.code.length - jumpIdx;
                this.code[jumpIdx] = segment0(1, offset); // opJumpForward
            } else {
                // Else branch — no condition
                for (const s of branch.body) {
                    this.emitStatement(s);
                }
            }
        }

        // Backpatch all end-jumps
        for (const jumpIdx of endJumps) {
            const offset = this.code.length - jumpIdx;
            this.code[jumpIdx] = segment0(1, offset); // opJumpForward
        }
    }

    private emitWhile(stmt: WhileNode): void {
        const loopStart = this.code.length;

        // Emit condition
        this.emitExpression(stmt.condition);

        // If zero (condition false), jump forward past the body
        this.code.push(segment5(25)); // opSkipOnNonZero
        const exitJumpIdx = this.code.length;
        this.code.push(0); // placeholder

        // Emit body
        for (const s of stmt.body) {
            this.emitStatement(s);
        }

        // Jump back to loop start
        const backOffset = this.code.length - loopStart + 1;
        this.code.push(segment0(2, backOffset)); // opJumpBackward

        // Backpatch exit jump
        const fwdOffset = this.code.length - exitJumpIdx;
        this.code[exitJumpIdx] = segment0(1, fwdOffset);
    }

    private emitReturn(_stmt: ReturnNode): void {
        this.code.push(segment5(20)); // opReturn
    }

    private emitCallStmt(stmt: CallStmtNode): void {
        // Push arguments
        for (const arg of stmt.args) {
            this.emitExpression(arg);
        }

        // For explicit refs (e.g. player->Disable), push the object ID string
        if (stmt.explicit) {
            const idIdx = this.literals.addString(stmt.explicit);
            this.code.push(segment0(0, idIdx));
        }

        // Look up opcode
        const opcode = lookupOpcode(stmt.name, !!stmt.explicit);
        if (opcode !== undefined) {
            // Extension opcodes are emitted directly
            this.code.push(opcode);
        } else {
            this.errors.push(`Unknown opcode for instruction: ${stmt.name}`);
        }
    }

    private emitMessageBox(stmt: MessageBoxNode): void {
        // Push message string
        this.emitExpression(stmt.message);

        // Push button strings
        for (const btn of stmt.buttons) {
            this.emitExpression(btn);
        }

        // opMessageBox with button count
        this.code.push(segment3(0, stmt.buttons.length));
    }

    // -----------------------------------------------------------------------
    //  Expressions
    // -----------------------------------------------------------------------

    private emitExpression(expr: ExprNode): void {
        switch (expr.kind) {
            case 'literal_int': this.emitPushInt(expr.value); break;
            case 'literal_float': this.emitPushFloat(expr.value); break;
            case 'literal_string': this.emitPushString(expr.value); break;
            case 'ident': this.emitFetchIdent(expr); break;
            case 'member_access': this.emitFetchMember(expr); break;
            case 'binary': this.emitBinary(expr); break;
            case 'unary': this.emitUnary(expr); break;
            case 'call_expr': this.emitCallExpr(expr); break;
        }
    }

    private emitPushInt(value: number): void {
        const idx = this.literals.addInteger(value);
        this.code.push(segment0(0, idx));       // pushInt(literalIndex)
        this.code.push(segment5(4));            // opFetchIntLiteral
    }

    private emitPushFloat(value: number): void {
        const idx = this.literals.addFloat(value);
        this.code.push(segment0(0, idx));       // pushInt(literalIndex)
        this.code.push(segment5(5));            // opFetchFloatLiteral
    }

    private emitPushString(value: string): void {
        const idx = this.literals.addString(value);
        this.code.push(segment0(0, idx));       // pushInt(stringIndex)
    }

    private emitFetchIdent(ident: IdentNode): void {
        const local = this.locals.get(ident.name);
        if (local) {
            // Fetch local variable
            this.code.push(segment0(0, local.index));
            switch (local.type) {
                case 'short': this.code.push(segment5(21)); break; // opFetchLocalShort
                case 'long': this.code.push(segment5(22)); break; // opFetchLocalLong
                case 'float': this.code.push(segment5(23)); break; // opFetchLocalFloat
            }
        } else {
            // Global variable — look up type from globals registry
            const globalType = this.globals.get(ident.name.toLowerCase());
            const typeCode = globalType ? varTypeToCode(globalType) : 'l'; // default long
            const idx = this.literals.addString(ident.name);
            this.code.push(segment0(0, idx));
            switch (typeCode) {
                case 's': this.code.push(segment5(42)); break; // opFetchGlobalShort
                case 'l': this.code.push(segment5(43)); break; // opFetchGlobalLong
                case 'f': this.code.push(segment5(44)); break; // opFetchGlobalFloat
            }
        }
    }

    private emitFetchMember(member: MemberAccessNode): void {
        const nameIdx = this.literals.addString(member.member);
        const idIdx = this.literals.addString(member.object);
        this.code.push(segment0(0, nameIdx));
        this.code.push(segment0(0, idIdx));
        this.code.push(segment5(62)); // opFetchMemberShort (non-global)
    }

    private emitBinary(expr: BinaryNode): void {
        this.emitExpression(expr.left);
        this.emitExpression(expr.right);

        switch (expr.op) {
            case '+': this.code.push(segment5(9)); break; // opAddInt
            case '-': this.code.push(segment5(11)); break; // opSubInt
            case '*': this.code.push(segment5(13)); break; // opMulInt
            case '/': this.code.push(segment5(15)); break; // opDivInt
            case '==': this.code.push(segment5(26)); break; // opEqualInt
            case '!=': this.code.push(segment5(27)); break; // opNonEqualInt
            case '<': this.code.push(segment5(28)); break; // opLessThanInt
            case '<=': this.code.push(segment5(29)); break; // opLessOrEqualInt
            case '>': this.code.push(segment5(30)); break; // opGreaterThanInt
            case '>=': this.code.push(segment5(31)); break; // opGreaterOrEqualInt
        }
    }

    private emitUnary(expr: UnaryNode): void {
        this.emitExpression(expr.operand);
        this.code.push(segment5(7)); // opNegateInt
    }

    private emitCallExpr(expr: CallExprNode): void {
        // Push arguments
        for (const arg of expr.args) {
            this.emitExpression(arg);
        }

        // For explicit refs (e.g. player->GetLevel), push the object ID string
        if (expr.explicit) {
            const idIdx = this.literals.addString(expr.explicit);
            this.code.push(segment0(0, idIdx));
        }

        // Look up opcode
        const opcode = lookupOpcode(expr.name, !!expr.explicit);
        if (opcode !== undefined) {
            this.code.push(opcode);
        } else {
            this.errors.push(`Unknown opcode for function: ${expr.name}`);
        }
    }

    // -----------------------------------------------------------------------
    //  Store helpers
    // -----------------------------------------------------------------------

    private emitStoreLocal(typeCode: TypeCode): void {
        switch (typeCode) {
            case 's': this.code.push(segment5(0)); break; // opStoreLocalShort
            case 'l': this.code.push(segment5(1)); break; // opStoreLocalLong
            case 'f': this.code.push(segment5(2)); break; // opStoreLocalFloat
        }
    }

    private emitStoreGlobal(typeCode: TypeCode): void {
        switch (typeCode) {
            case 's': this.code.push(segment5(39)); break; // opStoreGlobalShort
            case 'l': this.code.push(segment5(40)); break; // opStoreGlobalLong
            case 'f': this.code.push(segment5(41)); break; // opStoreGlobalFloat
        }
    }

    private emitStoreMember(typeCode: TypeCode, global: boolean): void {
        switch (typeCode) {
            case 's': this.code.push(segment5(global ? 65 : 59)); break;
            case 'l': this.code.push(segment5(global ? 66 : 60)); break;
            case 'f': this.code.push(segment5(global ? 67 : 61)); break;
        }
    }
}

// ---------------------------------------------------------------------------
//  Convenience function
// ---------------------------------------------------------------------------

/**
 * Compile MWScript source code to bytecode.
 * Parses + generates in one step.
 */
export function compile(source: string, globals?: Map<string, VarType>): CompileResult & { parseErrors: Diagnostic[] } {
    const result = parse(source);

    if (!result.ast) {
        return {
            code: [],
            literals: new Literals(),
            locals: new Locals(),
            errors: ['Parse failed — no AST produced'],
            parseErrors: result.diagnostics,
        };
    }

    const gen = new CodeGen();
    const compiled = gen.compile(result.ast, globals);
    return {
        ...compiled,
        parseErrors: result.diagnostics,
    };
}
