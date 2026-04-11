/**
 * Tool executor — runs tools requested by the LLM.
 */

import { tools } from './tools';

export async function executeTool(name: string, argsJson: string): Promise<string> {
    const tool = tools.find(t => t.name === name);
    if (!tool) {
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    let params: Record<string, unknown>;
    try {
        params = JSON.parse(argsJson || '{}');
    } catch {
        return JSON.stringify({ error: `Invalid JSON arguments: ${argsJson}` });
    }

    try {
        const result = await tool.execute(params);
        const json = JSON.stringify(result);
        // Limit response size to avoid token overflow
        if (json.length > 8000) {
            return json.slice(0, 8000) + '... (truncated)';
        }
        return json;
    } catch (err) {
        return JSON.stringify({ error: `Tool execution error: ${err}` });
    }
}
