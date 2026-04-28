import { describe, it, expect } from 'vitest';
import { DEFAULT_HOST, DEFAULT_PORT, helpText, parseConfig } from '../config';
import { StellarMcpError } from '../errors';

describe('parseConfig', () => {
  describe('defaults', () => {
    it('returns default port and host when nothing is provided', () => {
      const cfg = parseConfig([], {});
      expect(cfg.port).toBe(DEFAULT_PORT);
      expect(cfg.host).toBe(DEFAULT_HOST);
      expect(cfg.showHelp).toBe(false);
      expect(cfg.showVersion).toBe(false);
    });
  });

  describe('--port', () => {
    it('uses --port flag value', () => {
      const cfg = parseConfig(['--port', '5050'], {});
      expect(cfg.port).toBe(5050);
    });

    it('accepts --port=value form', () => {
      const cfg = parseConfig(['--port=5050'], {});
      expect(cfg.port).toBe(5050);
    });

    it('flag wins over env variable', () => {
      const cfg = parseConfig(['--port', '7777'], { STELLAR_MCP_PORT: '8888' });
      expect(cfg.port).toBe(7777);
    });

    it('falls back to env variable when no flag', () => {
      const cfg = parseConfig([], { STELLAR_MCP_PORT: '9999' });
      expect(cfg.port).toBe(9999);
    });

    it('rejects non-integer port', () => {
      expect(() => parseConfig(['--port=abc'], {})).toThrow(StellarMcpError);
    });

    it('rejects out-of-range port', () => {
      expect(() => parseConfig(['--port=0'], {})).toThrow(/between 1 and 65535/);
      expect(() => parseConfig(['--port=70000'], {})).toThrow(/between 1 and 65535/);
    });
  });

  describe('--host', () => {
    it('uses --host flag value', () => {
      const cfg = parseConfig(['--host', '0.0.0.0'], {});
      expect(cfg.host).toBe('0.0.0.0');
    });

    it('accepts --host=value form', () => {
      const cfg = parseConfig(['--host=192.168.1.1'], {});
      expect(cfg.host).toBe('192.168.1.1');
    });

    it('falls back to env variable', () => {
      const cfg = parseConfig([], { STELLAR_MCP_HOST: '127.0.0.99' });
      expect(cfg.host).toBe('127.0.0.99');
    });
  });

  describe('cross-cutting', () => {
    it('accepts --help and -h', () => {
      expect(parseConfig(['--help'], {}).showHelp).toBe(true);
      expect(parseConfig(['-h'], {}).showHelp).toBe(true);
    });

    it('accepts --version and -v', () => {
      expect(parseConfig(['--version'], {}).showVersion).toBe(true);
      expect(parseConfig(['-v'], {}).showVersion).toBe(true);
    });

    it('throws INVALID_CONFIG when --port is missing its value', () => {
      expect(() => parseConfig(['--port'], {})).toThrow(StellarMcpError);
      try {
        parseConfig(['--port'], {});
      } catch (err) {
        expect((err as StellarMcpError).code).toBe('INVALID_CONFIG');
      }
    });

    it('throws INVALID_CONFIG when --host is missing its value', () => {
      expect(() => parseConfig(['--host'], {})).toThrow(StellarMcpError);
    });

    it('throws on unknown arguments', () => {
      expect(() => parseConfig(['--mystery'], {})).toThrow(/Unknown argument/);
    });

    it('helpText mentions key options', () => {
      const help = helpText();
      expect(help).toContain('--port');
      expect(help).toContain('--host');
      expect(help).toContain('STELLAR_MCP_PORT');
      expect(help).toContain('withStellarBridge');
    });
  });
});
