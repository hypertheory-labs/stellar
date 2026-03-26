import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StellarRegistryService } from './stellar-registry.service';
import { SnapshotWriterService } from './snapshot-writer.service';
import { RecordingService } from './recording.service';
import { HttpEvent, StateSnapshot } from './models';
import { computeDiff, DiffEntry, formatValue } from './diff.utils';
import { formatStoreForAI, formatAllStoresForAI } from './format-for-ai';
import { StellarTimelineComponent } from './stellar-timeline.component';

type OverlayMode = 'closed' | 'picking' | 'viewing' | 'http' | 'timeline';
type PanelView = 'state' | 'diff';

const MIN_WIDTH = 360;
const MAX_WIDTH = 2400;
const DEFAULT_HEIGHT = 500;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 900;
const MIN_HISTORY_WIDTH = 80;
const MAX_HISTORY_WIDTH = 400;
const DEFAULT_HISTORY_WIDTH = 150;

// ── JSON syntax highlighter ───────────────────────────────────────────────────

function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const C = {
  key:  'color:#89b4fa',
  str:  'color:#a6e3a1',
  num:  'color:#fab387',
  bool: 'color:#cba6f7',
  null: 'color:#f38ba8',
  p:    'color:#6c7086',
} as const;

function s(style: string, content: string): string {
  return `<span style="${style}">${content}</span>`;
}

