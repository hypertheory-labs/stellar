export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  oldValue?: unknown;
  newValue?: unknown;
}

function flattenState(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenState(value as Record<string, unknown>, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

export function computeDiff(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): DiffEntry[] {
  const flatPrev = flattenState(prev);
  const flatCurr = flattenState(curr);
  const allKeys = new Set([...Object.keys(flatPrev), ...Object.keys(flatCurr)]);
  const entries: DiffEntry[] = [];

  for (const path of allKeys) {
    const inPrev = path in flatPrev;
    const inCurr = path in flatCurr;

    if (!inPrev) {
      entries.push({ path, kind: 'added', newValue: flatCurr[path] });
    } else if (!inCurr) {
      entries.push({ path, kind: 'removed', oldValue: flatPrev[path] });
    } else if (JSON.stringify(flatPrev[path]) !== JSON.stringify(flatCurr[path])) {
      entries.push({ path, kind: 'changed', oldValue: flatPrev[path], newValue: flatCurr[path] });
    }
  }

  return entries;
}

export function formatValue(value: unknown, maxLength = 60): string {
  const str = JSON.stringify(value);
  if (str === undefined) return 'undefined';
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}
