import { RecordingSession } from './models';

// ── Layout constants ──────────────────────────────────────────────────────────
const LABEL_W    = 80;
const PAD_R      =  8;
const AXIS_H     = 22;
const TRIG_H     = 38;
const HTTP_ROW_H = 28;
const HTTP_BAR_H = 16;
const STORE_H    = 32;

// ── Public types ──────────────────────────────────────────────────────────────

export interface TLTrigger {
  id: string;
  x: number;
  laneTop: number;
  laneH: number;
  color: string;
  label: string;
  details: Array<[string, string]>;
}

export interface TLHttpBar {
  id: string;
  x: number;
  barW: number;
  barY: number;
  color: string;
  label: string;         // full label for tooltip
  displayLabel: string;  // truncated to fit inside bar
  details: Array<[string, string]>;
}

export interface TLSnapshot {
  id: string;
  cx: number;
  cy: number;
  color: string;
  details: Array<[string, string]>;
}

export interface TLEdge {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

export interface TLLane {
  label: string;
  y: number;
  height: number;
  alt: boolean;
}

export interface TLTick {
  x: number;
  label: string;
}

export interface TimelineLayout {
  svgWidth: number;
  svgHeight: number;
  lanes: TLLane[];
  ticks: TLTick[];
  triggers: TLTrigger[];
  httpBars: TLHttpBar[];
  snapshots: TLSnapshot[];
  edges: TLEdge[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function niceInterval(duration: number): number {
  const raw = duration / 6;
  for (const n of [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]) {
    if (n >= raw) return n;
  }
  return 10000;
}

// ── Main layout function ──────────────────────────────────────────────────────

export function buildTimelineLayout(
  session: RecordingSession,
  panelWidth: number,
): TimelineLayout {
  const duration = Math.max(session.duration, 1);
  const svgWidth = Math.max(200, panelWidth);
  const tlW = Math.max(50, svgWidth - LABEL_W - PAD_R);

  function xs(t: number): number {
    return LABEL_W + (t / duration) * tlW;
  }

  const nodeMap = new Map(session.nodes.map(n => [n.id, n]));

  // ── HTTP pairs via 'resolved' edges ─────────────────────────────────────────
  const httpPairs = session.edges
    .filter(e => e.label === 'resolved')
    .map(e => ({ req: nodeMap.get(e.from), resp: nodeMap.get(e.to), reqId: e.from, respId: e.to }))
    .filter((p): p is { req: NonNullable<typeof p.req>; resp: NonNullable<typeof p.resp>; reqId: string; respId: string } => !!(p.req && p.resp));

  // Greedy row assignment so overlapping bars don't stack
  const rowEnds: number[] = [];
  const pairRows = httpPairs.map(({ req, resp }) => {
    let row = 0;
    while (rowEnds[row] !== undefined && rowEnds[row] > req.t) row++;
    rowEnds[row] = resp.t;
    return row;
  });
  const numHttpRows = Math.max(1, rowEnds.length);

  // ── Store names (alphabetical, deduplicated) ─────────────────────────────────
  const storeNames = [...new Set(
    session.nodes
      .filter(n => n.type === 'state-snapshot' && n.store)
      .map(n => n.store!),
  )].sort();

  // ── Y offsets ────────────────────────────────────────────────────────────────
  const yTrig   = AXIS_H;
  const yHttp   = yTrig + TRIG_H;
  const yStores = yHttp + numHttpRows * HTTP_ROW_H;
  const svgHeight = yStores + Math.max(1, storeNames.length) * STORE_H + 8;

  // ── Lanes ────────────────────────────────────────────────────────────────────
  const lanes: TLLane[] = [
    { label: 'triggers', y: yTrig,  height: TRIG_H,                    alt: false },
    { label: 'http',     y: yHttp,  height: numHttpRows * HTTP_ROW_H,   alt: true  },
    ...storeNames.map((name, i) => ({
      label: name,
      y: yStores + i * STORE_H,
      height: STORE_H,
      alt: i % 2 === 0,
    })),
  ];

  // ── Time-axis ticks ──────────────────────────────────────────────────────────
  const interval = niceInterval(duration);
  const ticks: TLTick[] = [];
  for (let t = 0; t <= duration + interval * 0.5; t += interval) {
    if (t > duration + interval) break;
    const capped = Math.min(t, duration);
    ticks.push({
      x: xs(capped),
      label: capped >= 1000
        ? `${(capped / 1000).toFixed(capped % 1000 === 0 ? 0 : 1)}s`
        : `${capped}ms`,
    });
  }

  // ── Node positions for edge drawing ──────────────────────────────────────────
  const pos = new Map<string, { x: number; y: number }>();

  // ── Triggers ─────────────────────────────────────────────────────────────────
  const triggers: TLTrigger[] = [];
  for (const n of session.nodes) {
    if (n.type !== 'click' && n.type !== 'ngrx-event') continue;
    const x = xs(n.t);
    pos.set(n.id, { x, y: yTrig + TRIG_H / 2 });
    const fullLabel = n.label ?? n.type;
    triggers.push({
      id: n.id,
      x,
      laneTop: yTrig,
      laneH: TRIG_H,
      color: n.type === 'click' ? '#fab387' : '#89b4fa',
      label: fullLabel.length > 28 ? fullLabel.slice(0, 26) + '…' : fullLabel,
      details: [
        ['type', n.type],
        ['t',    `${n.t}ms`],
        ['label', fullLabel],
      ],
    });
  }

  // ── HTTP bars ────────────────────────────────────────────────────────────────
  const httpBars: TLHttpBar[] = [];
  for (let i = 0; i < httpPairs.length; i++) {
    const { req, resp, reqId, respId } = httpPairs[i];
    const row  = pairRows[i];
    const x    = xs(req.t);
    const xEnd = xs(resp.t);
    const barW = Math.max(6, xEnd - x);
    const barY = yHttp + row * HTTP_ROW_H + Math.round((HTTP_ROW_H - HTTP_BAR_H) / 2);
    const barCY = barY + HTTP_BAR_H / 2;

    pos.set(reqId,  { x,        y: barCY });
    pos.set(respId, { x: x + barW, y: barCY });

    const status = resp.status ?? 0;
    const color = status === 0 || status >= 500 ? '#f38ba8'
      : status >= 300 ? '#f9e2af'
      : '#a6e3a1';

    const method  = req.method ?? '';
    const rawPath = ((req.url ?? '').replace(/^https?:\/\/[^/]+/, '')) || (req.url ?? '');
    const fullLabel    = `${method} ${rawPath}`;
    // ~6px per char at font-size 10, leave 6px padding each side
    const maxChars     = Math.max(0, Math.floor((barW - 12) / 6));
    const displayLabel = maxChars > 4 ? fullLabel.slice(0, maxChars) : '';

    httpBars.push({
      id: `${reqId},${respId}`,
      x, barW, barY,
      color,
      label: fullLabel,
      displayLabel,
      details: [
        ['method',   method],
        ['url',      req.url ?? ''],
        ['status',   String(status || 'ERR')],
        ['duration', `${resp.duration ?? 0}ms`],
      ],
    });
  }

  // ── Snapshots ────────────────────────────────────────────────────────────────
  const snapshots: TLSnapshot[] = [];
  for (const n of session.nodes) {
    if (n.type !== 'state-snapshot' || !n.store) continue;
    const si = storeNames.indexOf(n.store);
    if (si < 0) continue;
    const cx = xs(n.t);
    const cy = yStores + si * STORE_H + STORE_H / 2;
    pos.set(n.id, { x: cx, y: cy });

    const details: Array<[string, string]> = [
      ['store', n.store],
      ['t',     `${n.t}ms`],
    ];
    if (n.delta) {
      for (const [k, [a, b]] of Object.entries(n.delta)) {
        details.push([k, `${JSON.stringify(a)} → ${JSON.stringify(b)}`]);
      }
    } else {
      details.push(['delta', '(none)']);
    }

    snapshots.push({ id: n.id, cx, cy, color: '#cba6f7', details });
  }

  // ── Edges ────────────────────────────────────────────────────────────────────
  const edges: TLEdge[] = [];
  for (const edge of session.edges) {
    if (edge.label === 'resolved') continue;
    const from = pos.get(edge.from);
    const to   = pos.get(edge.to);
    if (!from || !to) continue;
    const color = edge.label === 'initiated' ? '#89b4fa'
      : edge.label === 'produced'  ? '#a6e3a1'
      : '#fab387'; // caused
    edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, color });
  }

  return { svgWidth, svgHeight, lanes, ticks, triggers, httpBars, snapshots, edges };
}
