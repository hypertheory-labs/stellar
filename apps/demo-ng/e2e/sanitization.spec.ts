import { test, expect } from '@playwright/test';

/**
 * Sanitization tests — the most load-bearing tests in the suite.
 *
 * These verify that sensitive data is *never* exposed in the devtools API,
 * regardless of what the underlying store state contains.
 * The SensitiveDataStore in the demo app exercises every sanitization operator.
 *
 * We test against /sanitize route where SensitiveDataStore is initialized.
 */

test.describe('Sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sanitize');
    await page.waitForFunction(() => !!(window as any).__stellarDevtools);
  });

  async function getSensitiveState(page: any) {
    return page.evaluate(() => {
      const entry = (window as any).__stellarDevtools.snapshot('SensitiveDataStore');
      return entry?.history[entry.history.length - 1]?.state ?? null;
    });
  }

  test('SensitiveDataStore is registered', async ({ page }) => {
    const entry = await page.evaluate(() =>
      (window as any).__stellarDevtools.snapshot('SensitiveDataStore')
    );
    expect(entry).not.toBeNull();
    expect(entry.name).toBe('SensitiveDataStore');
  });

  test('omitted fields are absent from state', async ({ page }) => {
    const state = await getSensitiveState(page);

    // sessionToken → 'omitted' — key must not appear
    expect('sessionToken' in state).toBe(false);
  });

  test('redacted fields show [redacted]', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.internalNote).toBe('[redacted]');
  });

  test('masked fields show asterisks', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.pinCode).toMatch(/^\*+$/);
    expect(state.pinCode).not.toBe('7291');
  });

  test('ssn semantic alias → redacted', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.ssn).toBe('[redacted]');
    expect(state.ssn).not.toContain('555');
  });

  test('password semantic alias → masked', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.password).toMatch(/^\*+$/);
    expect(state.password).not.toContain('h0rse');
  });

  test('apiKey semantic alias → hashed (not original)', async ({ page }) => {
    const state = await getSensitiveState(page);

    // apiKey uses 'apiKey' → hashed correlation token
    expect(state.apiKey).not.toBe('sk-prod-4Xm9qRzLpN8wK3jY');
    expect(typeof state.apiKey).toBe('string');
    expect(state.apiKey.length).toBeGreaterThan(0);
  });

  test('creditCard semantic alias → last four digits only', async ({ page }) => {
    const state = await getSensitiveState(page);

    // '4111111111114567' → last four: '4567'
    expect(state.creditCard).toBe('4567');
    expect(state.creditCard).not.toContain('4111111111');
  });

  test('email semantic alias → obfuscated', async ({ page }) => {
    const state = await getSensitiveState(page);

    // full email must not appear
    expect(state.email).not.toBe('jeffry.gonzalez@example.com');
    // should still contain domain
    expect(state.email).toContain('@example.com');
  });

  test('keepFirst(8) preserves prefix only', async ({ page }) => {
    const state = await getSensitiveState(page);

    // userId: 'usr-ab3f-7c9d-4e12-8b56' → keep first 8 chars: 'usr-ab3f'
    expect(state.userId).toBe('usr-ab3f');
  });

  test('keepLast(6) preserves suffix only', async ({ page }) => {
    const state = await getSensitiveState(page);

    // orderRef: 'ORD-2026-03-XYZ-001122' → last 6: '001122'
    expect(state.orderRef).toBe('001122');
  });

  test('truncate(40) caps long text', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.notes.length).toBeLessThanOrEqual(43); // 40 chars + possible '...'
    expect(state.notes).not.toContain('Follow-up scheduled'); // content beyond 40 chars
  });

  test('arrayOf: cardNumber in paymentMethods → lastFour', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(Array.isArray(state.paymentMethods)).toBe(true);
    for (const pm of state.paymentMethods) {
      expect(typeof pm.cardNumber).toBe('string');
      expect(pm.cardNumber.length).toBe(4);
      // full card numbers must not appear
      expect(pm.cardNumber).not.toContain('4111');
      expect(pm.cardNumber).not.toContain('5500');
    }
  });

  test('arrayOf: expiry in paymentMethods → omitted', async ({ page }) => {
    const state = await getSensitiveState(page);

    for (const pm of state.paymentMethods) {
      expect('expiry' in pm).toBe(false);
    }
  });

  test('nested profile: dateOfBirth → omitted', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect('dateOfBirth' in state.profile).toBe(false);
  });

  test('nested profile: phone → phoneNumber (lastFour)', async ({ page }) => {
    const state = await getSensitiveState(page);

    // '555-867-5309' → last 4 digits
    expect(state.profile.phone).toBe('5309');
    expect(state.profile.phone).not.toContain('555-867');
  });

  test('nested profile: displayName is untouched', async ({ page }) => {
    const state = await getSensitiveState(page);

    expect(state.profile.displayName).toBe('Jeff G.');
  });

  test('raw state values never appear anywhere in devtools output', async ({ page }) => {
    // Belt-and-suspenders: serialize the entire snapshot and check raw secrets
    // never appear in any form
    const raw = await page.evaluate(() => {
      const entry = (window as any).__stellarDevtools.snapshot('SensitiveDataStore');
      return JSON.stringify(entry);
    });

    expect(raw).not.toContain('tok_live_8f3kQz9mNpR7wX2');      // sessionToken
    expect(raw).not.toContain('h0rse-b@ttery-st@ple');           // password
    expect(raw).not.toContain('sk-prod-4Xm9qRzLpN8wK3jY');      // apiKey
    expect(raw).not.toContain('4111111111114567');                // creditCard (full)
    expect(raw).not.toContain('555-12-6789');                    // ssn
    expect(raw).not.toContain('1983-07-14');                     // dateOfBirth
  });
});

