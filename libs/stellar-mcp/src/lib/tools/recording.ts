import { z } from 'zod';
import type { StellarClient } from '../types';
import { isStellarMcpError } from '../errors';
import { defineTool, errorResult, jsonResult, textResult } from './tool-types';

export function recordingTool(client: StellarClient) {
  return defineTool({
    name: 'stellar_recording',
    title: 'Control causal recording sessions',
    description:
      'Manages Stellar recording sessions — directed graphs of clicks, ngrx events, HTTP ' +
      'traffic, and state snapshots that capture causal relationships between user input ' +
      'and observable change. Use action=start before reproducing a bug, then action=stop ' +
      'to retrieve the session graph for analysis. The recording format is the canonical ' +
      'AI hand-off artifact for "explain what just happened" questions.',
    inputShape: {
      action: z
        .enum(['status', 'start', 'stop'])
        .describe(
          'status: query whether a recording is active. start: begin a new recording. ' +
            'stop: end and return the session.',
        ),
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Optional label for the recording (only used with action=start).'),
      format: z
        .enum(['json', 'markdown'])
        .optional()
        .describe('Output format for action=stop. Defaults to json.'),
    },
    handler: async input => {
      try {
        if (input.action === 'status') {
          const isRecording = await client.record.isRecording();
          return jsonResult({ recording: isRecording });
        }
        if (input.action === 'start') {
          await client.record.start(input.name);
          return jsonResult({ started: true });
        }
        // action === 'stop'
        const session = await client.record.stop();
        if (!session) {
          return errorResult(
            'No active recording to stop.',
            'Call this tool with action=start first.',
          );
        }
        if (input.format === 'markdown') {
          // Use the browser-side formatter so the output stays identical to
          // what the overlay's "Copy for AI" button produces.
          const markdown = await client.formatForAI.recording(session);
          if (!markdown) {
            return errorResult('Recording session was captured but formatter returned null.');
          }
          return textResult(markdown);
        }
        return jsonResult(session);
      } catch (err) {
        if (isStellarMcpError(err)) return errorResult(err.message, err.hint);
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  });
}
