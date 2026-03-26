import { Component, computed, input, output, signal } from '@angular/core';
import { RecordingSession } from './models';
import {
  buildTimelineLayout,
  TimelineLayout,
  TLHttpBar,
  TLSnapshot,
  TLTrigger,
} from './timeline.utils';

const HTTP_BAR_H = 16;
const DOT_R = 5;

const EMPTY_LAYOUT: TimelineLayout = {
  svgWidth: 200,
  svgHeight: 100,
  lanes: [],
  ticks: [],
  triggers: [],
  httpBars: [],
  snapshots: [],
  edges: [],
};

@Component({
  selector: 'stellar-timeline',
  standalone: true,
  styles: [`
    :host { display: block; }
    .stellar-tl-svg { display: block; }
    .stellar-tl-node { cursor: pointer; }
    .stellar-tl-node:hover { opacity: 0.75; }
    .stellar-tl-detail {
      padding: 6px 10px;
      border-top: 1px solid #45475a;
      font-size: 11px;
      font-family: monospace;
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
      background: #181825;
      min-height: 28px;
    }
    .stellar-tl-detail-pair {
      display: flex;
      gap: 4px;
      align-items: baseline;
    }
    .stellar-tl-detail-key { color: #6c7086; }
    .stellar-tl-detail-val { color: #cdd6f4; word-break: break-all; max-width: 300px; }
    .stellar-tl-detail-empty { color: #45475a; font-style: italic; }
  `],
  template: `
    <div style="overflow-x: auto; overflow-y: auto; flex: 1;">
      <svg
        class="stellar-tl-svg"
        [attr.width]="layout().svgWidth"
        [attr.height]="layout().svgHeight"
        style="font-family: monospace; font-size: 11px;">

        <!-- Lane backgrounds + labels -->
        @for (lane of layout().lanes; track lane.label) {
          <rect
            x="0" [attr.y]="lane.y"
            [attr.width]="layout().svgWidth" [attr.height]="lane.height"
            [attr.fill]="lane.alt ? '#1e1e2e' : '#181825'" />
          <text
            x="4" [attr.y]="lane.y + lane.height / 2 + 4"
            fill="#45475a" font-size="10">{{ lane.label }}</text>
        }

        <!-- Time axis baseline -->
        <line [attr.x1]="80" y1="21" [attr.x2]="layout().svgWidth - 8" y2="21"
              stroke="#313244" stroke-width="1" />

        <!-- Ticks -->
        @for (tick of layout().ticks; track tick.x) {
          <line [attr.x1]="tick.x" [attr.x2]="tick.x" y1="14" y2="22"
                stroke="#45475a" stroke-width="1" />
          <text [attr.x]="tick.x" y="12" fill="#6c7086" font-size="10"
                text-anchor="middle">{{ tick.label }}</text>
          <!-- vertical guide line through all lanes -->
          <line [attr.x1]="tick.x" [attr.x2]="tick.x"
                [attr.y1]="layout().lanes[0]?.y ?? 22"
                [attr.y2]="layout().svgHeight - 8"
                stroke="#313244" stroke-width="1" />
        }

        <!-- Causal edges (drawn behind nodes) -->
        @for (edge of layout().edges; track $index) {
          <line
            [attr.x1]="edge.x1" [attr.y1]="edge.y1"
            [attr.x2]="edge.x2" [attr.y2]="edge.y2"
            [attr.stroke]="edge.color"
            stroke-width="1.5"
            stroke-dasharray="4,3"
            opacity="0.45" />
        }

        <!-- Triggers -->
        @for (trig of layout().triggers; track trig.id) {
          <g class="stellar-tl-node" (click)="selectTrigger(trig)">
            <title>{{ trig.label }}</title>
            <line
              [attr.x1]="trig.x" [attr.y1]="trig.laneTop + 3"
              [attr.x2]="trig.x" [attr.y2]="trig.laneTop + trig.laneH - 3"
              [attr.stroke]="trig.color" stroke-width="2" />
            <circle
              [attr.cx]="trig.x" [attr.cy]="trig.laneTop + trig.laneH - 7"
              r="4" [attr.fill]="trig.color" />
          </g>
        }

        <!-- HTTP bars -->
        @for (bar of layout().httpBars; track bar.id) {
          <g class="stellar-tl-node" (click)="selectBar(bar)">
            <title>{{ bar.label }}</title>
            <rect
              [attr.x]="bar.x" [attr.y]="bar.barY"
              [attr.width]="bar.barW" [attr.height]="HTTP_BAR_H"
              [attr.fill]="bar.color"
              rx="3" />
            @if (bar.displayLabel) {
              <text
                [attr.x]="bar.x + 5" [attr.y]="bar.barY + 11"
                fill="#1e1e2e" font-size="10"
                style="pointer-events: none;">{{ bar.displayLabel }}</text>
            }
          </g>
        }

        <!-- State-snapshot dots -->
        @for (snap of layout().snapshots; track snap.id) {
          <g class="stellar-tl-node" (click)="selectSnapshot(snap)">
            <title>{{ snap.details[0][1] }}</title>
            <circle
              [attr.cx]="snap.cx" [attr.cy]="snap.cy"
              [attr.r]="DOT_R"
              [attr.fill]="snap.color"
              stroke="#181825" stroke-width="1.5" />
          </g>
        }

      </svg>
    </div>

    <div class="stellar-tl-detail">
      @if (selected()) {
        @for (pair of selected()!; track pair[0]) {
          <div class="stellar-tl-detail-pair">
            <span class="stellar-tl-detail-key">{{ pair[0] }}:</span>
            <span class="stellar-tl-detail-val">{{ pair[1] }}</span>
          </div>
        }
      } @else {
        <span class="stellar-tl-detail-empty">click a node to inspect</span>
      }
    </div>
  `,
})
export class StellarTimelineComponent {
  readonly session = input<RecordingSession | null>(null);
  readonly width   = input(600);

  readonly nodeSelected = output<Array<[string, string]> | null>();
  readonly selected     = signal<Array<[string, string]> | null>(null);

  // Expose constants for template
  readonly HTTP_BAR_H = HTTP_BAR_H;
  readonly DOT_R = DOT_R;

  readonly layout = computed((): TimelineLayout => {
    const s = this.session();
    if (!s) return { ...EMPTY_LAYOUT, svgWidth: this.width() };
    return buildTimelineLayout(s, this.width());
  });

  selectTrigger(trig: TLTrigger): void {
    this.selected.set(trig.details);
    this.nodeSelected.emit(trig.details);
  }

  selectBar(bar: TLHttpBar): void {
    this.selected.set(bar.details);
    this.nodeSelected.emit(bar.details);
  }

  selectSnapshot(snap: TLSnapshot): void {
    this.selected.set(snap.details);
    this.nodeSelected.emit(snap.details);
  }
}
