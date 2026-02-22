/**
 * Public API for the MWScript module.
 */

export { TokenType, Keyword, Special, KEYWORD_MAP } from './tokens';
export type { Token, TokenLoc } from './tokens';

export { Scanner } from './scanner';

export { EXTENSIONS, EXTENSION_NAMES } from './extensions';
export type { ExtensionDef } from './extensions';

export { Parser, parse, parseForDiagnostics } from './parser';
export type { Diagnostic, Severity, ParseResult } from './parser';

// AST types re-exported for consumers
export type {
    ScriptNode, StmtNode, ExprNode, DeclareNode, VarType,
    SetNode, IfNode, IfBranch, WhileNode, ReturnNode,
    CallStmtNode, MessageBoxNode, CallExprNode,
    LiteralIntNode, LiteralFloatNode, LiteralStringNode,
    IdentNode, MemberAccessNode, BinaryNode, UnaryNode, Loc,
} from './ast';

export { compile } from './codegen';
export type { CompileResult } from './codegen';

export { serializeSCDT, serializeSCVR, buildScriptHeader, buildScriptRecord } from './serializer';
export type { ScriptRecordData } from './serializer';

export { loadGlobals } from './globals';
