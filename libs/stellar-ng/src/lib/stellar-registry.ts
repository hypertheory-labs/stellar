import { RegisterOptions, ShapeMap, ShapeValue, StateSnapshot, StoreEntry } from './models';

function inferShape(value: unknown): ShapeValue {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, inferShape(v)]),
    ) as ShapeMap;
  }
  return typeof value as 'string' | 'number' | 'boolean';
}

export class StellarRegistry {
  private stores = new Map<string, StoreEntry>();
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  register(name: string, options: RegisterOptions = {}): void {
    this.stores.set(name, {
      name,
      sourceHint: options.sourceHint,
      typeDefinition: options.typeDefinition,
      history: [],
    });
    this.notify();
  }

  recordState(
    name: string,
    state: Record<string, unknown>,
    context: { route?: string | null; trigger?: string } = {},
  ): void {
    const entry = this.stores.get(name);
    if (!entry) return;

    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      state,
      route: context.route ?? null,
      inferredShape: inferShape(state) as ShapeMap,
      trigger: context.trigger,
    };

    entry.history = [...entry.history, snapshot];
    this.notify();
  }

  unregister(name: string): void {
    this.stores.delete(name);
    this.notify();
  }

  getStore(name: string): StoreEntry | undefined {
    return this.stores.get(name);
  }

  getAllStores(): StoreEntry[] {
    return Array.from(this.stores.values());
  }
}
