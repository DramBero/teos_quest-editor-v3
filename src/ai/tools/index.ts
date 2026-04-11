/**
 * AI Tools — modular index.
 *
 * Each tool module exports a typed array of TeosTool.
 * This file merges them and provides the public API.
 */

import type { ToolDefinition } from '../llm-client';

// Tool modules
import { recordTools } from './records';
import { scriptTools } from './scripts';
import { journalTools } from './journal';
import { dialogueTools } from './dialogue';
import { npcTools } from './npc';
import { worldTools } from './world';
import { editorTools } from './editor';

// ---------------------------------------------------------------------------
//  TeosTool interface
// ---------------------------------------------------------------------------

export interface TeosTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
//  Merged tool registry
// ---------------------------------------------------------------------------

export const tools: TeosTool[] = [
    ...recordTools,
    ...scriptTools,
    ...journalTools,
    ...dialogueTools,
    ...npcTools,
    ...worldTools,
    ...editorTools,
];

// ---------------------------------------------------------------------------
//  OpenAI-compatible tool definitions
// ---------------------------------------------------------------------------

/**
 * Convert our tools to OpenAI tool_definition format for the API call.
 */
export function getToolDefinitions(): ToolDefinition[] {
    return tools.map(tool => ({
        type: 'function' as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    }));
}
