import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RegisterOptions, StoreEntry } from './models';
import { StellarRegistry } from './stellar-registry';

@Injectable({ providedIn: 'root' })
export class StellarRegistryService {
  private router = inject(Router, { optional: true });
  private core = new StellarRegistry();

  private _stores = signal<StoreEntry[]>([]);
  readonly stores = this._stores.asReadonly();

  constructor() {
    this.core.subscribe(() => {
      this._stores.set(this.core.getAllStores());
    });
  }

  register(name: string, options: RegisterOptions = {}): void {
    this.core.register(name, options);
  }

  recordState(name: string, state: Record<string, unknown>): void {
    this.core.recordState(name, state, { route: this.router?.url ?? null });
  }

  unregister(name: string): void {
    this.core.unregister(name);
  }

  getStore(name: string): StoreEntry | undefined {
    return this.core.getStore(name);
  }

  getAllStores(): StoreEntry[] {
    return this.core.getAllStores();
  }
}
