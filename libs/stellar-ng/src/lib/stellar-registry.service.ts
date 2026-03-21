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

  private lastClick: { label: string; time: number } | null = null;

  constructor() {
    this.core.subscribe(() => {
      this._stores.set(this.core.getAllStores());
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('stellar-overlay')) return;
      const label =
        target.getAttribute('data-stellar-label') ||
        target.getAttribute('aria-label') ||
        target.textContent?.trim().slice(0, 50) ||
        target.tagName.toLowerCase();
      this.lastClick = { label: label || 'unknown', time: performance.now() };
    }, { capture: true });
  }

  register(name: string, options: RegisterOptions = {}): void {
    this.core.register(name, options);
  }

  recordState(name: string, state: Record<string, unknown>): void {
    this.core.recordState(name, state, {
      route: this.router?.url ?? null,
      trigger: this.recentClickTrigger(),
    });
  }

  private recentClickTrigger(): string | undefined {
    if (!this.lastClick) return undefined;
    if (performance.now() - this.lastClick.time > 150) return undefined;
    return `click: "${this.lastClick.label}"`;
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
