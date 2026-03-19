import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StellarRegistryService } from './stellar-registry.service';
import { StateSnapshot } from './models';

type OverlayMode = 'closed' | 'picking' | 'viewing';

@Component({
  selector: 'stellar-overlay',
  standalone: true,
  imports: [DatePipe],
  styles: [`
    :host {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 99999;
      font-family: monospace;
      font-size: 13px;
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
    }

    /* ── Panel (left of the dial) ───────────────────────────── */
    .panel {
      width: 480px;
      max-height: 600px;
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      padding: 8px 12px;
      background: #181825;
      border-bottom: 1px solid #45475a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-title {
      flex: 1;
      font-weight: bold;
      color: #cba6f7;
    }

    .back-btn {
      background: none;
      border: none;
      color: #a6adc8;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .back-btn:hover {
      background: #313244;
      color: #cdd6f4;
    }

    .panel-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .history-list {
      width: 150px;
      border-right: 1px solid #45475a;
      overflow-y: auto;
      padding: 4px;
    }

    .history-item {
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      color: #a6adc8;
      font-size: 11px;
    }

    .history-item.active {
      background: #313244;
      color: #cdd6f4;
    }

    .state-view {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* ── Speed dial column (right, anchored to bottom) ───────── */
    .dial {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .store-chip {
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 20px;
      padding: 5px 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
    }

    .store-chip:hover {
      background: #313244;
    }

    .no-stores {
      color: #6c7086;
      font-size: 11px;
      padding: 4px 10px;
    }

    .fab {
      background: #cba6f7;
      color: #1e1e2e;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      cursor: pointer;
      font-family: monospace;
      font-size: 13px;
      font-weight: bold;
      user-select: none;
      white-space: nowrap;
    }

    .fab:hover {
      background: #d9b8ff;
    }
  `],
  template: `
    @if (mode() === 'viewing') {
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">{{ selectedStore() }}</span>
          <button class="back-btn" (click)="goToPicker()">← stores</button>
          <button class="back-btn" (click)="close()">✕</button>
        </div>
        <div class="panel-body">
          <div class="history-list">
            @for (snap of selectedHistory(); track snap.timestamp; let i = $index) {
              <div
                class="history-item"
                [class.active]="selectedIndex() === i"
                (click)="selectSnapshot(i)">
                #{{ i + 1 }} &nbsp;{{ snap.timestamp | date:'HH:mm:ss' }}
              </div>
            }
          </div>
          <div class="state-view">
            <pre>{{ selectedState() }}</pre>
          </div>
        </div>
      </div>
    }

    <div class="dial">
      @if (mode() === 'picking') {
        @if (stores().length === 0) {
          <span class="no-stores">No stores registered</span>
        }
        @for (store of stores(); track store.name) {
          <button class="store-chip" (click)="selectStore(store.name)">
            {{ store.name }}
          </button>
        }
      }
      <button class="fab" (click)="onFabClick()">✦ Stellar</button>
    </div>
  `,
})
export class StellarOverlayComponent {
  private registry = inject(StellarRegistryService);

  readonly stores = this.registry.stores;
  readonly mode = signal<OverlayMode>('closed');
  readonly selectedStore = signal<string | null>(null);
  readonly selectedIndex = signal<number>(-1);

  readonly selectedHistory = computed<StateSnapshot[]>(() => {
    const name = this.selectedStore();
    const store = this.stores().find(s => s.name === name);
    return store?.history ?? [];
  });

  readonly selectedState = computed(() => {
    const history = this.selectedHistory();
    const idx = this.selectedIndex();
    const snap = idx === -1 ? history[history.length - 1] : history[idx];
    return snap ? JSON.stringify(snap.state, null, 2) : '';
  });

  onFabClick(): void {
    if (this.mode() === 'closed' || this.mode() === 'viewing') {
      this.mode.set('picking');
    } else {
      this.mode.set('closed');
    }
  }

  selectStore(name: string): void {
    this.selectedStore.set(name);
    this.selectedIndex.set(-1);
    this.mode.set('viewing');
  }

  selectSnapshot(index: number): void {
    this.selectedIndex.set(index);
  }

  goToPicker(): void {
    this.mode.set('picking');
  }

  close(): void {
    this.mode.set('closed');
  }
}
