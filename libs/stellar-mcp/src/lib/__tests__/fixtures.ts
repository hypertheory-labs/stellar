import type {
  DescribeResult,
  DiffResult,
  FormatForAIClient,
  HttpEvent,
  InstanceQuery,
  RecordControl,
  RecordingSession,
  StateSnapshot,
  StellarClient,
  StoreEntry,
  StoreInstance,
} from '../types';

export const sampleSnapshots: StateSnapshot[] = [
  {
    timestamp: 1_700_000_000_000,
    state: { count: 0 },
    route: '/',
    inferredShape: { count: 'number' },
    trigger: 'init',
  },
  {
    timestamp: 1_700_000_001_000,
    state: { count: 1 },
    route: '/',
    inferredShape: { count: 'number' },
    trigger: 'CounterStore.increment()',
  },
  {
    timestamp: 1_700_000_002_500,
    state: { count: 2 },
    route: '/',
    inferredShape: { count: 'number' },
    trigger: 'CounterStore.increment()',
  },
];

export const sampleStoreEntry: StoreEntry = {
  name: 'CounterStore',
  description: 'Tracks the counter value displayed on the home page.',
  sourceHint: 'apps/demo-ng/src/app/counter.store.ts',
  registeredAt: 1_700_000_000_000,
  history: sampleSnapshots,
  instances: [
    {
      id: 'counter-1',
      name: 'CounterStore',
      registeredAt: 1_700_000_000_000,
      history: sampleSnapshots,
    },
  ],
};

export const sampleHttpEvents: HttpEvent[] = [
  {
    id: 'http-1',
    timestamp: 1_700_000_000_500,
    method: 'GET',
    url: '/api/books',
    status: 200,
    ok: true,
    duration: 42,
    responseBody: [{ id: 1, title: 'Domain-Driven Design' }],
    trigger: 'BooksStore.load()',
  },
  {
    id: 'http-2',
    timestamp: 1_700_000_001_500,
    method: 'POST',
    url: '/api/books',
    status: 500,
    ok: false,
    duration: 17,
    error: 'Internal Server Error',
    trigger: 'BooksStore.add()',
  },
];

export const sampleRecording: RecordingSession = {
  name: 'add-book-flow',
  recordedAt: '2024-01-01T12:00:00.000Z',
  duration: 1500,
  description:
    'Directed graph of clicks → ngrx events → http requests → state snapshots.',
  storeContext: {
    BooksStore: 'Tracks the list of books displayed on the library page.',
  },
  nodes: [
    { id: 'n1', type: 'click', t: 0, label: 'Add Book button' },
    { id: 'n2', type: 'http-request', t: 100, method: 'POST', url: '/api/books' },
    { id: 'n3', type: 'http-response', t: 250, status: 200, duration: 150 },
  ],
  edges: [
    { from: 'n1', to: 'n2', label: 'triggered' },
    { from: 'n2', to: 'n3', label: 'response' },
  ],
};

export const sampleDescribeResult: DescribeResult = {
  version: '1.1',
  stores: [
    {
      name: 'CounterStore',
      description: sampleStoreEntry.description ?? null,
      snapshotCount: sampleSnapshots.length,
      registeredAt: 0,
      destroyedAt: null,
      sourceHint: sampleStoreEntry.sourceHint ?? null,
      instances: [
        {
          id: 'counter-1',
          registeredAt: 0,
          destroyedAt: null,
          snapshotCount: sampleSnapshots.length,
        },
      ],
    },
  ],
  api: ['snapshot', 'history', 'diff', 'http', 'record', 'describe', 'formatForAI'],
  recordingActive: false,
  caveat: 'Lazy-loaded routes may register additional stores.',
};

export const sampleFormattedStore = '## Stellar Devtools Snapshot — CounterStore\n\n(fake formatted store)';
export const sampleFormattedAll = '## Stellar Devtools Snapshot — CounterStore\n\n## HTTP Traffic';
export const sampleFormattedHttp = '## HTTP Traffic\n\n(fake formatted http)';
export const sampleFormattedRecording = '## Stellar Recording — "add-book-flow"\n\n(fake formatted recording)';

