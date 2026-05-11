import type {
  HttpEvent,
  RecordingSession,
  StateSnapshot,
  StoreEntry,
  StoreInstance,
} from './models';

/**
 * Selector used by `snapshot`, `history`, and `diff` to choose between
 * concurrent instances of a store name (route mounts, component-providers
 * scopes, etc.). Omit to read the most recent active instance.
 */
export interface InstanceQuery {
  instance?: string;
}

/**
 * `describe()` payload — the manifest of every registered store, surfaced for
 * agents and tools that need to orient before snapshotting. Field shapes are
 * kept distinct from `StoreEntry` so the manifest is its own stable contract:
 * it can grow over time without dragging snapshot internals along.
 */
export interface InstanceManifest {
  id: string;
  registeredAt: number;
  destroyedAt: number | null;
  snapshotCount: number;
}

export interface StoreManifest {
  name: string;
  description: string | null;
  snapshotCount: number;
  registeredAt: number;
  destroyedAt: number | null;
  sourceHint: string | null;
  instances: InstanceManifest[];
}

export interface DescribeResult {
  version: string;
  stores: StoreManifest[];
  api: string[];
  recordingActive: boolean;
  caveat: string;
}

export interface DiffResult {
  from: StateSnapshot;
  to: StateSnapshot;
}

/**
 * AI-formatted output as a public surface — mounted on
 * `window.__stellarDevtools.formatForAI` so non-browser consumers (the MCP
 * server, evaluator harnesses) can call the same formatters that drive the
 * overlay's "Copy for AI" buttons. Single source of truth for the markdown
 * shape an agent sees.
 */
export interface FormatForAIApi {
  /** Markdown for one named store. Returns null when the store isn't registered. */
  store(name: string): string | null;
  /** Markdown for all stores plus HTTP traffic in one document. */
  all(): string;
  /** Markdown for HTTP traffic with cross-references back to the stores it produced. */
  http(): string;
  /** Markdown for a recording session — pass an explicit session, or omit to use the last one captured. */
  recording(session?: RecordingSession): string | null;
}

/**
 * The full public contract mounted on `window.__stellarDevtools` by
 * `provideStellar(...)`. Treat as a stable API: AI tools develop habits around
 * it, silent breaking changes produce wrong guidance.
 *
 * Adding fields is non-breaking. Renaming or removing requires a major
 * version bump and a migration note in `docs/`.
 */
export interface StellarDevtoolsApi {
  describe(): DescribeResult;

  /** Without name, returns every registered store. With name, returns one entry or instance (when `query.instance` is set). */
  snapshot(): StoreEntry[];
  snapshot(name: string): StoreEntry | null;
  snapshot(name: string, query: InstanceQuery): StoreEntry | StoreInstance | null;

  history(name: string, n?: number, query?: InstanceQuery): StateSnapshot[] | null;

  diff(name: string, query?: InstanceQuery): DiffResult | null;

  /** Persist all current store snapshots to disk via the snapshot writer (overlay only — does nothing in headless contexts). */
  save(): Promise<void>;

  http(): HttpEvent[];

  record: {
    start(name?: string): void;
    stop(): RecordingSession | null;
    /** Stops the recording and triggers a browser download. Returns the same session that `stop()` would. */
    stopAndDownload(): RecordingSession | null;
  };

  formatForAI: FormatForAIApi;
}

/**
 * Augment the global so consumers (and our own code) get full type safety
 * when reaching for `window.__stellarDevtools` from any browser-side script.
 *
 * Optional because the API is only present after `provideStellar(...)` runs.
 */
declare global {
  interface Window {
    __stellarDevtools?: StellarDevtoolsApi;
  }
}
