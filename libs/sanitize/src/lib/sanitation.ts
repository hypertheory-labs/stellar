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
// explicit about the transformation. The key is removed from output entirely
// when the handler is null.

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
  omitted:      _omitted,
  redacted:     _redacted,
  lastFour:     _lastFour,
  firstFour:    _firstFour,
  masked:       _masked,
  hashed:       _hashed,
  email:        _email,

  // Semantic aliases — data-type vocabulary
  creditCard:   _lastFour,   // show last 4 digits
  debitCard:    _lastFour,   // show last 4 digits
  phoneNumber:  _lastFour,   // show last 4 digits
  ssn:          _redacted,   // fully hidden — last-4 is common UX but too risky for devtools
  password:     _masked,     // length-approximate masking
  apiKey:       _hashed,     // correlation token — same key → same hash across stores
  token:        _hashed,     // correlation token
  secret:       _redacted,   // fully hidden
  emailAddress: _email,      // j***@example.com
} satisfies Record<string, ((v: string) => string) | null>;

// ── Types ─────────────────────────────────────────────────────────────────────

type SanitizationRule = keyof typeof sanitizationHandlers;

/** A custom handler function for use with parameterized operators. */
export type SanitizationHandler = (v: string) => string;

export type SanitizationConfig<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U extends object
      ? [SanitizationConfig<U>] | SanitizationRule | SanitizationHandler
      : SanitizationRule | SanitizationHandler
    : T[K] extends object
      ? SanitizationConfig<T[K]> | SanitizationRule | SanitizationHandler
      : SanitizationRule | SanitizationHandler;
};

export type Sanitized<T, C extends SanitizationConfig<T>> = {
  [K in keyof T as C[K] extends 'omitted' ? never : K]:
    C[K] extends SanitizationRule
      ? string
      : C[K] extends SanitizationHandler
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

// ── Parameterized operators ───────────────────────────────────────────────────
//
// These return a SanitizationHandler (a plain function) rather than a string
// rule. Used when the finite set of named operators doesn't cover your case.
// The factory pattern (createSanitizer) can promote these back to named aliases
// for your domain.

/** Keep the first `n` characters. */
export const keepFirst = (n: number): SanitizationHandler =>
  (v: string) => v.slice(0, n);

/** Keep the last `n` characters. */
export const keepLast = (n: number): SanitizationHandler =>
  (v: string) => v.slice(-n);

/** Truncate to `n` characters with a trailing ellipsis. */
export const truncate = (n: number): SanitizationHandler =>
  (v: string) => v.length > n ? `${v.slice(0, n)}…` : v;

/** Escape hatch — provide a fully custom transform. */
export const replace = (fn: (v: string) => string): SanitizationHandler => fn;

// ── arrayOf() ────────────────────────────────────────────────────────────────
//
// Structural combinator for array fields. Borrowed from Zod's vocabulary
// (z.array) for familiarity — we're using the same structural concept even
// though we're not building a schema library.
//
// Equivalent to the single-element tuple convention [config], but readable:
//   customers: arrayOf({ email: 'omitted' })   ← clear
//   customers: [{ email: 'omitted' }]           ← requires knowing the convention

export function arrayOf<T extends object>(
  config: SanitizationConfig<T>,
): [SanitizationConfig<T>] {
  return [config];
}

// ── sanitizeConfig() ─────────────────────────────────────────────────────────
//
// Identity helper that provides a typed anchor for SanitizationConfig at the
// call site. Zero runtime cost — returns its argument unchanged.
//
// Usage:
//   withStellarDevtools('BooksStore', {
//     sanitize: sanitizeConfig<BooksState>({ searchQuery: 'omitted' })
//   })
//
// Without this helper, the sanitize option would accept SanitizationConfig<any>
// and you'd lose autocomplete on field names and rename safety.

export function sanitizeConfig<T>(config: SanitizationConfig<T>): SanitizationConfig<T> {
  return config;
}

// ── autoRedactConfig() ───────────────────────────────────────────────────────
//
// Convention-based zero-config layer. Checks field names against the semantic
// alias blocklist and returns a SanitizationConfig for any that match.
//
// Designed to be merged with an explicit SanitizationConfig — explicit rules
// always take precedence:
//   const merged = { ...autoRedactConfig(state), ...explicitConfig };
//
// Limitations (by design for v1):
//   - Top-level field names only. Nested objects require explicit config.
//   - Exact name match only — 'Password', 'API_KEY', 'authToken' won't match.
//   - The set of sensitive field names is the semantic alias vocabulary.
//     Domain-specific names (e.g. 'policyNumber') require explicit config or
//     a custom sanitizer via createSanitizer() (future).

const SENSITIVE_FIELD_NAMES = new Set<SanitizationRule>([
  'creditCard', 'debitCard', 'phoneNumber', 'ssn',
  'password', 'apiKey', 'token', 'secret', 'emailAddress',
  // primitive operators that are also common field names:
  'email',
]);

export function autoRedactConfig(
  data: Record<string, unknown>,
): Record<string, SanitizationRule> {
  const config: Record<string, SanitizationRule> = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_FIELD_NAMES.has(key as SanitizationRule)) {
      config[key] = key as SanitizationRule;
    }
  }
  return config;
}

// ── sanitized() ───────────────────────────────────────────────────────────────

export function sanitized<T, C extends SanitizationConfig<T>>(data: T, config: C): Sanitized<T, C> {
  const result: any = {};
  for (const key in data) {
    const rule = config[key];
    if (rule === undefined) {
      result[key] = data[key];
      continue;
    }
    if (typeof rule === 'function') {
      result[key] = rule(String(data[key]));
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