// ── Blood/brain barrier — raw state cannot reach export surfaces ─────────────
//
// The peek affordance gives human developers a view of unsanitized state for
// debugging. This block verifies that the raw reader is strictly internal to
// the overlay and cannot be reached from window.__stellarDevtools.

test.describe('Blood/brain barrier — raw state never reaches export surfaces', () => {
  const RAW_SECRETS = [
    'tok_live_8f3kQz9mNpR7wX2',   // sessionToken
    'h0rse-b@ttery-st@ple',        // password
    'sk-prod-4Xm9qRzLpN8wK3jY',   // apiKey
    '4111111111114567',             // creditCard (full)
    '555-12-6789',                  // ssn
    '1983-07-14',                   // dateOfBirth
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/sanitize');
    await page.waitForFunction(() => !!(window as any).__stellarDevtools);
  });

  test('rawReader is not accessible on window.__stellarDevtools', async ({ page }) => {
    const keys = await page.evaluate(() => Object.keys((window as any).__stellarDevtools));
    expect(keys).not.toContain('rawReader');
  });

  test('store entries in describe() do not expose rawReader', async ({ page }) => {
    const described = await page.evaluate(() =>
      JSON.stringify((window as any).__stellarDevtools.describe())
    );
    expect(described).not.toContain('rawReader');
  });

  test('history() contains no raw secret values', async ({ page }) => {
    const serialized = await page.evaluate(() =>
      JSON.stringify((window as any).__stellarDevtools.history('SensitiveDataStore'))
    );
    for (const secret of RAW_SECRETS) {
      expect(serialized).not.toContain(secret);
    }
  });

  test('diff() contains no raw secret values', async ({ page }) => {
    // Trigger a second snapshot so diff() has something to compare
    await page.evaluate(() => (window as any).__stellarDevtools.snapshot('SensitiveDataStore'));
    const serialized = await page.evaluate(() =>
      JSON.stringify((window as any).__stellarDevtools.diff('SensitiveDataStore'))
    );
    for (const secret of RAW_SECRETS) {
      expect(serialized).not.toContain(secret);
    }
  });

  test('describe() output contains no raw secret values', async ({ page }) => {
    const serialized = await page.evaluate(() =>
      JSON.stringify((window as any).__stellarDevtools.describe())
    );
    for (const secret of RAW_SECRETS) {
      expect(serialized).not.toContain(secret);
    }
  });
});
