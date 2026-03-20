// ── Helpers ──────────────────────────────────────────────────────────────────

function shortHash(v: string): string {
  let hash = 5381;
  for (let i = 0; i < v.length; i++) {
    hash = (((hash << 5) + hash) ^ v.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(0, 8);
}

function maskEmail(v: string): string {
  const at = v.indexOf('@');
  if (at <= 0) return '[redacted]';
  const visible = v.slice(0, Math.min(2, at));
  return `${visible}***${v.slice(at)}`;
}

// ── Primitive operators ───────────────────────────────────────────────────────
//
// These describe HOW to transform a value. Use these when you want to be
// explicit about the transformation. The key removed from output entirely when
// the handler is null.

const _omitted   = null;
const _redacted  = (_v: string) => '[redacted]';
const _lastFour  = (v: string)  => v.slice(-4);
const _firstFour = (v: string)  => v.slice(0, 4);
const _masked    = (v: string)  => '*'.repeat(Math.min(v.length, 8));
const _hashed    = (v: string)  => `[~${shortHash(v)}]`;
const _email     = (v: string)  => maskEmail(v);

// ── Handler map ───────────────────────────────────────────────────────────────
//
// Semantic aliases describe WHAT the field contains. They map to the
// appropriate primitive, so callers don't need to know the transformation
// convention for each data type.
//
// NOTE: `satisfies` is load-bearing here. Do NOT replace with a type
// annotation — it would widen the key type to `string` and break
// SanitizationRule inference. See docs/notes.md.

const sanitizationHandlers = {
  // Primitives — transformation vocabulary
  omitted:     _omitted,
  redacted:    _redacted,
  lastFour:    _lastFour,
  firstFour:   _firstFour,
  masked:      _masked,
  hashed:      _hashed,
  email:       _email,

  // Semantic aliases — data-type vocabulary
  creditCard:  _lastFour,   // show last 4 digits
  debitCard:   _lastFour,   // show last 4 digits
  phoneNumber: _lastFour,   // show last 4 digits
  ssn:         _redacted,   // fully hidden — last-4 is common UX but too risky for devtools
  password:    _masked,     // length-approximate masking
  apiKey:      _hashed,     // correlation token — same key → same hash across stores
  token:       _hashed,     // correlation token
  secret:      _redacted,   // fully hidden
  emailAddress: _email,     // j***@example.com
} satisfies Record<string, ((v: string) => string) | null>;

// ── Types ─────────────────────────────────────────────────────────────────────

type SanitizationRule = keyof typeof sanitizationHandlers;

export type SanitizationConfig<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U extends object ? [SanitizationConfig<U>] | SanitizationRule : SanitizationRule
    : T[K] extends object
      ? SanitizationConfig<T[K]> | SanitizationRule
      : SanitizationRule;
};

export type Sanitized<T, C extends SanitizationConfig<T>> = {
  [K in keyof T as C[K] extends 'omitted' ? never : K]:
    C[K] extends SanitizationRule
      ? string
      : C[K] extends [infer InnerC]
        ? T[K] extends Array<infer U>
          ? U extends object
            ? Array<Sanitized<U, InnerC & SanitizationConfig<U>>>
            : T[K]
          : T[K]
        : C[K] extends object
          ? T[K] extends object
            ? Sanitized<T[K], C[K] & SanitizationConfig<T[K]>>
            : T[K]
          : T[K];
};

// ── sanitized() ───────────────────────────────────────────────────────────────

export function sanitized<T, C extends SanitizationConfig<T>>(data: T, config: C): Sanitized<T, C> {
  const result: any = {};
  for (const key in data) {
    const rule = config[key];
    if (rule === undefined) {
      result[key] = data[key];
      continue;
    }
    if (typeof rule === 'object') {
      if (Array.isArray(rule)) {
        result[key] = (data[key] as any[]).map(item => sanitized(item, rule[0] as any));
      } else {
        result[key] = sanitized(data[key] as any, rule as any);
      }
      continue;
    }
    const handler = sanitizationHandlers[rule as SanitizationRule];
    if (handler === null) continue;
    result[key] = handler(String(data[key]));
  }
  return result;
}
