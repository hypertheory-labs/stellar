export type ShapeValue =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'array'
  | ShapeMap;

export type ShapeMap = { [key: string]: ShapeValue };

export interface RegisterOptions {
  /**
   * One sentence describing what this store manages and why it exists.
   *
   * This is the only piece of context about your store that cannot be derived
   * from code. State shape, history, and source location are all recoverable —
   * the *purpose* is not.
   *
   * AI coding assistants (and future developers) use this to orient quickly
   * when debugging or exploring your application. A good description collapses
   * minutes of investigation into seconds.
   *
   * @example
   * withStellarDevtools('TodosStore', {
   *   description: 'Manages the todo list — fetch, add, toggle. All mutations
   *     go through the todos API and are reflected optimistically.'
   * })
   *
   * If omitted, Stellar will warn in development mode and mark this store as
   * undocumented in the describe() output.
   */
  description?: string;
  sourceHint?: string;
  typeDefinition?: string;
}

export interface StateSnapshot {
  timestamp: number;
  state: Record<string, unknown>;
  route: string | null;
  inferredShape: ShapeMap;
  trigger?: string;
  httpEventId?: string;  // id of the HttpEvent whose response caused this snapshot
}

export interface StoreEntry {
  name: string;
  description?: string;
  sourceHint?: string;
  typeDefinition?: string;
  registeredAt: number;  // Date.now() at registration — exposes lazy-loading to AI consumers
  history: StateSnapshot[];
}

// ── Recording session ─────────────────────────────────────────────────────────

export type RecordingNodeType =
  | 'click'
  | 'ngrx-event'
  | 'http-request'
  | 'http-response'
  | 'state-snapshot';

export interface RecordingNode {
  id: string;
  type: RecordingNodeType;
  t: number;              // ms from recording start
  label?: string;         // click label or ngrx event type
  method?: string;        // http-request
  url?: string;           // http-request
  status?: number;        // http-response
  duration?: number;      // http-response
  error?: string;         // http-response (network failure)
  store?: string;         // state-snapshot
  snapshotIndex?: number; // state-snapshot
  delta?: Record<string, [unknown, unknown]>; // state-snapshot: { key: [before, after] }
}

export interface RecordingEdge {
  from: string;
  to: string;
  label: string;
}

export interface RecordingSession {
  name: string;
  recordedAt: string;   // ISO timestamp
  duration: number;     // ms
  /** Format explanation — tells an LLM how to interpret nodes and edges. */
  description: string;
  /** Purpose of each store that appears in this recording, keyed by store name. */
  storeContext: Record<string, string>;
  nodes: RecordingNode[];
  edges: RecordingEdge[];
}

export interface HttpEvent {
  id: string;
  timestamp: number;      // Date.now() at initiation
  method: string;
  url: string;
  status: number;         // 0 = network error
  ok: boolean;
  duration: number;       // ms from initiation to response
  responseBody?: unknown; // parsed JSON if content-type is application/json
  error?: string;         // set on network failure
  trigger?: string;       // captured from registry context at moment of call
}
