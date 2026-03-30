import { test, expect } from '@playwright/test';

/**
 * describe() API tests.
 *
 * Verifies the structured manifest returned by `window.__stellarDevtools.describe()`:
 * shape, store metadata (description, registeredAt, snapshotCount, sourceHint),
 * api list, recordingActive flag, and the lazy-loading caveat.
 *
 * This is the surface an AI coding assistant uses to orient itself to the app.
 */

test.describe('describe() API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basics');
    await page.waitForFunction(() => !!(window as any).__stellarDevtools);
  });

  test('describe is a function on window.__stellarDevtools', async ({ page }) => {
    const hasDescribe = await page.evaluate(
      () => typeof (window as any).__stellarDevtools?.describe === 'function',
    );
    expect(hasDescribe).toBe(true);
  });

  test('describe() returns an object with required top-level fields', async ({ page }) => {
    const result = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(typeof result.version).toBe('string');
    expect(Array.isArray(result.stores)).toBe(true);
    expect(Array.isArray(result.api)).toBe(true);
    expect(typeof result.recordingActive).toBe('boolean');
    expect(typeof result.caveat).toBe('string');
  });

  test('version is "1.0"', async ({ page }) => {
    const { version } = await page.evaluate(() => (window as any).__stellarDevtools.describe());
    expect(version).toBe('1.0');
  });

  test('stores list includes all registered stores', async ({ page }) => {
    const { stores } = await page.evaluate(() => (window as any).__stellarDevtools.describe());
    const names = stores.map((s: any) => s.name);

    expect(names).toContain('CounterStore');
    expect(names).toContain('UserStore');
    expect(names).toContain('BooksStore');
    expect(names).toContain('TodosStore');
  });

  test('each store entry has required fields', async ({ page }) => {
    const { stores } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    for (const store of stores) {
      expect(typeof store.name).toBe('string');
      // description is string or null
      expect(store.description === null || typeof store.description === 'string').toBe(true);
      expect(typeof store.snapshotCount).toBe('number');
      expect(store.snapshotCount).toBeGreaterThan(0);
      expect(typeof store.registeredAt).toBe('number');
      // sourceHint is string or null
      expect(store.sourceHint === null || typeof store.sourceHint === 'string').toBe(true);
    }
  });

  test('stores with description have it populated', async ({ page }) => {
    const { stores } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    const counter = stores.find((s: any) => s.name === 'CounterStore');
    expect(counter).toBeDefined();
    expect(typeof counter.description).toBe('string');
    expect(counter.description.length).toBeGreaterThan(0);

    const todos = stores.find((s: any) => s.name === 'TodosStore');
    expect(todos).toBeDefined();
    expect(typeof todos.description).toBe('string');
  });

  test('stores with sourceHint have it populated', async ({ page }) => {
    const { stores } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    const todos = stores.find((s: any) => s.name === 'TodosStore');
    expect(todos.sourceHint).toBe('apps/demo-ng/src/app/todos.store.ts');
  });

  test('registeredAt is a non-negative number (ms since app start)', async ({ page }) => {
    const { stores } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    for (const store of stores) {
      expect(store.registeredAt).toBeGreaterThanOrEqual(0);
      // Should be well under a minute for a freshly loaded app
      expect(store.registeredAt).toBeLessThan(60_000);
    }
  });

  test('snapshotCount reflects actual history length', async ({ page }) => {
    // Trigger a change to CounterStore
    await page.click('button:has-text("+")');
    await page.click('button:has-text("+")');

    // Wait for snapshots to land
    await page.waitForFunction(() => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) >= 3;
    });

    const [describeResult, snapshotEntry] = await page.evaluate(() => [
      (window as any).__stellarDevtools.describe(),
      (window as any).__stellarDevtools.snapshot('CounterStore'),
    ]);

    const describeCounter = describeResult.stores.find((s: any) => s.name === 'CounterStore');
    expect(describeCounter.snapshotCount).toBe(snapshotEntry.history.length);
  });

  test('api list contains all expected methods', async ({ page }) => {
    const { api } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    expect(api).toContain('snapshot');
    expect(api).toContain('history');
    expect(api).toContain('diff');
    expect(api).toContain('http');
    expect(api).toContain('record');
    expect(api).toContain('describe');
  });

  test('recordingActive is false when not recording', async ({ page }) => {
    const { recordingActive } = await page.evaluate(
      () => (window as any).__stellarDevtools.describe(),
    );
    expect(recordingActive).toBe(false);
  });

  test('recordingActive is true while a recording is in progress', async ({ page }) => {
    await page.evaluate(() => (window as any).__stellarDevtools.record.start());

    const { recordingActive } = await page.evaluate(
      () => (window as any).__stellarDevtools.describe(),
    );
    expect(recordingActive).toBe(true);

    // Clean up
    await page.evaluate(() => (window as any).__stellarDevtools.record.stop());
  });

  test('caveat mentions lazy loading', async ({ page }) => {
    const { caveat } = await page.evaluate(() => (window as any).__stellarDevtools.describe());

    expect(typeof caveat).toBe('string');
    expect(caveat.length).toBeGreaterThan(0);
    // The caveat exists specifically to warn about lazy-loaded routes
    expect(caveat.toLowerCase()).toContain('lazy');
  });
});
