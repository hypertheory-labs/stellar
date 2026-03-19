import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StellarRegistryService } from './stellar-registry.service';
import { StateSnapshot } from './models';
import { computeDiff, DiffEntry, formatValue } from './diff.utils';

type OverlayMode = 'closed' | 'picking' | 'viewing';
type PanelView = 'state' | 'diff';

const MIN_WIDTH = 360;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 500;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 900;

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

    /* ── Panel ───────────────────────────────────────────────── */
    .panel {
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* Left-edge horizontal resize handle */
    .resize-h {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: ew-resize;
      z-index: 1;
    }

    .resize-h:hover, .resize-h.dragging {
      background: #cba6f7;
      opacity: 0.5;
    }

    /* Top-edge vertical resize handle */
    .resize-v {
      position: absolute;
      top: 0;
      left: 5px;
      right: 0;
      height: 5px;
      cursor: ns-resize;
      z-index: 1;
    }

    .resize-v:hover, .resize-v.dragging {
      background: #cba6f7;
      opacity: 0.5;
    }

    .panel-header {
      padding: 8px 12px;
      background: #181825;
      border-bottom: 1px solid #45475a;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .panel-title {
      flex: 1;
      font-weight: bold;
      color: #cba6f7;
    }

    .view-toggle {
      display: flex;
      border: 1px solid #45475a;
      border-radius: 4px;
      overflow: hidden;
    }

    .view-toggle button {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      padding: 2px 10px;
      font-family: monospace;
      font-size: 12px;
    }

    .view-toggle button.active {
      background: #313244;
      color: #cdd6f4;
    }

    .icon-btn {
      background: none;
      border: none;
      color: #a6adc8;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .icon-btn:hover {
      background: #313244;
      color: #cdd6f4;
    }

    .panel-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── History list ────────────────────────────────────────── */
    .history-list {
      width: 150px;
      border-right: 1px solid #45475a;
      overflow-y: auto;
      padding: 4px;
      flex-shrink: 0;
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

    .route-badge {
      display: block;
      font-size: 10px;
      color: #6c7086;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 1px 6px 3px;
    }

    /* ── State view ──────────────────────────────────────────── */
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

    /* ── Diff view ───────────────────────────────────────────── */
    .diff-view {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }

    .diff-empty {
      color: #6c7086;
      padding: 8px;
      font-size: 12px;
    }

    .diff-no-changes {
      color: #a6e3a1;
      padding: 8px;
      font-size: 12px;
    }

    .diff-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .diff-table td {
      padding: 3px 6px;
      vertical-align: top;
    }

    .diff-path {
      color: #89b4fa;
      white-space: nowrap;
      padding-right: 12px;
    }

    .diff-kind {
      white-space: nowrap;
      padding-right: 8px;
      font-size: 11px;
    }

    .diff-values {
      color: #cdd6f4;
      word-break: break-all;
    }

    .kind-changed { color: #f9e2af; }
    .kind-added   { color: #a6e3a1; }
    .kind-removed { color: #f38ba8; }

    .old-val { color: #f38ba8; }
    .new-val { color: #a6e3a1; }
    .arrow   { color: #6c7086; padding: 0 4px; }

    /* ── Speed dial ──────────────────────────────────────────── */
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

    .store-chip:hover { background: #313244; }

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

    .fab:hover { background: #d9b8ff; }
  `],
  template: `
    @if (mode() === 'viewing') {
      <div class="panel" [style.width.px]="panelWidth()" [style.height.px]="panelHeight()">

        <div class="resize-v" [class.dragging]="draggingV()" (mousedown)="startResizeV($event)"></div>
        <div class="resize-h" [class.dragging]="draggingH()" (mousedown)="startResizeH($event)"></div>

        <div class="panel-header">
          <span class="panel-title">{{ selectedStore() }}</span>

          <div class="view-toggle">
            <button [class.active]="panelView() === 'state'" (click)="panelView.set('state')">State</button>
            <button [class.active]="panelView() === 'diff'" (click)="panelView.set('diff')">Diff</button>
          </div>

          <button class="icon-btn" (click)="goToPicker()">← stores</button>
          <button class="icon-btn" (click)="close()">✕</button>
        </div>

        <div class="panel-body">
          <div class="history-list">
            @for (snap of selectedHistory(); track snap.timestamp; let i = $index) {
              @if (snap.route && snap.route !== selectedHistory()[i - 1]?.route) {
                <span class="route-badge" [title]="snap.route">{{ snap.route }}</span>
              }
              <div
                class="history-item"
                [class.active]="activeIndex() === i"
                (click)="selectSnapshot(i)">
                #{{ i + 1 }} &nbsp;{{ snap.timestamp | date:'HH:mm:ss' }}
              </div>
            }
          </div>

          @if (panelView() === 'state') {
            <div class="state-view">
              <pre>{{ selectedState() }}</pre>
            </div>
          } @else {
            <div class="diff-view">
              @if (diffEntries() === null) {
                <div class="diff-empty">Initial state — no previous snapshot to compare.</div>
              } @else if (diffEntries()!.length === 0) {
                <div class="diff-no-changes">✓ No changes from previous snapshot.</div>
              } @else {
                <table class="diff-table">
                  @for (entry of diffEntries()!; track entry.path) {
                    <tr>
                      <td class="diff-path">{{ entry.path }}</td>
                      <td class="diff-kind">
                        @if (entry.kind === 'changed') {
                          <span class="kind-changed">~</span>
                        } @else if (entry.kind === 'added') {
                          <span class="kind-added">+</span>
                        } @else {
                          <span class="kind-removed">−</span>
                        }
                      </td>
                      <td class="diff-values">
                        @if (entry.kind === 'changed') {
                          <span class="old-val">{{ fmt(entry.oldValue) }}</span>
                          <span class="arrow">→</span>
                          <span class="new-val">{{ fmt(entry.newValue) }}</span>
                        } @else if (entry.kind === 'added') {
                          <span class="new-val">{{ fmt(entry.newValue) }}</span>
                        } @else {
                          <span class="old-val">{{ fmt(entry.oldValue) }}</span>
                        }
                      </td>
                    </tr>
                  }
                </table>
              }
            </div>
          }
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
  readonly panelView = signal<PanelView>('state');
  readonly selectedStore = signal<string | null>(null);
  readonly selectedIndex = signal<number>(-1);
  readonly panelWidth = signal(DEFAULT_WIDTH);
  readonly panelHeight = signal(DEFAULT_HEIGHT);
  readonly draggingH = signal(false);
  readonly draggingV = signal(false);

  readonly activeIndex = computed(() => {
    const idx = this.selectedIndex();
    const len = this.selectedHistory().length;
    return idx === -1 ? len - 1 : idx;
  });

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

  readonly diffEntries = computed<DiffEntry[] | null>(() => {
    const history = this.selectedHistory();
    const idx = this.activeIndex();
    if (idx <= 0) return null;
    const prev = history[idx - 1].state;
    const curr = history[idx].state;
    return computeDiff(prev, curr);
  });

  readonly fmt = formatValue;

  startResizeH(event: MouseEvent): void {
    event.preventDefault();
    this.draggingH.set(true);
    const startX = event.clientX;
    const startWidth = this.panelWidth();

    const onMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      this.panelWidth.set(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
    };
    const onUp = () => {
      this.draggingH.set(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  startResizeV(event: MouseEvent): void {
    event.preventDefault();
    this.draggingV.set(true);
    const startY = event.clientY;
    const startHeight = this.panelHeight();

    const onMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      this.panelHeight.set(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta)));
    };
    const onUp = () => {
      this.draggingV.set(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

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
