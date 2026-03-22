import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { RegisterOptions, StoreEntry } from './models';
import { StellarRegistry } from './stellar-registry';
import { Events } from '@ngrx/signals/events';

function summarizePayload(payload: unknown): string {
  if (payload === undefined || payload === null || payload === void 0) return '';
  if (typeof payload === 'string') {
    const trimmed = payload.length > 40 ? payload.slice(0, 40) + '…' : payload;
    return ` — "${trimmed}"`;
  }
  if (typeof payload === 'number' || typeof payload === 'boolean') return ` — ${payload}`;
  if (Array.isArray(payload)) return ` — [${payload.length} items]`;
  if (typeof payload === 'object') {
    const keys = Object.keys(payload as object);
    const preview = keys.slice(0, 3).join(', ');
    return ` — {${preview}${keys.length > 3 ? ', …' : ''}}`;
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class StellarRegistryService {
  private router = inject(Router, { optional: true });
  private ngrxEvents = inject(Events, { optional: true });
  private core = new StellarRegistry();

  private _stores = signal<StoreEntry[]>([]);
  readonly stores = this._stores.asReadonly();

  private lastClick: { label: string; time: number } | null = null;
  private lastEvent: { type: string; payload: unknown; time: number } | null = null;

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

    this.ngrxEvents?.on()
      .pipe(takeUntilDestroyed())
      .subscribe(({ type, payload }) => {
        this.lastEvent = { type, payload, time: performance.now() };
      });
  }

  register(name: string, options: RegisterOptions = {}): void {
    this.core.register(name, options);
  }

  recordState(name: string, state: Record<string, unknown>): void {
    this.core.recordState(name, state, {
      route: this.router?.url ?? null,
      trigger: this.recentTrigger(),
    });
  }

  private recentTrigger(): string | undefined {
    const now = performance.now();

    if (this.lastEvent && now - this.lastEvent.time < 100) {
      return `${this.lastEvent.type}${summarizePayload(this.lastEvent.payload)}`;
    }

    if (this.lastClick && now - this.lastClick.time < 150) {
      return `click: "${this.lastClick.label}"`;
    }

    return undefined;
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
