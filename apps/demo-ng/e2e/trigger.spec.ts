import { test, expect } from '@playwright/test';

/**
 * Trigger field tests.
 *
 * Verifies that state snapshots record *what caused the change* —
 * the event type from the NgRx events API, the click target label,
 * or both combined when both are available within the recency window.
 *
 * NgRx eventGroup produces types in the form "[Source] eventName" (camelCase).
 * e.g. source: 'Counter', event key: 'increment' → "[Counter] increment"
 */

test.describe('Trigger field', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basics');
    await page.waitForFunction(() => !!(window as any).__stellarDevtools);
  });

  async function getLatestTrigger(page: any, storeName: string): Promise<string | undefined> {
    return page.evaluate((name: string) => {
      const entry = (window as any).__stellarDevtools.snapshot(name);
      if (!entry || entry.history.length === 0) return undefined;
      return entry.history[entry.history.length - 1].trigger;
    }, storeName);
  }

  test('trigger is recorded after click', async ({ page }) => {
    const before = await page.evaluate(() => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return entry?.history.length ?? 0;
    });

    await page.click('button:has-text("+")');

    // Wait for a new snapshot to appear
    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const trigger = await getLatestTrigger(page, 'CounterStore');
    expect(typeof trigger).toBe('string');
    expect(trigger!.length).toBeGreaterThan(0);
  });

  test('trigger includes NgRx event type after increment', async ({ page }) => {
    const before = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );

    await page.click('button:has-text("+")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const trigger = await getLatestTrigger(page, 'CounterStore');
    // NgRx eventGroup format: "[Source] eventKey" — source is 'Counter', key is 'increment'
    expect(trigger).toContain('[Counter] increment');
  });

  test('trigger combines event type and click label', async ({ page }) => {
    const before = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );

    await page.click('button:has-text("+")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const trigger = await getLatestTrigger(page, 'CounterStore');
    // Combined format: "[Counter] increment — click: "+""
    expect(trigger).toContain('[Counter] increment');
    expect(trigger).toContain('click:');
    expect(trigger).toContain('+');
  });

  test('trigger reflects correct event for decrement', async ({ page }) => {
    const before = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );

    await page.click('button:has-text("−")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const trigger = await getLatestTrigger(page, 'CounterStore');
    expect(trigger).toContain('[Counter] decrement');
  });

  test('trigger reflects correct event for reset', async ({ page }) => {
    // First increment so there's something to reset, then wait for its snapshot
    const initialLen = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );
    await page.click('button:has-text("+")');
    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, initialLen);

    const before = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('CounterStore')?.history.length ?? 0
    );

    await page.click('button:has-text("Reset")');

    await page.waitForFunction((prevLen: number) => {
      const entry = (window as any).__stellarDevtools.snapshot('CounterStore');
      return (entry?.history.length ?? 0) > prevLen;
    }, before);

    const trigger = await getLatestTrigger(page, 'CounterStore');
    expect(trigger).toContain('[Counter] reset');
  });

  test('diff includes trigger on the more recent snapshot', async ({ page }) => {
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
    expect(typeof diff.to.trigger).toBe('string');
  });
});