function highlightValue(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  const childPad = '  '.repeat(indent + 1);

  if (value === null)      return s(C.null, 'null');
  if (value === undefined) return s(C.null, 'undefined');
  if (typeof value === 'boolean') return s(C.bool, String(value));
  if (typeof value === 'number')  return s(C.num,  String(value));
  if (typeof value === 'string')  return s(C.str,  `"${htmlEscape(value)}"`);

  if (Array.isArray(value)) {
    if (value.length === 0) return s(C.p, '[]');
    const items = value.map(item => `${childPad}${highlightValue(item, indent + 1)}`);
    return `${s(C.p, '[')}\n${items.join(`${s(C.p, ',')}\n`)}\n${pad}${s(C.p, ']')}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return s(C.p, '{}');
    const lines = entries.map(([k, v]) =>
      `${childPad}${s(C.key, `"${htmlEscape(k)}"`)}: ${highlightValue(v, indent + 1)}`
    );
    return `${s(C.p, '{')}\n${lines.join(`${s(C.p, ',')}\n`)}\n${pad}${s(C.p, '}')}`;
  }

  return htmlEscape(String(value));
}

@Component({
  selector: 'stellar-overlay',
  standalone: true,
  imports: [DatePipe, StellarTimelineComponent],
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
    .stellar-panel {
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
    .stellar-resize-h {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: ew-resize;
      z-index: 1;
    }

    .stellar-resize-h:hover, .stellar-resize-h.stellar-dragging {
      background: #cba6f7;
      opacity: 0.5;
    }

    /* Top-edge vertical resize handle */
    .stellar-resize-v {
      position: absolute;
      top: 0;
      left: 5px;
      right: 0;
      height: 5px;
      cursor: ns-resize;
      z-index: 1;
    }

    .stellar-resize-v:hover, .stellar-resize-v.stellar-dragging {
      background: #cba6f7;
      opacity: 0.5;
    }

    .stellar-panel-header {
      padding: 8px 12px;
      background: #181825;
      border-bottom: 1px solid #45475a;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .stellar-panel-title {
      flex: 1;
      font-weight: bold;
      color: #cba6f7;
    }

    .stellar-view-toggle {
      display: flex;
      border: 1px solid #45475a;
      border-radius: 4px;
      overflow: hidden;
    }

    .stellar-view-toggle button {
      background: none;
      border: none;
      color: #6c7086;
      cursor: pointer;
      padding: 2px 10px;
      font-family: monospace;
      font-size: 12px;
    }

    .stellar-view-toggle button.stellar-active {
      background: #313244;
      color: #cdd6f4;
    }

    .stellar-icon-btn {
      background: none;
      border: none;
      color: #a6adc8;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .stellar-icon-btn:hover {
      background: #313244;
      color: #cdd6f4;
    }

    .stellar-panel-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── History list ────────────────────────────────────────── */
    .stellar-history-list {
      border-right: 1px solid #45475a;
      overflow-y: auto;
      padding: 4px;
      flex-shrink: 0;
    }

    .stellar-history-item {
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      color: #a6adc8;
      font-size: 11px;
    }

    .stellar-history-item.stellar-active {
      background: #313244;
      color: #cdd6f4;
    }

    .stellar-route-badge {
      display: block;
      font-size: 10px;
      color: #6c7086;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 1px 6px 3px;
    }

    .stellar-trigger-badge {
      display: block;
      font-size: 10px;
      color: #89b4fa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 0 6px 2px;
    }

    .stellar-http-badge {
      display: inline-block;
      font-size: 10px;
      color: #a6e3a1;
      padding: 0 6px 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Column divider ──────────────────────────────────────── */
    .stellar-col-divider {
      width: 4px;
      cursor: col-resize;
      flex-shrink: 0;
      background: transparent;
      transition: background 0.1s;
    }

    .stellar-col-divider:hover, .stellar-col-divider.stellar-dragging {
      background: #cba6f7;
      opacity: 0.5;
    }

    /* ── State view ──────────────────────────────────────────── */
    .stellar-state-view {
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
    .stellar-diff-view {
      flex: 1;
      overflow: auto;
      padding: 8px;
    }

    .stellar-diff-empty {
      color: #6c7086;
      padding: 8px;
      font-size: 12px;
    }

    .stellar-diff-no-changes {
      color: #a6e3a1;
      padding: 8px;
      font-size: 12px;
    }

    .stellar-diff-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .stellar-diff-table td {
      padding: 3px 6px;
      vertical-align: top;
    }

    .stellar-diff-path {
      color: #89b4fa;
      white-space: nowrap;
      padding-right: 12px;
    }

    .stellar-diff-kind {
      white-space: nowrap;
      padding-right: 8px;
      font-size: 11px;
    }

    .stellar-diff-values {
      color: #cdd6f4;
      word-break: break-all;
    }

    .stellar-kind-changed { color: #f9e2af; }
    .stellar-kind-added   { color: #a6e3a1; }
    .stellar-kind-removed { color: #f38ba8; }

    .stellar-old-val { color: #f38ba8; }
    .stellar-new-val { color: #a6e3a1; }
    .stellar-arrow   { color: #6c7086; padding: 0 4px; }

    /* ── Speed dial ──────────────────────────────────────────── */
    .stellar-dial {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .stellar-store-chip {
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 20px;
      padding: 5px 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
    }

    .stellar-store-chip:hover { background: #313244; }

    .stellar-no-stores {
      color: #6c7086;
      font-size: 11px;
      padding: 4px 10px;
    }

    .stellar-fab {
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

    .stellar-fab:hover { background: #d9b8ff; }

    .stellar-copy-btn {
      background: none;
      border: 1px solid #45475a;
      color: #a6adc8;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      white-space: nowrap;
    }

    .stellar-copy-btn:hover {
      background: #313244;
      color: #cdd6f4;
      border-color: #cba6f7;
    }

    .stellar-copy-btn.stellar-copied {
      color: #a6e3a1;
      border-color: #a6e3a1;
    }

    .stellar-copy-all-row {
      padding: 4px 4px 0;
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .stellar-copy-btn.stellar-saved {
      color: #89b4fa;
      border-color: #89b4fa;
    }

    .stellar-copy-btn.stellar-error {
      color: #f38ba8;
      border-color: #f38ba8;
    }

    /* ── HTTP panel ──────────────────────────────────────────── */
    .stellar-http-panel {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }

    .stellar-http-empty {
      color: #6c7086;
      padding: 12px 4px;
      font-size: 12px;
    }

    .stellar-http-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 5px 4px;
      border-bottom: 1px solid #313244;
      font-size: 12px;
      flex-wrap: wrap;
    }

    .stellar-http-method {
      font-weight: bold;
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      background: #313244;
      flex-shrink: 0;
    }

    .stellar-method-get    { color: #89b4fa; }
    .stellar-method-post   { color: #a6e3a1; }
    .stellar-method-put,
    .stellar-method-patch  { color: #f9e2af; }
    .stellar-method-delete { color: #f38ba8; }
    .stellar-method-other  { color: #cdd6f4; }

    .stellar-http-url {
      flex: 1;
      color: #cdd6f4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .stellar-http-status {
      font-weight: bold;
      font-size: 11px;
      flex-shrink: 0;
    }

    .stellar-status-ok   { color: #a6e3a1; }
    .stellar-status-warn { color: #f9e2af; }
    .stellar-status-err  { color: #f38ba8; }

    .stellar-http-duration {
      color: #6c7086;
      font-size: 11px;
      flex-shrink: 0;
    }

    .stellar-http-trigger {
      color: #89b4fa;
      font-size: 10px;
      width: 100%;
      padding-left: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stellar-http-error {
      color: #f38ba8;
      font-size: 10px;
      width: 100%;
      padding-left: 2px;
    }

    .stellar-http-chip {
      background: #1e1e2e;
      color: #89b4fa;
      border: 1px solid #45475a;
      border-radius: 20px;
      padding: 5px 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
      font-size: 12px;
    }

    .stellar-http-chip:hover { background: #313244; }

    .stellar-rec-btn {
      background: #f38ba8;
      color: #1e1e2e;
      border: none;
      border-radius: 20px;
      padding: 5px 14px;
      cursor: pointer;
      white-space: nowrap;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
    }

    .stellar-rec-btn:hover { background: #f5a0b5; }

    .stellar-stop-btn {
      background: #45475a;
      color: #cdd6f4;
      border: none;
      border-radius: 20px;
      padding: 5px 14px;
      cursor: pointer;
      white-space: nowrap;
      font-family: monospace;
      font-size: 12px;
    }

    .stellar-stop-btn:hover { background: #585b70; }

    /* ── Timeline panel ──────────────────────────────────────────── */
    .stellar-timeline-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .stellar-rec-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #f38ba8;
      font-size: 12px;
      white-space: nowrap;
    }

    .stellar-rec-dot {
      width: 8px;
      height: 8px;
      background: #f38ba8;
      border-radius: 50%;
      animation: stellar-pulse 1s ease-in-out infinite;
    }

    @keyframes stellar-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `],
  template: `
    @if (mode() === 'http') {
      <div class="stellar-panel" [style.width.px]="panelWidth()" [style.height.px]="panelHeight()">

        <div class="stellar-resize-v" [class.stellar-dragging]="draggingV()" (mousedown)="startResizeV($event)"></div>
        <div class="stellar-resize-h" [class.stellar-dragging]="draggingH()" (mousedown)="startResizeH($event)"></div>

        <div class="stellar-panel-header">
          <span class="stellar-panel-title">HTTP Traffic</span>
          <button class="stellar-icon-btn" (click)="goToPicker()">← stores</button>
          <button class="stellar-icon-btn" (click)="close()">✕</button>
        </div>

        <div class="stellar-http-panel">
          @if (httpEvents().length === 0) {
            <div class="stellar-http-empty">No requests recorded yet.</div>
          } @else {
            @for (ev of httpEventsReversed(); track ev.id) {
              <div class="stellar-http-row">
                <span class="stellar-http-method" [class]="methodClass(ev.method)">{{ ev.method }}</span>
                <span class="stellar-http-url" [title]="ev.url">{{ ev.url }}</span>
                <span class="stellar-http-status" [class]="statusClass(ev.status)">
                  {{ ev.status === 0 ? 'ERR' : ev.status }}
                </span>
                <span class="stellar-http-duration">{{ ev.duration }}ms</span>
                @if (ev.trigger) {
                  <span class="stellar-http-trigger">{{ ev.trigger }}</span>
                }
                @if (ev.error) {
                  <span class="stellar-http-error">⚠ {{ ev.error }}</span>
                }
              </div>
            }
          }
        </div>
      </div>
    }

    @if (mode() === 'timeline') {
      <div class="stellar-panel" [style.width.px]="panelWidth()" [style.height.px]="panelHeight()">

        <div class="stellar-resize-v" [class.stellar-dragging]="draggingV()" (mousedown)="startResizeV($event)"></div>
        <div class="stellar-resize-h" [class.stellar-dragging]="draggingH()" (mousedown)="startResizeH($event)"></div>

        <div class="stellar-panel-header">
          <span class="stellar-panel-title">⏺ {{ lastRecording()?.name ?? 'recording' }}</span>
          <button class="stellar-copy-btn" (click)="exportRecording()">↓ Export</button>
          <button class="stellar-icon-btn" (click)="goToPicker()">← stores</button>
          <button class="stellar-icon-btn" (click)="close()">✕</button>
        </div>

        <div class="stellar-timeline-body">
          @if (lastRecording(); as session) {
            <stellar-timeline [session]="session" [width]="panelWidth()" />
          }
        </div>
      </div>
    }

    @if (mode() === 'viewing') {
      <div class="stellar-panel" [style.width.px]="panelWidth()" [style.height.px]="panelHeight()">

        <div class="stellar-resize-v" [class.stellar-dragging]="draggingV()" (mousedown)="startResizeV($event)"></div>
        <div class="stellar-resize-h" [class.stellar-dragging]="draggingH()" (mousedown)="startResizeH($event)"></div>

        <div class="stellar-panel-header">
          <span class="stellar-panel-title">{{ selectedStore() }}</span>

          <div class="stellar-view-toggle">
            <button [class.stellar-active]="panelView() === 'state'" (click)="panelView.set('state')">State</button>
            <button [class.stellar-active]="panelView() === 'diff'" (click)="panelView.set('diff')">Diff</button>
          </div>

          <button
            class="stellar-copy-btn"
            [class.stellar-copied]="copiedStore() === selectedStore()"
            (click)="copyForAI(selectedStore()!)">
            {{ copiedStore() === selectedStore() ? '✓ Copied' : 'Copy for AI' }}
          </button>
          <button class="stellar-icon-btn" (click)="goToPicker()">← stores</button>
          <button class="stellar-icon-btn" (click)="close()">✕</button>
        </div>

        <div class="stellar-panel-body">
          <div class="stellar-history-list" [style.width.px]="historyWidth()">
            @for (snap of selectedHistory(); track snap.timestamp; let i = $index) {
              @if (snap.route && snap.route !== selectedHistory()[i - 1]?.route) {
                <span class="stellar-route-badge" [title]="snap.route">{{ snap.route }}</span>
              }
              <div
                class="stellar-history-item"
                [class.stellar-active]="activeIndex() === i"
                (click)="selectSnapshot(i)">
                #{{ i + 1 }} &nbsp;{{ snap.timestamp | date:'HH:mm:ss' }}
                @if (snap.httpEventId) {
                  <span class="stellar-http-badge">{{ httpLabel(snap.httpEventId) }}</span>
                } @else if (snap.trigger) {
                  <span class="stellar-trigger-badge">{{ snap.trigger }}</span>
                }
              </div>
            }
          </div>

          <div
            class="stellar-col-divider"
            [class.stellar-dragging]="draggingCol()"
            (mousedown)="startResizeCol($event)">
          </div>

          @if (panelView() === 'state') {
            <div class="stellar-state-view">
              <pre [innerHTML]="selectedStateHtml()"></pre>
            </div>
          } @else {
            <div class="stellar-diff-view">
              @if (diffEntries() === null) {
                <div class="stellar-diff-empty">Initial state — no previous snapshot to compare.</div>
              } @else if (diffEntries()!.length === 0) {
                <div class="stellar-diff-no-changes">✓ No changes from previous snapshot.</div>
              } @else {
                <table class="stellar-diff-table">
                  @for (entry of diffEntries()!; track entry.path) {
                    <tr>
                      <td class="stellar-diff-path">{{ entry.path }}</td>
                      <td class="stellar-diff-kind">
                        @if (entry.kind === 'changed') {
                          <span class="stellar-kind-changed">~</span>
                        } @else if (entry.kind === 'added') {
                          <span class="stellar-kind-added">+</span>
                        } @else {
                          <span class="stellar-kind-removed">−</span>
                        }
                      </td>
                      <td class="stellar-diff-values">
                        @if (entry.kind === 'changed') {
                          <span class="stellar-old-val">{{ fmt(entry.oldValue) }}</span>
                          <span class="stellar-arrow">→</span>
                          <span class="stellar-new-val">{{ fmt(entry.newValue) }}</span>
                        } @else if (entry.kind === 'added') {
                          <span class="stellar-new-val">{{ fmt(entry.newValue) }}</span>
                        } @else {
                          <span class="stellar-old-val">{{ fmt(entry.oldValue) }}</span>
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

    <div class="stellar-dial">
      @if (mode() === 'picking') {
        @if (stores().length === 0) {
          <span class="stellar-no-stores">No stores registered</span>
        }
        @for (store of stores(); track store.name) {
          <button class="stellar-store-chip" (click)="selectStore(store.name)">
            {{ store.name }}
          </button>
        }
        @if (httpEvents().length > 0) {
          <button class="stellar-http-chip" (click)="goToHttp()">
            HTTP ({{ httpEvents().length }})
          </button>
        }
        @if (stores().length > 0) {
          <div class="stellar-copy-all-row">
            <button
              class="stellar-copy-btn"
              [class.stellar-copied]="copiedStore() === '__all__'"
              (click)="copyAllForAI()">
              {{ copiedStore() === '__all__' ? '✓ Copied' : 'Copy all for AI' }}
            </button>
            <button
              class="stellar-copy-btn"
              [class.stellar-saved]="savedState() === 'saved'"
              [class.stellar-error]="savedState() === 'error'"
              (click)="saveAllForAI()">
              {{ savedState() === 'saved' ? '✓ Saved' : savedState() === 'error' ? '✕ Failed' : 'Save for AI' }}
            </button>
          </div>
        }
        @if (!isRecording()) {
          <button class="stellar-rec-btn" (click)="startRecording()">⏺ Rec</button>
        } @else {
          <div class="stellar-rec-indicator">
            <div class="stellar-rec-dot"></div>
            Recording…
          </div>
          <button class="stellar-stop-btn" (click)="stopRecording()">⏹ Stop &amp; Export</button>
        }
      }
      @if (isRecording() && mode() !== 'picking') {
        <div class="stellar-rec-indicator">
          <div class="stellar-rec-dot"></div>
        </div>
      }
      <button class="stellar-fab" (click)="onFabClick()">✦ Stellar</button>
    </div>
  `,
})
export class StellarOverlayComponent {
  private registry = inject(StellarRegistryService);
  private sanitizer = inject(DomSanitizer);
  private writer = inject(SnapshotWriterService);
  private recorder = inject(RecordingService);

