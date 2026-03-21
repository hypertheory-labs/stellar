import { describe, it, expect } from 'vitest';
import { sanitized, autoRedactConfig, arrayOf, keepFirst, keepLast, truncate, replace } from './sanitation';

// ── Primitive operators ───────────────────────────────────────────────────────

describe('omitted', () => {
  it('removes the key from output entirely', () => {
    const result = sanitized({ id: '1', secret: 'abc' }, { secret: 'omitted' });
    expect(result).toEqual({ id: '1' });
    expect('secret' in result).toBe(false);
  });
});

describe('redacted', () => {
  it('keeps the key but replaces value with [redacted]', () => {
    const result = sanitized({ id: '1', token: 'abc123' }, { token: 'redacted' });
    expect(result).toEqual({ id: '1', token: '[redacted]' });
  });
});

describe('lastFour', () => {
  it('keeps only the last four characters', () => {
    expect(sanitized({ card: '1234567812345678' }, { card: 'lastFour' })).toEqual({ card: '5678' });
  });
});

describe('firstFour', () => {
  it('keeps only the first four characters', () => {
    expect(sanitized({ zip: '90210-3456' }, { zip: 'firstFour' })).toEqual({ zip: '9021' });
  });
});

describe('masked', () => {
  it('replaces value with asterisks, length capped at 8', () => {
    expect(sanitized({ pw: 'abc' },         { pw: 'masked' })).toEqual({ pw: '***' });
    expect(sanitized({ pw: 'abcdefgh' },    { pw: 'masked' })).toEqual({ pw: '********' });
    expect(sanitized({ pw: 'averylongpw' }, { pw: 'masked' })).toEqual({ pw: '********' });
  });
});

describe('hashed', () => {
  it('produces a deterministic correlation token', () => {
    const r1 = sanitized({ apiKey: 'secret-key' },   { apiKey: 'hashed' });
    const r2 = sanitized({ apiKey: 'secret-key' },   { apiKey: 'hashed' });
    const r3 = sanitized({ apiKey: 'different-key' }, { apiKey: 'hashed' });
    expect(r1.apiKey).toMatch(/^\[~[0-9a-f]{8}\]$/);
    expect(r1.apiKey).toBe(r2.apiKey);
    expect(r1.apiKey).not.toBe(r3.apiKey);
  });
});

describe('email', () => {
  it('masks the local part keeping the first two characters', () => {
    expect(sanitized({ e: 'john@example.com' }, { e: 'email' })).toEqual({ e: 'jo***@example.com' });
    expect(sanitized({ e: 'a@example.com' },    { e: 'email' })).toEqual({ e: 'a***@example.com' });
  });

  it('falls back to [redacted] for non-email strings', () => {
    expect(sanitized({ e: 'notanemail' }, { e: 'email' })).toEqual({ e: '[redacted]' });
  });
});

// ── Semantic aliases ──────────────────────────────────────────────────────────

describe('semantic aliases', () => {
  it('creditCard → lastFour', () =>
    expect(sanitized({ n: '1234567812345678' }, { n: 'creditCard' })).toEqual({ n: '5678' }));

  it('phoneNumber → lastFour', () =>
    expect(sanitized({ n: '5551234567' }, { n: 'phoneNumber' })).toEqual({ n: '4567' }));

  it('ssn → redacted', () =>
    expect(sanitized({ n: '555-55-5555' }, { n: 'ssn' })).toEqual({ n: '[redacted]' }));

  it('password → masked', () =>
    expect(sanitized({ n: 'hunter2' }, { n: 'password' })).toEqual({ n: '*******' }));

  it('apiKey → hashed correlation token', () =>
    expect(sanitized({ n: 'sk-abc123' }, { n: 'apiKey' }).n).toMatch(/^\[~[0-9a-f]{8}\]$/));

  it('secret → redacted', () =>
    expect(sanitized({ n: 'topsecret' }, { n: 'secret' })).toEqual({ n: '[redacted]' }));

  it('emailAddress → masked email', () =>
    expect(sanitized({ n: 'jane@example.com' }, { n: 'emailAddress' })).toEqual({ n: 'ja***@example.com' }));
});

// ── Parameterized operators ───────────────────────────────────────────────────

describe('keepFirst', () => {
  it('keeps the first n characters', () => {
    expect(sanitized({ id: 'usr-abc-123-xyz' }, { id: keepFirst(7) })).toEqual({ id: 'usr-abc' });
  });
});

describe('keepLast', () => {
  it('keeps the last n characters', () => {
    expect(sanitized({ id: 'usr-abc-123-xyz' }, { id: keepLast(3) })).toEqual({ id: 'xyz' });
  });
});

describe('truncate', () => {
  it('truncates long values with an ellipsis', () => {
    expect(sanitized({ note: 'a very long string' }, { note: truncate(6) })).toEqual({ note: 'a very…' });
  });

  it('leaves short values unchanged', () => {
    expect(sanitized({ note: 'short' }, { note: truncate(10) })).toEqual({ note: 'short' });
  });
});

