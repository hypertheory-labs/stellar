import type { StellarClient } from '../types';
import { describeTool } from './describe';
import { snapshotTool } from './snapshot';
import { historyTool } from './history';
import { diffTool } from './diff';
import { httpTrafficTool } from './http-traffic';
import { recordingTool } from './recording';
import { aiContextTool } from './ai-context';
import type { McpToolDefinition } from './tool-types';

export function buildAllTools(client: StellarClient): McpToolDefinition[] {
  // Cast required: McpToolDefinition<S> is not assignable to McpToolDefinition<ZodRawShape>
  // because the handler parameter is contravariant in S. The widening is safe —
  // each tool's handler is only called by server.ts via the MCP SDK which passes
  // already-validated input objects shaped by the same inputShape.
  return [
    describeTool(client),
    snapshotTool(client),
    historyTool(client),
    diffTool(client),
    httpTrafficTool(client),
    recordingTool(client),
    aiContextTool(client),
  ] as McpToolDefinition[];
}

export type { McpToolDefinition, DefineToolOptions } from './tool-types';
export { defineTool } from './tool-types';
