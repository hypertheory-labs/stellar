import { StoreEntry, StateSnapshot, ShapeMap, ShapeValue } from './models';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function formatValueWithShape(value: unknown, shape: ShapeValue, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  const childIndent = '  '.repeat(indentLevel + 1);

  if (typeof shape === 'object' && shape !== null && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const shapeMap = shape as ShapeMap;
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const childShape = shapeMap[k] ?? typeof v as ShapeValue;
      const formattedVal = formatValueWithShape(v, childShape, indentLevel + 1);
      return `${childIndent}"${k}": ${formattedVal}  // ${describeShape(childShape)}`;
    });
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }

  return JSON.stringify(value);
}

function describeShape(shape: ShapeValue): string {
  if (typeof shape === 'object' && shape !== null) return 'object';
  return shape as string;
}

function formatStateBlock(snapshot: StateSnapshot): string {
  const state = snapshot.state;
  const shape = snapshot.inferredShape;
  const entries = Object.entries(state);
  if (entries.length === 0) return '{}';

  const indent = '  ';
  const lines = entries.map(([k, v]) => {
    const childShape = shape[k] ?? typeof v;
    const formattedVal = formatValueWithShape(v, childShape, 1);
    return `${indent}"${k}": ${formattedVal}  // ${describeShape(childShape)}`;
  });
  return `{\n${lines.join(',\n')}\n}`;
}

function formatDiffSummary(prev: StateSnapshot, curr: StateSnapshot): string {
  const changes: string[] = [];
  for (const key of Object.keys(curr.state)) {
    const prevVal = prev.state[key];
    const currVal = curr.state[key];
    if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
      changes.push(`  ${key}: ${JSON.stringify(prevVal)} → ${JSON.stringify(currVal)}`);
    }
  }
  for (const key of Object.keys(prev.state)) {
    if (!(key in curr.state)) {
      changes.push(`  ${key}: ${JSON.stringify(prev.state[key])} → (removed)`);
    }
  }
  return changes.length > 0 ? changes.join('\n') : '  (no changes)';
}

export function formatStoreForAI(entry: StoreEntry): string {
  const history = entry.history;
  if (history.length === 0) return `## Stellar Devtools Snapshot — ${entry.name}\n\n*(no state recorded)*\n`;

  const latest = history[history.length - 1];
  const lines: string[] = [];

  lines.push(`## Stellar Devtools Snapshot — ${entry.name}`);
  lines.push('');
  lines.push(`**Captured**: ${formatDate(latest.timestamp)}`);
  if (latest.route) lines.push(`**Route**: ${latest.route}`);
  if (latest.trigger) lines.push(`**Trigger**: ${latest.trigger}`);
  if (entry.sourceHint) lines.push(`**Source**: ${entry.sourceHint}`);

  lines.push('');
  lines.push('### Current State');
  lines.push('```json');
  lines.push(formatStateBlock(latest));
  lines.push('```');

  if (entry.typeDefinition) {
    lines.push('');
    lines.push('### Type Definition');
    lines.push('```ts');
    lines.push(entry.typeDefinition);
    lines.push('```');
  }

  const recentHistory = history.slice(-4); // up to last 4 to show last 3 diffs
  if (recentHistory.length > 1) {
    lines.push('');
    lines.push(`### Recent History (last ${recentHistory.length - 1} transitions)`);
    for (let i = recentHistory.length - 1; i >= 1; i--) {
      const snap = recentHistory[i];
      const prev = recentHistory[i - 1];
      const label = `#${history.length - (recentHistory.length - 1 - i)}`;
      const time = new Date(snap.timestamp).toISOString().replace(/.*T/, '').replace(/\.\d{3}Z$/, ' UTC');
      const triggerNote = snap.trigger ? ` — ${snap.trigger}` : '';
      lines.push(`\n**${label}** ${time}${triggerNote}`);
      lines.push(formatDiffSummary(prev, snap));
    }
  }

  return lines.join('\n');
}

export function formatAllStoresForAI(entries: StoreEntry[]): string {
  if (entries.length === 0) return '*(no stores registered)*\n';
  return entries.map(e => formatStoreForAI(e)).join('\n\n---\n\n');
}