describe('replace', () => {
  it('applies a custom transform function', () => {
    const result = sanitized(
      { code: 'ABC-123' },
      { code: replace(v => v.replace(/-/g, '')) },
    );
    expect(result).toEqual({ code: 'ABC123' });
  });
});

// ── arrayOf() ────────────────────────────────────────────────────────────────

describe('arrayOf', () => {
  it('sanitizes each item in an array — readable alternative to tuple convention', () => {
    const state = {
      userId: 'usr-1',
      customers: [
        { name: 'Alice', email: 'alice@example.com', creditCard: '1111222233334444' },
        { name: 'Bob',   email: 'bob@example.com',   creditCard: '5555666677778888' },
      ],
    };

    expect(sanitized(state, {
      customers: arrayOf({ email: 'omitted', creditCard: 'lastFour' }),
    })).toEqual({
      userId: 'usr-1',
      customers: [
        { name: 'Alice', creditCard: '4444' },
        { name: 'Bob',   creditCard: '8888' },
      ],
    });
  });

  it('is equivalent to the single-element tuple convention', () => {
    const state = { items: [{ secret: 'abc', id: '1' }] };
    const withArrayOf = sanitized(state, { items: arrayOf({ secret: 'omitted' }) });
    const withTuple   = sanitized(state, { items: [{ secret: 'omitted' }] });
    expect(withArrayOf).toEqual(withTuple);
  });
});

// ── Structural behaviour ──────────────────────────────────────────────────────

describe('nested objects', () => {
  it('recursively sanitizes nested objects', () => {
    const order = {
      orderId: 'ORD-001',
      customer: { name: 'Jane Smith', email: 'jane@example.com', ssn: '123-45-6789' },
      payment:  { method: 'credit', cardNumber: '9876543212345678', cvv: '123' },
    };

    expect(sanitized(order, {
      customer: { email: 'omitted', ssn: 'omitted' },
      payment:  { cardNumber: 'lastFour', cvv: 'omitted' },
    })).toEqual({
      orderId:  'ORD-001',
      customer: { name: 'Jane Smith' },
      payment:  { method: 'credit', cardNumber: '5678' },
    });
  });

  it('handles deeply nested objects', () => {
    expect(sanitized(
      { name: 'Acme', ceo: { name: 'Alice', compensation: { salary: '500000', bonus: '100000' } } },
      { ceo: { compensation: { salary: 'omitted', bonus: 'lastFour' } } },
    )).toEqual({
      name: 'Acme',
      ceo: { name: 'Alice', compensation: { bonus: '0000' } },
    });
  });

  it('can mix named rules and parameterized operators in the same config', () => {
    const result = sanitized(
      { id: 'usr-abc-123', email: 'jeff@example.com', notes: 'a very long internal note' },
      { id: keepFirst(7), email: 'emailAddress', notes: truncate(10) },
    );
    expect(result).toEqual({
      id:    'usr-abc',
      email: 'je***@example.com',
      notes: 'a very lon…',
    });
  });
});

// ── autoRedactConfig() ────────────────────────────────────────────────────────

describe('autoRedactConfig', () => {
  it('returns an empty config for a state with no sensitive field names', () => {
    expect(autoRedactConfig({ title: 'hello', count: 42, active: true })).toEqual({});
  });

  it('generates a rule for each recognised sensitive field name', () => {
    const config = autoRedactConfig({
      password:     'hunter2',
      apiKey:       'sk-abc',
      token:        'Bearer xyz',
      secret:       'topsecret',
      ssn:          '555-55-5555',
      creditCard:   '4111111111114567',
      debitCard:    '4111111111114567',
      phoneNumber:  '5551234567',
      email:        'user@example.com',
      emailAddress: 'user@example.com',
    });

    expect(config).toEqual({
      password:     'password',
      apiKey:       'apiKey',
      token:        'token',
      secret:       'secret',
      ssn:          'ssn',
      creditCard:   'creditCard',
      debitCard:    'debitCard',
      phoneNumber:  'phoneNumber',
      email:        'email',
      emailAddress: 'emailAddress',
    });
  });

  it('ignores fields not in the sensitive set', () => {
    const config = autoRedactConfig({ password: 'x', username: 'jeff', role: 'admin' });
    expect(Object.keys(config)).toEqual(['password']);
  });

  it('does not match on partial or differently-cased names', () => {
    const config = autoRedactConfig({ Password: 'x', API_KEY: 'y', authToken: 'z' });
    expect(config).toEqual({});
  });

  it('when merged with an explicit config, explicit rules take precedence', () => {
    const state = { password: 'hunter2', email: 'jeff@example.com', notes: 'public info' };
    const explicitConfig = { password: 'omitted' as const }; // override auto-redact

    const merged = { ...autoRedactConfig(state), ...explicitConfig };
    const result = sanitized(state, merged);

    expect('password' in result).toBe(false);           // explicit 'omitted' wins
    expect(result.email).toMatch(/^\w{2}\*{3}@/);       // auto-redact applied
    expect((result as any).notes).toBe('public info');  // untouched
  });
});
