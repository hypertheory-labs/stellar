import { describe, it, expect, beforeEach } from 'vitest';
import { recordingTool } from '../../tools/recording';
import { FakeStellarClient, sampleFormattedRecording, sampleRecording } from '../fixtures';

describe('stellar_recording tool', () => {
  let client: FakeStellarClient;
  let tool: ReturnType<typeof recordingTool>;

  beforeEach(() => {
    client = new FakeStellarClient();
    tool = recordingTool(client);
  });

  describe('action=status', () => {
    it('returns the current recording flag', async () => {
      client.recordingActiveValue = true;
      const result = await tool.handler({ action: 'status' });
      const parsed = JSON.parse(result.content[0].text) as { recording: boolean };
      expect(parsed).toEqual({ recording: true });
    });
  });

  describe('action=start', () => {
    it('starts a recording with the given name and returns started:true', async () => {
      const result = await tool.handler({ action: 'start', name: 'my-flow' });
      expect(result.isError).toBeFalsy();
      expect(client.calls.start).toEqual([{ name: 'my-flow' }]);
      const parsed = JSON.parse(result.content[0].text) as { started: boolean };
      expect(parsed.started).toBe(true);
    });

    it('starts without a name', async () => {
      await tool.handler({ action: 'start' });
      expect(client.calls.start).toEqual([{ name: undefined }]);
    });
  });

  describe('action=stop', () => {
    it('returns the session as JSON by default', async () => {
      const result = await tool.handler({ action: 'stop' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(sampleRecording);
    });

    it('returns the browser-side formatted markdown when format=markdown', async () => {
      const result = await tool.handler({ action: 'stop', format: 'markdown' });
      expect(result.content[0].text).toBe(sampleFormattedRecording);
      // Confirms the tool delegated formatting to the browser via the client
      expect(client.calls.formatRecording).toHaveLength(1);
      expect(client.calls.formatRecording[0].session).toEqual(sampleRecording);
    });

    it('returns an error when no recording is active', async () => {
      client.stopResult = null;
      const result = await tool.handler({ action: 'stop' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No active recording');
    });

    it('returns an error when the markdown formatter returns null', async () => {
      client.formattedRecordingResult = null;
      const result = await tool.handler({ action: 'stop', format: 'markdown' });
      expect(result.isError).toBe(true);
    });
  });

  it('rejects unknown actions', () => {
    expect(tool.inputSchema.safeParse({ action: 'pause' }).success).toBe(false);
  });

  it('requires the action field', () => {
    expect(tool.inputSchema.safeParse({}).success).toBe(false);
  });
});
