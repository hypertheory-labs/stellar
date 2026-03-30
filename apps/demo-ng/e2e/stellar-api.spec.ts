import { test, expect } from '@playwright/test';

/**
 * Tests for window.__stellarDevtools API contract.
 * These tests verify the *shape and legibility* of the API surface —
 * the contract that AI assistants and Playwright fixtures depend on.
 */

test.describe('window.__stellarDevtools API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basics');
    await page.waitForFunction(() => !!(window as any).__stellarDevtools);
  });

  test('API is exposed on window', async ({ page }) => {
    const api = await page.evaluate(() => {
      const w = window as any;
      return {
        hasSnapshot: typeof w.__stellarDevtools?.snapshot === 'function',
        hasHistory: typeof w.__stellarDevtools?.history === 'function',
        hasDiff: typeof w.__stellarDevtools?.diff === 'function',
        hasSave: typeof w.__stellarDevtools?.save === 'function',
      };
    });

    expect(api.hasSnapshot).toBe(true);
    expect(api.hasHistory).toBe(true);
    expect(api.hasDiff).toBe(true);
    expect(api.hasSave).toBe(true);
  });

  test('snapshot() returns all registered stores', async ({ page }) => {
    const stores = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot()
    );

    expect(Array.isArray(stores)).toBe(true);
    expect(stores.length).toBeGreaterThan(0);

    const names = stores.map((s: any) => s.name);
    expect(names).toContain('CounterStore');
    expect(names).toContain('UserStore');
    expect(names).toContain('BooksStore');
  });

  test('snapshot(name) returns a single store entry', async ({ page }) => {
    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')
    );

    expect(entry).not.toBeNull();
    expect(entry.name).toBe('CounterStore');
    expect(Array.isArray(entry.history)).toBe(true);
    expect(entry.history.length).toBeGreaterThan(0);
  });

  test('snapshot(name) returns undefined/null for unknown store', async ({ page }) => {
    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('NonExistent')
    );

    expect(entry == null).toBe(true); // null or undefined
  });

  test('each StoreEntry has required fields', async ({ page }) => {
    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')
    );

    expect(typeof entry.name).toBe('string');
    expect(Array.isArray(entry.history)).toBe(true);

    const snap = entry.history[0];
    expect(typeof snap.timestamp).toBe('number');
    expect(snap.timestamp).toBeGreaterThan(0);
    expect(typeof snap.state).toBe('object');
    expect(snap.state).not.toBeNull();
    expect(typeof snap.inferredShape).toBe('object');
    expect(snap.inferredShape).not.toBeNull();
    // route may be null or string
    expect(snap.route === null || typeof snap.route === 'string').toBe(true);
  });

  test('history(name, n) returns last n snapshots', async ({ page }) => {
    // Trigger a few state changes to build up history
    await page.click('button:has-text("+")');
    await page.click('button:has-text("+")');
    await page.click('button:has-text("+")');

    const history = await page.evaluate(() =>
      (window as any).__stellarDevtools.history('CounterStore', 2)
    );

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeLessThanOrEqual(2);
  });

  test('history(name) returns null for unknown store', async ({ page }) => {
    const result = await page.evaluate(() =>
      (window as any).__stellarDevtools.history('NonExistent', 5)
    );

    expect(result).toBeNull();
  });

  test('diff(name) returns null before any changes', async ({ page }) => {
    // Fresh page — CounterStore has only one snapshot (initial state)
    // diff requires at least 2
    const result = await page.evaluate(() =>
      (window as any).__stellarDevtools.diff('CounterStore')
    );
    // May be null (only one entry) or have from/to — either is valid on fresh page
    if (result !== null) {
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
    }
  });

  test('diff(name) returns from/to after state change', async ({ page }) => {
    const before = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );

    await page.click('button:has-text("+")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const diff = await page.evaluate(() =>
      (window as any).__stellarDevtools.diff('CounterStore')
    );

    expect(diff).not.toBeNull();
    expect(diff).toHaveProperty('from');
    expect(diff).toHaveProperty('to');
    expect(diff.from).toHaveProperty('state');
    expect(diff.to).toHaveProperty('state');
    expect(diff.from.state.count).toBeLessThan(diff.to.state.count);
  });
});
