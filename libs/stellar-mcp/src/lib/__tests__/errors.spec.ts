import { describe, it, expect } from 'vitest';
import { isStellarMcpError, StellarMcpError } from '../errors';

describe('StellarMcpError', () => {
  it('preserves code, message, and hint', () => {
    const err = new StellarMcpError('APP_NOT_CONNECTED', 'no app', 'open the dev server');
    expect(err.code).toBe('APP_NOT_CONNECTED');
    expect(err.message).toBe('no app');
    expect(err.hint).toBe('open the dev server');
    expect(err.name).toBe('StellarMcpError');
  });

  it('is identifiable via the type guard', () => {
    const err = new StellarMcpError('INVALID_CONFIG', 'bad arg');
    expect(isStellarMcpError(err)).toBe(true);
  });

  it('rejects unrelated errors and non-Error values', () => {
    expect(isStellarMcpError(new Error('plain'))).toBe(false);
    expect(isStellarMcpError('string')).toBe(false);
    expect(isStellarMcpError(null)).toBe(false);
    expect(isStellarMcpError(undefined)).toBe(false);
  });

  it('is an instance of Error so existing handlers still catch it', () => {
    const err = new StellarMcpError('RPC_FAILED', 'boom');
    expect(err).toBeInstanceOf(Error);
  });
});
