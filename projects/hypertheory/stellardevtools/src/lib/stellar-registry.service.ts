import { Injectable, signal, computed } from '@angular/core';
import { StoreEntry, StateSnapshot } from './models';

@Injectable({ providedIn: 'root' })
export class StellarRegistryService {
  private _stores = signal<Record<string, StoreEntry>>({});

  readonly stores = computed(() => Object.values(this._stores()));

  register(name: string): void {
    this._stores.update(s => ({
      ...s,
      [name]: { name, history: [] },
    }));
  }

  recordState(name: string, state: Record<string, unknown>): void {
    const snapshot: StateSnapshot = { timestamp: Date.now(), state };
    this._stores.update(s => {
      const entry = s[name];
      if (!entry) return s;
      return {
        ...s,
        [name]: { ...entry, history: [...entry.history, snapshot] },
      };
    });
  }

  unregister(name: string): void {
    this._stores.update(s => {
      const next = { ...s };
      delete next[name];
      return next;
    });
  }
}
