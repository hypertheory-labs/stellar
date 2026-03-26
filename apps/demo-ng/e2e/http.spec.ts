import { test, expect } from '@playwright/test';

/**
 * HTTP monitoring tests.
 *
 * Verifies that `window.__stellarDevtools.http()` captures fetch traffic
 * with the correct shape, and that `httpEventId` on state snapshots links
 * back to the HTTP event that caused the state change.
 *
 * Uses page.route() to avoid external network dependency on jsonplaceholder.
 */

const MOCK_TODOS = [
  { id: 1, title: 'Write http tests', completed: false, userId: 1 },
  { id: 2, title: 'Ship Stellar', completed: false, userId: 1 },
];

test.describe('http() API', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/jsonplaceholder.typicode.com/**', async route => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TODOS),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 201, title: 'New', completed: false, userId: 1 }),
        });
      }
    });

    await page.goto('/');
  });

  test('http() is exposed on window.__stellarDevtools', async ({ page }) => {
    const hasHttp = await page.evaluate(
      () => typeof (window as any).__stellarDevtools?.http === 'function',
    );
    expect(hasHttp).toBe(true);
  });

  test('http() returns an array', async ({ page }) => {
    const result = await page.evaluate(() => (window as any).__stellarDevtools.http());
    expect(Array.isArray(result)).toBe(true);
  });

  test('http() captures a fetch triggered by a button click', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length > 0,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    expect(events.length).toBeGreaterThan(0);
  });

  test('each HttpEvent has required fields', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length > 0,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    const ev = events[0];

    expect(typeof ev.id).toBe('string');
    expect(ev.id.length).toBeGreaterThan(0);
    expect(typeof ev.timestamp).toBe('number');
    expect(ev.timestamp).toBeGreaterThan(0);
    expect(typeof ev.method).toBe('string');
    expect(typeof ev.url).toBe('string');
    expect(typeof ev.status).toBe('number');
    expect(typeof ev.ok).toBe('boolean');
    expect(typeof ev.duration).toBe('number');
    expect(ev.duration).toBeGreaterThanOrEqual(0);
  });

  test('method and url reflect the actual request', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length > 0,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    const getEvent = events.find((e: any) => e.method === 'GET');

    expect(getEvent).toBeDefined();
    expect(getEvent.url).toContain('todos');
    expect(getEvent.status).toBe(200);
    expect(getEvent.ok).toBe(true);
  });

  test('responseBody is present for JSON responses', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length > 0,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    const ev = events.find((e: any) => e.method === 'GET');

    expect(ev.responseBody).toBeDefined();
    expect(Array.isArray(ev.responseBody)).toBe(true);
  });

  test('trigger field is set when a click preceded the fetch', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length > 0,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    const ev = events.find((e: any) => e.method === 'GET');

    // The click on "Load todos" should be captured as the trigger
    expect(typeof ev.trigger).toBe('string');
    expect(ev.trigger.length).toBeGreaterThan(0);
    expect(ev.trigger).toContain('Load todos');
  });

  test('http() accumulates multiple events', async ({ page }) => {
    await page.click('button:has-text("Load todos")');
    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length >= 1,
    );

    // Trigger another load
    await page.click('button:has-text("Load todos")');
    await page.waitForFunction(
      () => (window as any).__stellarDevtools.http()?.length >= 2,
    );

    const events = await page.evaluate(() => (window as any).__stellarDevtools.http());
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});

// ── httpEventId causal linking ────────────────────────────────────────────────

test.describe('httpEventId on state snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/jsonplaceholder.typicode.com/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TODOS),
      });
    });

    await page.goto('/');
  });

  test('state snapshot produced by a fetch has httpEventId set', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    // Wait for todos to land in state
    await page.waitForFunction(() => {
      const entry = (window as any).__stellarDevtools.snapshot('TodosStore');
      return entry?.history.some((s: any) => s.state.todos?.length > 0);
    });

    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('TodosStore'),
    );

    const snapWithTodos = entry.history.find((s: any) => s.state.todos?.length > 0);
    expect(snapWithTodos).toBeDefined();
    expect(typeof snapWithTodos.httpEventId).toBe('string');
    expect(snapWithTodos.httpEventId.length).toBeGreaterThan(0);
  });

  test('httpEventId on snapshot matches an id in http()', async ({ page }) => {
    await page.click('button:has-text("Load todos")');

    await page.waitForFunction(() => {
      const entry = (window as any).__stellarDevtools.snapshot('TodosStore');
      return entry?.history.some((s: any) => s.state.todos?.length > 0);
    });

    const { httpEventId, httpEvents } = await page.evaluate(() => {
      const entry = (window as any).__stellarDevtools.snapshot('TodosStore');
      const snap = entry.history.find((s: any) => s.state.todos?.length > 0);
      return {
        httpEventId: snap?.httpEventId,
        httpEvents: (window as any).__stellarDevtools.http(),
      };
    });

    const matchingEvent = httpEvents.find((e: any) => e.id === httpEventId);
    expect(matchingEvent).toBeDefined();
    expect(matchingEvent.method).toBe('GET');
  });

  test('pure state changes (no HTTP) do not have httpEventId', async ({ page }) => {
    const before = await page.evaluate(
      () => (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0,
    );

    await page.click('button:has-text("+")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore'),
    );

    const latest = entry.history[entry.history.length - 1];
    // httpEventId should be absent or null/undefined for non-HTTP changes
    expect(latest.httpEventId == null).toBe(true);
  });
});
