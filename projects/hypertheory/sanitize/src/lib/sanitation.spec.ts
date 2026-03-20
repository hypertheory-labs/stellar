import { describe, it, expect } from 'vitest';
import { sanitized } from './sanitation';

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
    const result = sanitized({ card: '1234567812345678' }, { card: 'lastFour' });
    expect(result).toEqual({ card: '5678' });
  });
});

describe('firstFour', () => {
  it('keeps only the first four characters', () => {
    const result = sanitized({ zip: '90210-3456' }, { zip: 'firstFour' });
    expect(result).toEqual({ zip: '9021' });
  });
});

describe('masked', () => {
  it('replaces value with asterisks, length capped at 8', () => {
    expect(sanitized({ pw: 'abc' },          { pw: 'masked' })).toEqual({ pw: '***' });
    expect(sanitized({ pw: 'abcdefgh' },     { pw: 'masked' })).toEqual({ pw: '********' });
    expect(sanitized({ pw: 'averylongpw' },  { pw: 'masked' })).toEqual({ pw: '********' });
  });
});

describe('hashed', () => {
  it('replaces value with a deterministic correlation token', () => {
    const r1 = sanitized({ apiKey: 'secret-key' }, { apiKey: 'hashed' });
    const r2 = sanitized({ apiKey: 'secret-key' }, { apiKey: 'hashed' });
    const r3 = sanitized({ apiKey: 'different-key' }, { apiKey: 'hashed' });
    expect(r1.apiKey).toMatch(/^\[~[0-9a-f]{8}\]$/);
    expect(r1.apiKey).toBe(r2.apiKey);   // same value → same token
    expect(r1.apiKey).not.toBe(r3.apiKey); // different value → different token
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
  it('creditCard → lastFour', () => {
    const result = sanitized({ creditCard: '1234567812345678' }, { creditCard: 'creditCard' });
    expect(result).toEqual({ creditCard: '5678' });
  });

  it('debitCard → lastFour', () => {
    const result = sanitized({ debitCard: '1234567812345678' }, { debitCard: 'debitCard' });
    expect(result).toEqual({ debitCard: '5678' });
  });

  it('phoneNumber → lastFour', () => {
    const result = sanitized({ phone: '5551234567' }, { phone: 'phoneNumber' });
    expect(result).toEqual({ phone: '4567' });
  });

  it('ssn → redacted', () => {
    const result = sanitized({ ssn: '555-55-5555' }, { ssn: 'ssn' });
    expect(result).toEqual({ ssn: '[redacted]' });
  });

  it('password → masked', () => {
    const result = sanitized({ password: 'hunter2' }, { password: 'password' });
    expect(result).toEqual({ password: '*******' });
  });

  it('apiKey → hashed correlation token', () => {
    const result = sanitized({ apiKey: 'sk-abc123' }, { apiKey: 'apiKey' });
    expect(result.apiKey).toMatch(/^\[~[0-9a-f]{8}\]$/);
  });

  it('token → hashed correlation token', () => {
    const result = sanitized({ token: 'Bearer xyz' }, { token: 'token' });
    expect(result.token).toMatch(/^\[~[0-9a-f]{8}\]$/);
  });

  it('secret → redacted', () => {
    const result = sanitized({ secret: 'topsecret' }, { secret: 'secret' });
    expect(result).toEqual({ secret: '[redacted]' });
  });

  it('emailAddress → masked email', () => {
    const result = sanitized({ email: 'jane@example.com' }, { email: 'emailAddress' });
    expect(result).toEqual({ email: 'ja***@example.com' });
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

  it('omits an entire nested object with a top-level rule', () => {
    const result = sanitized(
      { username: 'jdoe', internalMetadata: { secret: 'x', token: 'y' } },
      { internalMetadata: 'omitted' },
    );
    expect(result).toEqual({ username: 'jdoe' });
  });

  it('handles deeply nested objects', () => {
    const company = {
      name: 'Acme Corp',
      ceo: { name: 'Alice', compensation: { salary: '500000', bonus: '100000' } },
    };

    expect(sanitized(company, {
      ceo: { compensation: { salary: 'omitted', bonus: 'lastFour' } },
    })).toEqual({
      name: 'Acme Corp',
      ceo: { name: 'Alice', compensation: { bonus: '0000' } },
    });
  });
});

describe('arrays', () => {
  it('sanitizes each item using a single-element tuple config', () => {
    const state = {
      userId: 'usr-1',
      customers: [
        { name: 'Alice', email: 'alice@example.com', creditCard: '1111222233334444' },
        { name: 'Bob',   email: 'bob@example.com',   creditCard: '5555666677778888' },
      ],
    };

    expect(sanitized(state, {
      customers: [{ email: 'omitted', creditCard: 'lastFour' }],
    })).toEqual({
      userId: 'usr-1',
      customers: [
        { name: 'Alice', creditCard: '4444' },
        { name: 'Bob',   creditCard: '8888' },
      ],
    });
  });
});
