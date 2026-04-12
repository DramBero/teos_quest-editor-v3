/**
 * AI Tools — Script queries (readScript, searchScripts, analyzeScript, getScriptAST)
 *
 * All queries search across active plugin + master files.
 */

import type { TeosTool } from './index';
import { queryAllDBs, findFirstAcrossDBs } from './helpers';
import { parse } from '@/mwscript/parser';
import { StaticAnalyzer } from '@/mwscript/analyzer';
import type { StmtNode, ExprNode } from '@/mwscript/ast';

export const scriptTools: TeosTool[] = [
    {
        name: 'readScript',
        description: 'Read the full source code of a MWScript by name. Searches across the active plugin AND master files. Returns the script text and which file it was found in.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The script name (id) to read',
                },
            },
            required: ['name'],
        },
        execute: async (params) => {
            const name = params.name as string;
            try {
                const script = await findFirstAcrossDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Script')
                        .filter((r: Record<string, unknown>) =>
                            (r.id as string)?.toLowerCase() === name.toLowerCase(),
                        )
                        .first();
                });
                if (!script) return { error: `Script "${name}" not found in active plugin or masters` };
                return { id: script.id, text: script.text, source: script._source };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'searchScripts',
        description: 'Search across all script source texts for a keyword or pattern. Searches across the active plugin AND master files. Returns matching script names and relevant lines.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Text to search for in script sources',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results (default 10)',
                },
            },
            required: ['query'],
        },
        execute: async (params) => {
            const query = (params.query as string).toLowerCase();
            const limit = (params.limit as number) || 10;
            try {
                const scripts = await queryAllDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Script')
                        .filter((r: Record<string, unknown>) =>
                            ((r.text as string) || '').toLowerCase().includes(query),
                        )
                        .limit(limit)
                        .toArray();
                }, limit);

                const matches = scripts.map((s) => {
                    const text = (s.text as string) || '';
                    const lines = text.split('\n');
                    const matchingLines = lines
                        .map((line, i) => ({ line: i + 1, text: line }))
                        .filter(l => l.text.toLowerCase().includes(query))
                        .slice(0, 5);
                    return { id: s.id, matchingLines, source: s._source };
                });

                return { count: matches.length, results: matches };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'analyzeScript',
        description: 'Analyze a MWScript source for errors and warnings. Uses the built-in parser and static analyzer to find: syntax errors, unknown functions, wrong argument counts, unreachable code, duplicate declarations. Pass either a script name (reads from plugin or masters) or raw source code.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Script name to read from the plugin or masters (optional if source is provided)',
                },
                source: {
                    type: 'string',
                    description: 'Raw MWScript source code to analyze (optional if name is provided)',
                },
            },
        },
        execute: async (params) => {
            let source = params.source as string | undefined;
            const name = params.name as string | undefined;
            try {
                if (!source && name) {
                    const script = await findFirstAcrossDBs(async (db) => {
                        return db.table('pluginData')
                            .where('type').equals('Script')
                            .filter((r: Record<string, unknown>) =>
                                (r.id as string)?.toLowerCase() === name.toLowerCase(),
                            )
                            .first();
                    });
                    if (!script) return { error: `Script "${name}" not found in active plugin or masters` };
                    source = script.text as string;
                }
                if (!source) return { error: 'Provide either script name or source code' };

                const { ast, diagnostics: parseDiags } = parse(source);

                let analyzeDiags: typeof parseDiags = [];
                if (ast) {
                    const analyzer = new StaticAnalyzer();
                    analyzeDiags = analyzer.analyze(ast);
                }

                const all = [...parseDiags, ...analyzeDiags];
                const errors = all.filter(d => d.severity === 'error');
                const warnings = all.filter(d => d.severity === 'warning');

                return {
                    scriptName: ast?.name || name || '(inline)',
                    errors: errors.length,
                    warnings: warnings.length,
                    diagnostics: all.map(d => ({
                        line: d.line,
                        severity: d.severity,
                        message: d.message,
                    })),
                    clean: all.length === 0,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
    {
        name: 'getScriptAST',
        description: 'Get a structural summary of a MWScript: declared variables, function calls, control flow depth, referenced objects. Searches across the active plugin AND master files. Useful for understanding what a script does without reading the full source.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Script name to read from the plugin or masters',
                },
            },
            required: ['name'],
        },
        execute: async (params) => {
            const name = params.name as string;
            try {
                const script = await findFirstAcrossDBs(async (db) => {
                    return db.table('pluginData')
                        .where('type').equals('Script')
                        .filter((r: Record<string, unknown>) =>
                            (r.id as string)?.toLowerCase() === name.toLowerCase(),
                        )
                        .first();
                });
                if (!script) return { error: `Script "${name}" not found in active plugin or masters` };

                const { ast } = parse(script.text as string);
                if (!ast) return { error: 'Failed to parse script' };

                // Collect structural info
                const variables = ast.declarations.map(d => ({ name: d.name, type: d.varType }));
                const functionCalls = new Set<string>();
                const explicitRefs = new Set<string>();
                let maxIfDepth = 0;
                let hasWhile = false;
                let hasReturn = false;

                function walkExpr(expr: ExprNode) {
                    if (expr.kind === 'call_expr') {
                        functionCalls.add(expr.name);
                        if (expr.explicit) explicitRefs.add(expr.explicit);
                        expr.args.forEach(walkExpr);
                    } else if (expr.kind === 'binary') {
                        walkExpr(expr.left);
                        walkExpr(expr.right);
                    } else if (expr.kind === 'unary') {
                        walkExpr(expr.operand);
                    } else if (expr.kind === 'member_access') {
                        explicitRefs.add(expr.object);
                    }
                }

                function walkStmt(stmt: StmtNode, depth: number) {
                    if (stmt.kind === 'call_stmt') {
                        functionCalls.add(stmt.name);
                        if (stmt.explicit) explicitRefs.add(stmt.explicit);
                        stmt.args.forEach(walkExpr);
                    } else if (stmt.kind === 'set') {
                        if (stmt.target.kind === 'member_access') explicitRefs.add(stmt.target.object);
                        walkExpr(stmt.value);
                    } else if (stmt.kind === 'if') {
                        maxIfDepth = Math.max(maxIfDepth, depth + 1);
                        for (const branch of stmt.branches) {
                            if (branch.condition) walkExpr(branch.condition);
                            branch.body.forEach(s => walkStmt(s, depth + 1));
                        }
                    } else if (stmt.kind === 'while') {
                        hasWhile = true;
                        walkExpr(stmt.condition);
                        stmt.body.forEach(s => walkStmt(s, depth));
                    } else if (stmt.kind === 'return') {
                        hasReturn = true;
                    } else if (stmt.kind === 'messagebox') {
                        functionCalls.add('MessageBox');
                        stmt.buttons.forEach(walkExpr);
                    }
                }

                ast.body.forEach(s => walkStmt(s, 0));

                return {
                    scriptName: ast.name,
                    variables,
                    functionCalls: [...functionCalls].sort(),
                    explicitReferences: [...explicitRefs],
                    bodyStatements: ast.body.length,
                    maxIfDepth,
                    hasWhile,
                    hasReturn,
                    lineCount: (script.text as string).split('\n').length,
                    source: script._source,
                };
            } catch (err) {
                return { error: String(err) };
            }
        },
    },
];
