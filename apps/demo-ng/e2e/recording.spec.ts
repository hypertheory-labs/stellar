import { test, expect } from '@playwright/test';

/**
 * Recording API tests.
 *
 * Verifies that `window.__stellarDevtools.record` produces a well-formed
 * RecordingSession directed graph — correct shape, node types, edge wiring,
 * and causal linking between triggers, HTTP events, and state snapshots.
 *
 * HTTP tests use page.route() to avoid external network dependencies.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function startRecording(page: any, name?: string): Promise<void> {
  await page.evaluate((n: string | undefined) => {
    (window as any).__stellarDevtools.record.start(n);
  }, name);
}

async function stopRecording(page: any): Promise<any> {
  return page.evaluate(() => (window as any).__stellarDevtools.record.stop());
}

async function waitForNewSnapshot(page: any, storeName: string, prevLen: number): Promise<void> {
  await page.waitForFunction(
    ({ name, len }: { name: string; len: number }) => {
      const entry = (window as any).__stellarDevtools.snapshot(name);
      return (entry?.history.length ?? 0) > len;
    },
    { name: storeName, len: prevLen },
  );
}

// ── API surface ───────────────────────────────────────────────────────────────

test.describe('record API surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('record object has start, stop, stopAndDownload', async ({ page }) => {
    const shape = await page.evaluate(() => {
      const r = (window as any).__stellarDevtools?.record;
      return {
        hasStart: typeof r?.start === 'function',
        hasStop: typeof r?.stop === 'function',
        hasStopAndDownload: typeof r?.stopAndDownload === 'function',
      };
    });

    expect(shape.hasStart).toBe(true);
    expect(shape.hasStop).toBe(true);
    expect(shape.hasStopAndDownload).toBe(true);
  });

  test('stop() returns null when not recording', async ({ page }) => {
    const result = await stopRecording(page);
    expect(result).toBeNull();
  });

  test('start() then stop() returns a session', async ({ page }) => {
    await startRecording(page);
    const session = await stopRecording(page);

    expect(session).not.toBeNull();
    expect(typeof session).toBe('object');
  });

  test('subsequent stop() after session returns null', async ({ page }) => {
    await startRecording(page);
    await stopRecording(page);
    const second = await stopRecording(page);

    expect(second).toBeNull();
  });
});

// ── RecordingSession shape ────────────────────────────────────────────────────

test.describe('RecordingSession shape', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('session has required top-level fields', async ({ page }) => {
    await startRecording(page);
    const session = await stopRecording(page);

    expect(typeof session.name).toBe('string');
    expect(typeof session.recordedAt).toBe('string');
    expect(typeof session.duration).toBe('number');
    expect(Array.isArray(session.nodes)).toBe(true);
    expect(Array.isArray(session.edges)).toBe(true);
  });

  test('recordedAt is a valid ISO timestamp', async ({ page }) => {
    await startRecording(page);
    const session = await stopRecording(page);

    const parsed = new Date(session.recordedAt);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(session.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('duration is a positive number', async ({ page }) => {
    await startRecording(page);
    const session = await stopRecording(page);

    expect(session.duration).toBeGreaterThan(0);
  });

  test('default name is "recording"', async ({ page }) => {
    await startRecording(page); // no name arg
    const session = await stopRecording(page);

    expect(session.name).toBe('recording');
  });

  test('custom name is preserved', async ({ page }) => {
    await startRecording(page, 'my-test-session');
    const session = await stopRecording(page);

    expect(session.name).toBe('my-test-session');
  });
});

// ── State capture ─────────────────────────────────────────────────────────────

test.describe('state capture during recording', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('state-snapshot nodes appear for changes made during recording', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);
    const stateNodes = session.nodes.filter((n: any) => n.type === 'state-snapshot');

    expect(stateNodes.length).toBeGreaterThan(0);
  });

  test('state-snapshot node has required fields', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);
    const snapNode = session.nodes.find(
      (n: any) => n.type === 'state-snapshot' && n.store === 'CounterStore',
    );

    expect(snapNode).toBeDefined();
    expect(typeof snapNode.id).toBe('string');
    expect(typeof snapNode.t).toBe('number');
    expect(snapNode.t).toBeGreaterThanOrEqual(0);
    expect(typeof snapNode.snapshotIndex).toBe('number');
  });

  test('state-snapshot node includes delta for changed keys', async ({ page }) => {
    // Ensure at least one prior snapshot exists so delta can be computed
    await page.click('button:has-text("+")');

    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);
    const snapNode = session.nodes.find(
      (n: any) => n.type === 'state-snapshot' && n.store === 'CounterStore',
    );

    // delta should be present and include 'count'
    expect(snapNode?.delta).toBeDefined();
    expect(snapNode?.delta?.count).toBeDefined();
    const [from, to] = snapNode.delta.count;
    expect(to).toBeGreaterThan(from as number);
  });

  test('snapshots before start() are not included', async ({ page }) => {
    // Trigger a change before recording
    await page.click('button:has-text("+")');
    await page.click('button:has-text("+")');

    const snapshotCountBefore = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);

    // One more change during recording
    const beforeRecordedLen = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', beforeRecordedLen);

    const session = await stopRecording(page);
    const stateNodes = session.nodes.filter(
      (n: any) => n.type === 'state-snapshot' && n.store === 'CounterStore',
    );

    // Only the snapshot taken during recording should appear
    expect(stateNodes.length).toBeLessThan(snapshotCountBefore);
    expect(stateNodes.length).toBe(1);
  });
});

// ── Edge wiring ───────────────────────────────────────────────────────────────

test.describe('edge wiring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('edges array contains objects with from, to, label', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);

    expect(session.edges.length).toBeGreaterThan(0);
    for (const edge of session.edges) {
      expect(typeof edge.from).toBe('string');
      expect(typeof edge.to).toBe('string');
      expect(typeof edge.label).toBe('string');
    }
  });

  test('a "caused" edge connects trigger node to state-snapshot node', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);
    const causedEdge = session.edges.find((e: any) => e.label === 'caused');

    expect(causedEdge).toBeDefined();

    // from must be a trigger node (click or ngrx-event)
    const fromNode = session.nodes.find((n: any) => n.id === causedEdge.from);
    expect(['click', 'ngrx-event']).toContain(fromNode?.type);

    // to must be a state-snapshot node
    const toNode = session.nodes.find((n: any) => n.id === causedEdge.to);
    expect(toNode?.type).toBe('state-snapshot');
  });

  test('ngrx-event trigger node has a label', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await startRecording(page);
    await page.click('button:has-text("+")');
    await waitForNewSnapshot(page, 'CounterStore', before);

    const session = await stopRecording(page);
    const triggerNodes = session.nodes.filter(
      (n: any) => n.type === 'ngrx-event' || n.type === 'click',
    );

    expect(triggerNodes.length).toBeGreaterThan(0);
    for (const node of triggerNodes) {
      expect(typeof node.label).toBe('string');
      expect(node.label.length).toBeGreaterThan(0);
    }
  });
});

// ── HTTP capture ──────────────────────────────────────────────────────────────

test.describe('HTTP capture in recording', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept jsonplaceholder to avoid external network dependency
    await page.route('**/jsonplaceholder.typicode.com/todos**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, title: 'Write recording tests', completed: false, userId: 1 },
            { id: 2, title: 'Ship Stellar v1', completed: false, userId: 1 },
          ]),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 201, title: 'New todo', completed: false, userId: 1 }),
        });
      }
    });

    await page.goto('/');
  });

  test('http-request and http-response nodes appear for fetch during recording', async ({ page }) => {
    await startRecording(page);

    await page.click('button:has-text("Load todos")');

    // Wait for the HTTP event to be captured
    await page.waitForFunction(() => {
      const events = (window as any).__stellarDevtools.http();
      return Array.isArray(events) && events.length > 0;
    });

    const session = await stopRecording(page);

    const reqNodes = session.nodes.filter((n: any) => n.type === 'http-request');
    const respNodes = session.nodes.filter((n: any) => n.type === 'http-response');

    expect(reqNodes.length).toBeGreaterThan(0);
    expect(respNodes.length).toBeGreaterThan(0);
  });

  test('http-request node has method and url', async ({ page }) => {
    await startRecording(page);

    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(() => {
      return (window as any).__stellarDevtools.http()?.length > 0;
    });

    const session = await stopRecording(page);
    const reqNode = session.nodes.find((n: any) => n.type === 'http-request');

    expect(reqNode).toBeDefined();
    expect(reqNode.method).toBe('GET');
    expect(typeof reqNode.url).toBe('string');
    expect(reqNode.url).toContain('todos');
  });

  test('http-response node has status and duration', async ({ page }) => {
    await startRecording(page);

    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(() => {
      return (window as any).__stellarDevtools.http()?.length > 0;
    });

    const session = await stopRecording(page);
    const respNode = session.nodes.find((n: any) => n.type === 'http-response');

    expect(respNode).toBeDefined();
    expect(respNode.status).toBe(200);
    expect(typeof respNode.duration).toBe('number');
    expect(respNode.duration).toBeGreaterThanOrEqual(0);
  });

  test('"resolved" edge connects http-request to http-response', async ({ page }) => {
    await startRecording(page);

    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(() => {
      return (window as any).__stellarDevtools.http()?.length > 0;
    });

    const session = await stopRecording(page);

    const reqNode = session.nodes.find((n: any) => n.type === 'http-request');
    const respNode = session.nodes.find((n: any) => n.type === 'http-response');
    const resolvedEdge = session.edges.find(
      (e: any) => e.label === 'resolved' && e.from === reqNode?.id && e.to === respNode?.id,
    );

    expect(resolvedEdge).toBeDefined();
  });

  test('"produced" edge connects http-response to state-snapshot after load', async ({ page }) => {
    await startRecording(page);

    await page.click('button:has-text("Load todos")');

    // Wait for todos state to update (loading → loaded)
    await page.waitForFunction(() => {
      const entry = (window as any).__stellarDevtools.snapshot('TodosStore');
      return entry?.history.some((s: any) => s.state.todos?.length > 0);
    });

    const session = await stopRecording(page);

    const respNode = session.nodes.find((n: any) => n.type === 'http-response');
    const producedEdge = session.edges.find(
      (e: any) => e.label === 'produced' && e.from === respNode?.id,
    );

    expect(producedEdge).toBeDefined();

    const snapNode = session.nodes.find((n: any) => n.id === producedEdge.to);
    expect(snapNode?.type).toBe('state-snapshot');
    expect(snapNode?.store).toBe('TodosStore');
  });
});