  readonly isRecording   = this.recorder.isRecording;
  readonly lastRecording = this.recorder.lastSession;

  readonly stores = this.registry.stores;
  readonly httpEvents = this.registry.httpEvents;
  readonly httpEventsReversed = computed<HttpEvent[]>(() => [...this.httpEvents()].reverse());
  readonly mode = signal<OverlayMode>('closed');
  readonly panelView = signal<PanelView>('state');
  readonly selectedStore = signal<string | null>(null);
  readonly selectedIndex = signal<number>(-1);
  readonly panelWidth = signal(Math.round(window.innerWidth * 0.8));
  readonly panelHeight = signal(DEFAULT_HEIGHT);
  readonly historyWidth = signal(DEFAULT_HISTORY_WIDTH);
  readonly draggingH = signal(false);
  readonly draggingV = signal(false);
  readonly draggingCol = signal(false);
  readonly copiedStore = signal<string | null>(null);
  readonly savedState = signal<'idle' | 'saved' | 'error'>('idle');

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

  readonly selectedSnapshot = computed<StateSnapshot | null>(() => {
    const history = this.selectedHistory();
    const idx = this.selectedIndex();
    return idx === -1 ? (history[history.length - 1] ?? null) : (history[idx] ?? null);
  });

  readonly selectedStateHtml = computed<SafeHtml>(() => {
    const snap = this.selectedSnapshot();
    if (!snap) return '';
    return this.sanitizer.bypassSecurityTrustHtml(highlightValue(snap.state, 0));
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

  startResizeCol(event: MouseEvent): void {
    event.preventDefault();
    this.draggingCol.set(true);
    const startX = event.clientX;
    const startWidth = this.historyWidth();

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      this.historyWidth.set(Math.min(MAX_HISTORY_WIDTH, Math.max(MIN_HISTORY_WIDTH, startWidth + delta)));
    };
    const onUp = () => {
      this.draggingCol.set(false);
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

  goToHttp(): void {
    this.mode.set('http');
  }

  methodClass(method: string): string {
    const m = method.toUpperCase();
    if (m === 'GET')    return 'stellar-method-get';
    if (m === 'POST')   return 'stellar-method-post';
    if (m === 'PUT' || m === 'PATCH') return 'stellar-method-put';
    if (m === 'DELETE') return 'stellar-method-delete';
    return 'stellar-method-other';
  }

  httpLabel(httpEventId: string): string {
    const ev = this.httpEvents().find(e => e.id === httpEventId);
    if (!ev) return '← http';
    const path = ev.url.replace(/^https?:\/\/[^/]+/, '') || ev.url;
    const truncated = path.length > 40 ? path.slice(0, 37) + '…' : path;
    return `← ${ev.method} ${truncated} (${ev.status})`;
  }

  statusClass(status: number): string {
    if (status === 0)         return 'stellar-status-err';
    if (status < 300)         return 'stellar-status-ok';
    if (status < 500)         return 'stellar-status-warn';
    return 'stellar-status-err';
  }

  copyForAI(name: string): void {
    const entry = this.registry.getStore(name);
    if (!entry) return;
    const text = formatStoreForAI(entry);
    this.writeToClipboard(text, name);
  }

  copyAllForAI(): void {
    const text = formatAllStoresForAI(this.stores(), this.httpEvents());
    this.writeToClipboard(text, '__all__');
  }

  saveAllForAI(): void {
    this.writer.save(this.stores()).then(() => {
      this.savedState.set('saved');
      setTimeout(() => this.savedState.set('idle'), 2500);
    }).catch(() => {
      this.savedState.set('error');
      setTimeout(() => this.savedState.set('idle'), 2500);
    });
  }

  private writeToClipboard(text: string, key: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedStore.set(key);
      setTimeout(() => this.copiedStore.set(null), 2000);
    });
  }

  startRecording(): void {
    this.recorder.start();
  }

  stopRecording(): void {
    const session = this.recorder.stop();
    if (session) {
      this.mode.set('timeline');
    }
  }

  exportRecording(): void {
    const session = this.recorder.lastSession();
    if (session) this.recorder.download(session);
  }

  close(): void {
    this.mode.set('closed');
  }
}
