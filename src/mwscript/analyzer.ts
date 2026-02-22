/**
 * MWScript static analyzer.
 *
 * Walks the AST produced by the parser and reports semantic issues
 * that go beyond syntax checking. Each rule is a simple visitor method.
 */

import type {
    ScriptNode, StmtNode, ExprNode,
    DeclareNode, SetNode, IfNode, WhileNode,
    CallStmtNode, CallExprNode, MessageBoxNode,
    IdentNode, MemberAccessNode, ReturnNode,
} from './ast';
import { EXTENSIONS, EXTENSION_NAMES, DISPLAY_NAMES } from './extensions';
import type { Diagnostic, Severity } from './parser';

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/** Count required args from extension arg string (before optional '/') */
function countRequiredArgs(argStr: string): number {
    const beforeSlash = argStr.split('/')[0];
    let count = 0;
    for (const ch of beforeSlash) {
        // x, X, z, j are junk/optional — not real required args
        if ('fFlLsScC'.includes(ch)) count++;
    }
    return count;
}

function countMaxArgs(argStr: string): number {
    let count = 0;
    for (const ch of argStr.replace('/', '')) {
        if ('fFlLsScCxXzj'.includes(ch)) count++;
    }
    return count;
}

function formatArgType(ch: string): string {
    switch (ch.toLowerCase()) {
        case 'f': return 'float';
        case 'l': return 'int';
        case 's': return 'short';
        case 'c': return 'string';
        default: return 'any';
    }
}

export function formatSignature(name: string): string {
    const ext = EXTENSIONS[name.toLowerCase()];
    if (!ext) return name;

    const displayName = DISPLAY_NAMES[name.toLowerCase()] || name;
    const argStr = ext.args.replace('/', '');
    const args: string[] = [];
    for (const ch of argStr) {
        if ('xXzj'.includes(ch)) continue; // skip optional/junk
        args.push(formatArgType(ch));
    }

    const ret = ext.returnType
        ? ` → ${formatArgType(ext.returnType)}`
        : '';

    return `${displayName}(${args.join(', ')})${ret}`;
}

// ---------------------------------------------------------------------------
//  Analyzer
// ---------------------------------------------------------------------------

export class StaticAnalyzer {
    private diags: Diagnostic[] = [];
    private declaredVars = new Map<string, { type: string; line: number; used: boolean }>();
    private assignedVars = new Set<string>();
    private afterReturn = false;

    analyze(ast: ScriptNode): Diagnostic[] {
        this.diags = [];
        this.declaredVars.clear();
        this.assignedVars.clear();
        this.afterReturn = false;

        // Collect declarations
        for (const decl of ast.declarations) {
            this.visitDeclaration(decl);
        }

        // Walk body
        for (const stmt of ast.body) {
            this.visitStmt(stmt);
        }

        // NOTE: We intentionally do NOT warn about unused variables.
        // In MWScript, variables are commonly referenced from dialogue
        // conditions, filters, and other scripts (objectId.varName).

        return this.diags;
    }

    // -- Declarations -------------------------------------------------------

    private visitDeclaration(decl: DeclareNode): void {
        const lower = decl.name.toLowerCase();
        if (this.declaredVars.has(lower)) {
            this.report(decl.loc.line, decl.loc.column, 'warning',
                `Duplicate declaration of "${decl.name}"`);
        }
        this.declaredVars.set(lower, {
            type: decl.varType,
            line: decl.loc.line,
            used: false,
        });
    }

    // -- Statements ---------------------------------------------------------

    private visitStmt(stmt: StmtNode): void {
        if (this.afterReturn) {
            this.report(stmt.loc.line, stmt.loc.column, 'warning',
                'Unreachable code after "Return"');
            this.afterReturn = false; // only warn once
        }

        switch (stmt.kind) {
            case 'declare': this.visitDeclaration(stmt); break;
            case 'set': this.visitSet(stmt); break;
            case 'if': this.visitIf(stmt); break;
            case 'while': this.visitWhile(stmt); break;
            case 'return': this.visitReturn(stmt); break;
            case 'call_stmt': this.visitCallStmt(stmt); break;
            case 'messagebox': this.visitMessageBox(stmt); break;
        }
    }

    private visitSet(stmt: SetNode): void {
        // Check target is declared
        if (stmt.target.kind === 'ident') {
            const lower = stmt.target.name.toLowerCase();
            if (!this.declaredVars.has(lower)) {
                // Could be a global — don't error, just info
            } else {
                this.assignedVars.add(lower);
            }
        }

        // Walk expression
        this.visitExpr(stmt.value);
    }

