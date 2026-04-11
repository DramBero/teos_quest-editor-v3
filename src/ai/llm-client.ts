/**
 * OpenAI-compatible streaming LLM client.
 * Works with: OpenAI, OpenRouter, Ollama, any OpenAI-compatible API.
 */

import type { AiConfig } from './settings';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: ToolCallResponse[];
}

export interface ToolCallResponse {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export type StreamEvent =
    | { type: 'text'; content: string }
    | { type: 'tool_call'; id: string; name: string; arguments: string }
    | { type: 'done' }
    | { type: 'error'; message: string };

/**
 * Stream a chat completion from an OpenAI-compatible API.
 * Yields StreamEvent objects as they arrive.
 */
export async function* streamChat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    config: AiConfig,
): AsyncGenerator<StreamEvent> {
    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body: Record<string, unknown> = {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
    };

    if (tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(body),
        });
    } catch (err) {
        yield { type: 'error', message: `Network error: ${err}` };
        return;
    }

    if (!response.ok) {
        const text = await response.text().catch(() => 'unknown error');
        yield { type: 'error', message: `API error ${response.status}: ${text}` };
        return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
        yield { type: 'error', message: 'No response body' };
        return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Track tool calls being assembled across chunks
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep incomplete line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') {
                    // Flush any pending tool calls
                    for (const tc of pendingToolCalls.values()) {
                        yield { type: 'tool_call', id: tc.id, name: tc.name, arguments: tc.args };
                    }
                    pendingToolCalls.clear();
                    yield { type: 'done' };
                    return;
                }

                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta;
                    if (!delta) continue;

                    // Text content
                    if (delta.content) {
                        yield { type: 'text', content: delta.content };
                    }

                    // Tool calls (streamed incrementally)
                    if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            const idx = tc.index ?? 0;
                            if (tc.id) {
                                // New tool call starts
                                pendingToolCalls.set(idx, {
                                    id: tc.id,
                                    name: tc.function?.name || '',
                                    args: tc.function?.arguments || '',
                                });
                            } else {
                                // Continuation of existing tool call
                                const existing = pendingToolCalls.get(idx);
                                if (existing) {
                                    if (tc.function?.name) existing.name += tc.function.name;
                                    if (tc.function?.arguments) existing.args += tc.function.arguments;
                                }
                            }
                        }
                    }

                    // Check for finish_reason
                    const finishReason = parsed.choices?.[0]?.finish_reason;
                    if (finishReason === 'tool_calls') {
                        for (const tc of pendingToolCalls.values()) {
                            yield { type: 'tool_call', id: tc.id, name: tc.name, arguments: tc.args };
                        }
                        pendingToolCalls.clear();
                    }
                } catch {
                    // Skip unparseable chunks
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    yield { type: 'done' };
}
