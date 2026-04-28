import { z, type ZodObject, type ZodRawShape } from 'zod';

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
  isError?: boolean;
  /**
   * Optional structured payload returned alongside text. MCP clients that
   * understand structured content (e.g. agents tracking object identity across
   * calls) can use this; clients that only render text fall back to `content`.
   */
  structuredContent?: Record<string, unknown>;
}

/**
 * The shape of a registered MCP tool. Stored in two complementary forms:
 *
 *  - `inputShape` — the raw `ZodRawShape` the MCP SDK's `registerTool`
 *    expects. Passing this directly avoids the brittle `(schema as any).shape`
 *    extraction that earlier versions of this file used.
 *
 *  - `inputSchema` — the assembled `z.object(inputShape).strict()` instance.
 *    Tests assert against it without re-building the schema themselves.
 *
 * Both are derived from the single shape passed to `defineTool` — they cannot
 * drift.
 */
export interface McpToolDefinition<S extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputShape: S;
  inputSchema: ZodObject<S>;
  handler: (input: z.infer<ZodObject<S>>) => Promise<McpToolResult>;
}

export interface DefineToolOptions<S extends ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputShape: S;
  handler: (input: z.infer<ZodObject<S>>) => Promise<McpToolResult>;
}

/**
 * Build a typed MCP tool definition from a single zod shape. Use this so the
 * handler's input parameter is fully inferred from the schema — no manual
 * `z.infer` declarations at each call site, no escape hatches in server.ts.
 */
export function defineTool<S extends ZodRawShape>(
  options: DefineToolOptions<S>,
): McpToolDefinition<S> {
  return {
    name: options.name,
    title: options.title,
    description: options.description,
    inputShape: options.inputShape,
    inputSchema: z.object(options.inputShape).strict() as ZodObject<S>,
    handler: options.handler,
  };
}

/**
 * Wrap a plain JS value into a successful tool result with a JSON text block.
 * Pretty-printed for legibility in agent UIs that show the raw text.
 *
 * `structuredContent` is set only for plain objects so the MCP SDK does not
 * reject array/primitive values (the spec types it as a JSON object).
 */
export function jsonResult(value: unknown): McpToolResult {
  const result: McpToolResult = {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    result.structuredContent = value as Record<string, unknown>;
  }
  return result;
}

export function textResult(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

export function errorResult(message: string, hint?: string): McpToolResult {
  const text = hint ? `${message}\n\nHint: ${hint}` : message;
  return { content: [{ type: 'text', text }], isError: true };
}