    private visitIf(stmt: IfNode): void {
        for (const branch of stmt.branches) {
            if (branch.condition) {
                this.visitExpr(branch.condition);
            }
            for (const s of branch.body) {
                this.visitStmt(s);
            }
        }
    }

    private visitWhile(stmt: WhileNode): void {
        this.visitExpr(stmt.condition);
        for (const s of stmt.body) {
            this.visitStmt(s);
        }
    }

    private visitReturn(_stmt: ReturnNode): void {
        this.afterReturn = true;
    }

    private visitCallStmt(stmt: CallStmtNode): void {
        const lower = stmt.name.toLowerCase();

        // Check if known extension
        if (!EXTENSION_NAMES.has(lower)) {
            this.report(stmt.loc.line, stmt.loc.column, 'warning',
                `Unknown function or instruction "${stmt.name}"`);
        } else {
            const ext = EXTENSIONS[lower];
            // Check it's an instruction (not function used as statement)
            // Functions CAN be used as statements (return value discarded) — no error

            // Check arg count
            const minArgs = countRequiredArgs(ext.args);
            const maxArgs = countMaxArgs(ext.args);
            const actualArgs = stmt.args.length;

            if (actualArgs < minArgs) {
                this.report(stmt.loc.line, stmt.loc.column, 'error',
                    `"${stmt.name}" requires at least ${minArgs} argument(s), got ${actualArgs}`);
            } else if (actualArgs > maxArgs && maxArgs > 0) {
                this.report(stmt.loc.line, stmt.loc.column, 'warning',
                    `"${stmt.name}" accepts at most ${maxArgs} argument(s), got ${actualArgs}`);
            }
        }

        // Walk args
        for (const arg of stmt.args) {
            this.visitExpr(arg);
        }
    }

    private visitMessageBox(stmt: MessageBoxNode): void {
        // Walk button args
        for (const arg of stmt.buttons) {
            this.visitExpr(arg);
        }
    }

    // -- Expressions --------------------------------------------------------

    private visitExpr(expr: ExprNode): void {
        switch (expr.kind) {
            case 'ident':
                this.visitIdent(expr);
                break;
            case 'member_access':
                this.visitMember(expr);
                break;
            case 'binary':
                this.visitExpr(expr.left);
                this.visitExpr(expr.right);
                break;
            case 'unary':
                this.visitExpr(expr.operand);
                break;
            case 'call_expr':
                this.visitCallExpr(expr);
                break;
            // literals — no analysis needed
        }
    }

    private visitIdent(expr: IdentNode): void {
        const lower = expr.name.toLowerCase();
        const decl = this.declaredVars.get(lower);
        if (decl) {
            decl.used = true;
            // NOTE: We do NOT warn about "read before assigned" because
            // MWScript runs every frame — variables persist between executions.
        }
    }

    private visitMember(_expr: MemberAccessNode): void {
        // Member access (obj.member or obj->member) — limited analysis
    }

    private visitCallExpr(expr: CallExprNode): void {
        const lower = expr.name.toLowerCase();
        if (!EXTENSION_NAMES.has(lower)) {
            this.report(expr.loc.line, expr.loc.column, 'warning',
                `Unknown function "${expr.name}"`);
        } else {
            const ext = EXTENSIONS[lower];
            if (ext.kind !== 'function') {
                this.report(expr.loc.line, expr.loc.column, 'warning',
                    `"${expr.name}" is an instruction, not a function — it returns no value`);
            }

            // Check arg count
            const minArgs = countRequiredArgs(ext.args);
            const maxArgs = countMaxArgs(ext.args);
            const actualArgs = expr.args.length;
            if (actualArgs < minArgs) {
                this.report(expr.loc.line, expr.loc.column, 'error',
                    `"${expr.name}" requires at least ${minArgs} argument(s), got ${actualArgs}`);
            } else if (actualArgs > maxArgs && maxArgs > 0) {
                this.report(expr.loc.line, expr.loc.column, 'warning',
                    `"${expr.name}" accepts at most ${maxArgs} argument(s), got ${actualArgs}`);
            }
        }

        for (const arg of expr.args) {
            this.visitExpr(arg);
        }
    }

    // -- Reporter -----------------------------------------------------------

    private report(line: number, column: number, severity: Severity, message: string): void {
        this.diags.push({ line, column, severity, message });
    }
}