/**
 * Hand-written fake StellarClient. Records every call so tests can assert on
 * which paths the tool exercised. Behavior is configurable per-test by
 * overriding the relevant property.
 */
export class FakeStellarClient implements StellarClient {
  available = true;
  describeResult: DescribeResult = sampleDescribeResult;
  snapshotResult: StoreEntry[] = [sampleStoreEntry];
  byNameResult: StoreEntry | StoreInstance | null = sampleStoreEntry;
  historyResult: StateSnapshot[] | null = sampleSnapshots;
  diffResult: DiffResult | null = {
    from: sampleSnapshots[1],
    to: sampleSnapshots[2],
  };
  httpResult: HttpEvent[] = sampleHttpEvents;
  recordingActiveValue = false;
  stopResult: RecordingSession | null = sampleRecording;
  errorToThrow: Error | null = null;

  formattedStoreResult: string | null = sampleFormattedStore;
  formattedAllResult: string = sampleFormattedAll;
  formattedHttpResult: string = sampleFormattedHttp;
  formattedRecordingResult: string | null = sampleFormattedRecording;

  calls = {
    isAvailable: 0,
    describe: 0,
    snapshot: 0,
    snapshotByName: [] as Array<{ name: string; query?: InstanceQuery }>,
    history: [] as Array<{ name: string; n?: number; query?: InstanceQuery }>,
    diff: [] as Array<{ name: string; query?: InstanceQuery }>,
    http: 0,
    isRecording: 0,
    start: [] as Array<{ name?: string }>,
    stop: 0,
    formatStore: [] as Array<{ name: string }>,
    formatAll: 0,
    formatHttp: 0,
    formatRecording: [] as Array<{ session?: RecordingSession }>,
  };

  private maybeThrow(): void {
    if (this.errorToThrow) throw this.errorToThrow;
  }

  async isAvailable(): Promise<boolean> {
    this.calls.isAvailable++;
    return this.available;
  }

  async describe(): Promise<DescribeResult> {
    this.calls.describe++;
    this.maybeThrow();
    return this.describeResult;
  }

  async snapshot(): Promise<StoreEntry[]> {
    this.calls.snapshot++;
    this.maybeThrow();
    return this.snapshotResult;
  }

  async snapshotByName(
    name: string,
    query?: InstanceQuery,
  ): Promise<StoreEntry | StoreInstance | null> {
    this.calls.snapshotByName.push({ name, query });
    this.maybeThrow();
    return this.byNameResult;
  }

  async history(
    name: string,
    n?: number,
    query?: InstanceQuery,
  ): Promise<StateSnapshot[] | null> {
    this.calls.history.push({ name, n, query });
    this.maybeThrow();
    return this.historyResult;
  }

  async diff(name: string, query?: InstanceQuery): Promise<DiffResult | null> {
    this.calls.diff.push({ name, query });
    this.maybeThrow();
    return this.diffResult;
  }

  async http(): Promise<HttpEvent[]> {
    this.calls.http++;
    this.maybeThrow();
    return this.httpResult;
  }

  record: RecordControl = {
    isRecording: async (): Promise<boolean> => {
      this.calls.isRecording++;
      this.maybeThrow();
      return this.recordingActiveValue;
    },
    start: async (name?: string): Promise<void> => {
      this.calls.start.push({ name });
      this.maybeThrow();
    },
    stop: async (): Promise<RecordingSession | null> => {
      this.calls.stop++;
      this.maybeThrow();
      return this.stopResult;
    },
  };

  formatForAI: FormatForAIClient = {
    store: async (name: string): Promise<string | null> => {
      this.calls.formatStore.push({ name });
      this.maybeThrow();
      return this.formattedStoreResult;
    },
    all: async (): Promise<string> => {
      this.calls.formatAll++;
      this.maybeThrow();
      return this.formattedAllResult;
    },
    http: async (): Promise<string> => {
      this.calls.formatHttp++;
      this.maybeThrow();
      return this.formattedHttpResult;
    },
    recording: async (session?: RecordingSession): Promise<string | null> => {
      this.calls.formatRecording.push({ session });
      this.maybeThrow();
      return this.formattedRecordingResult;
    },
  };
}
