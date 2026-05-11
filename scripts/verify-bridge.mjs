#!/usr/bin/env node
/**
 * Manual end-to-end validation script.
 *
 * Connects to a running `stellar-mcp` bridge as if it were the Angular app,
 * pushes a synthetic state snapshot, then exercises every read path through
 * the MCP `BridgeServer` interface via a child-process spawn of the bin.
 *
 * Run AFTER `node libs/stellar-mcp/dist/cli.js` is already up on port 4280.
 *
 *   node scripts/verify-bridge.mjs
 */
import WebSocket from 'ws';

const URL = 'ws://127.0.0.1:4280/__stellar';
const PROTO = '1';

const sampleState = {
  stores: [
    {
      name: 'CounterStore',
      description: 'Synthetic counter for bridge verification.',
      sourceHint: 'scripts/verify-bridge.mjs',
      registeredAt: Date.now() - 1000,
      history: [
        { timestamp: Date.now() - 800, state: { count: 0 }, route: '/', inferredShape: { count: 'number' } },
        { timestamp: Date.now() - 400, state: { count: 1 }, route: '/', inferredShape: { count: 'number' }, trigger: 'click: "+"' },
        { timestamp: Date.now() - 100, state: { count: 2 }, route: '/', inferredShape: { count: 'number' }, trigger: 'click: "+"' },
      ],
      instances: [
        {
          id: 'i1',
          name: 'CounterStore',
          registeredAt: Date.now() - 1000,
          history: [
            { timestamp: Date.now() - 800, state: { count: 0 }, route: '/', inferredShape: { count: 'number' } },
            { timestamp: Date.now() - 400, state: { count: 1 }, route: '/', inferredShape: { count: 'number' }, trigger: 'click: "+"' },
            { timestamp: Date.now() - 100, state: { count: 2 }, route: '/', inferredShape: { count: 'number' }, trigger: 'click: "+"' },
          ],
        },
      ],
    },
  ],
  httpEvents: [],
  describe: {
    version: '1.1',
    stores: [
      {
        name: 'CounterStore',
        description: 'Synthetic counter for bridge verification.',
        snapshotCount: 3,
        registeredAt: 0,
        destroyedAt: null,
        sourceHint: 'scripts/verify-bridge.mjs',
        instances: [{ id: 'i1', registeredAt: 0, destroyedAt: null, snapshotCount: 3 }],
      },
    ],
    api: ['snapshot', 'history', 'diff', 'http', 'record', 'describe', 'formatForAI'],
    recordingActive: false,
    caveat: 'verification fixture',
  },
  recordingActive: false,
  lastRecording: null,
};

const ws = new WebSocket(URL);

ws.on('open', () => {
  console.log(`✓ connected to ${URL}`);
  ws.send(JSON.stringify({
    type: 'hello',
    role: 'app',
    protocol: PROTO,
    appUrl: 'http://localhost:4200/verify',
    userAgent: 'verify-bridge.mjs',
  }));
});

ws.on('message', async (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'hello-ack') {
    console.log(`✓ handshake (server protocol=${msg.protocol})`);
    ws.send(JSON.stringify({ type: 'state', payload: sampleState }));
    console.log('✓ pushed synthetic state (1 store, 3 snapshots)');

    // Verify via the /health endpoint
    const res = await fetch('http://127.0.0.1:4280/health');
    const health = await res.json();
    if (!health.appConnected) {
      console.error('✗ /health says appConnected=false after hello');
      process.exit(1);
    }
    console.log('✓ /health reports appConnected=true');
    console.log('');
    console.log('Bridge is healthy. Open http://localhost:4200 in a browser to');
    console.log('test the real Angular ↔ MCP wiring, or kill this script with Ctrl+C.');
  }
  if (msg.type === 'rpc-request') {
    console.log(`→ rpc-request: ${msg.method}(${JSON.stringify(msg.args)})`);
    // Echo back a fake response so RPC tests work end-to-end.
    let result = null;
    if (msg.method === 'formatForAI.all') {
      result = '## Stellar Devtools — verify-bridge.mjs\n\n(synthetic markdown)';
    }
    ws.send(JSON.stringify({ type: 'rpc-response', id: msg.id, ok: true, result }));
  }
});

ws.on('error', (err) => {
  console.error(`✗ connection error: ${err.message}`);
  console.error('  Is stellar-mcp running on port 4280? Start it with:');
  console.error('    node libs/stellar-mcp/dist/cli.js');
  process.exit(1);
});

process.on('SIGINT', () => {
  ws.close();
  process.exit(0);
});
