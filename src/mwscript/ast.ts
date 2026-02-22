/**
 * AST node types for MWScript.
 *
 * These are produced by the parser and consumed by the code generator.
 * Every node carries a `loc` for source-map / diagnostic purposes.
 */

// ============================================================================
//  Source location
// ============================================================================

export interface Loc {
    line: number;
    column: number;
}

// ============================================================================
//  Variable type
// ============================================================================

export type VarType = 'short' | 'long' | 'float';

// ============================================================================
//  Expression nodes
// ============================================================================

export interface LiteralIntNode {
    kind: 'literal_int';
    value: number;
    loc: Loc;
}

export interface LiteralFloatNode {
    kind: 'literal_float';
    value: number;
    loc: Loc;
}

export interface LiteralStringNode {
    kind: 'literal_string';
    value: string;
    loc: Loc;
}

export interface IdentNode {
    kind: 'ident';
    name: string;
    loc: Loc;
}

export interface MemberAccessNode {
    kind: 'member_access';
    object: string;    // object id (e.g. "player")
    member: string;    // variable name (e.g. "health")
    loc: Loc;
}

export interface BinaryNode {
    kind: 'binary';
    op: '+' | '-' | '*' | '/' | '==' | '!=' | '<' | '<=' | '>' | '>=';
    left: ExprNode;
    right: ExprNode;
    loc: Loc;
}

export interface UnaryNode {
    kind: 'unary';
    op: '-';
    operand: ExprNode;
    loc: Loc;
}

export interface CallExprNode {
    kind: 'call_expr';
    name: string;            // function name (lowercased)
    args: ExprNode[];
    explicit?: string;       // explicit reference (e.g. "player" in player->GetHealth)
    loc: Loc;
}

export type ExprNode =
    | LiteralIntNode
    | LiteralFloatNode
    | LiteralStringNode
    | IdentNode
    | MemberAccessNode
    | BinaryNode
    | UnaryNode
    | CallExprNode;

// ============================================================================
//  Statement nodes
// ============================================================================

export interface DeclareNode {
    kind: 'declare';
    varType: VarType;
    name: string;
    loc: Loc;
}

export interface SetNode {
    kind: 'set';
    target: IdentNode | MemberAccessNode;
    value: ExprNode;
    loc: Loc;
}

export interface IfBranch {
    condition: ExprNode | null;  // null for 'else'
    body: StmtNode[];
    loc: Loc;
}

export interface IfNode {
    kind: 'if';
    branches: IfBranch[];   // if, elseif..., else
    loc: Loc;
}

export interface WhileNode {
    kind: 'while';
    condition: ExprNode;
    body: StmtNode[];
    loc: Loc;
}

export interface ReturnNode {
    kind: 'return';
    loc: Loc;
}

export interface CallStmtNode {
    kind: 'call_stmt';
    name: string;            // instruction name (lowercased)
    args: ExprNode[];
    explicit?: string;       // explicit reference
    loc: Loc;
}

export interface MessageBoxNode {
    kind: 'messagebox';
    message: ExprNode;
    buttons: ExprNode[];
    loc: Loc;
}

export type StmtNode =
    | DeclareNode
    | SetNode
    | IfNode
    | WhileNode
    | ReturnNode
    | CallStmtNode
    | MessageBoxNode;

// ============================================================================
//  Top-level script node
// ============================================================================

export interface ScriptNode {
    kind: 'script';
    name: string;
    declarations: DeclareNode[];
    body: StmtNode[];
    loc: Loc;
}
