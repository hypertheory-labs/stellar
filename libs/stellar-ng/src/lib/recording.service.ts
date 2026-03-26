import { inject, Injectable, signal } from '@angular/core';
import { HttpEvent, RecordingEdge, RecordingNode, RecordingSession, StateSnapshot, StoreEntry } from './models';
import { StellarRegistryService } from './stellar-registry.service';

// Format description embedded in every RecordingSession for LLM consumers
const RECORDING_FORMAT =
  'Stellar Devtools recording — directed causal graph of a user interaction in an Angular/NgRx Signal Store app. ' +
  'Node types: click (user gesture, label=element text), ngrx-event (dispatched NgRx event, label=type), ' +
  'http-request (fetch initiated, method+url), http-response (fetch completed, status+duration), ' +
  'state-snapshot (store state change, delta:{field:[before,after]}, arrays summarized to length). ' +
  'Edge labels: initiated (user action→request), resolved (request→response), ' +
  'produced (response→state-snapshot), caused (user action→optimistic state-snapshot). ' +
  't=ms from recording start. storeContext maps store names to their purpose.';

// Compact summary of a value for recording delta — arrays become their length
function summarize(v: unknown): unknown {
  if (Array.isArray(v)) return v.length;
  return v;
}

function snapshotDelta(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): Record<string, [unknown, unknown]> | undefined {
  const delta: Record<string, [unknown, unknown]> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of keys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
      delta[key] = [summarize(prev[key]), summarize(curr[key])];
    }
  }
  return Object.keys(delta).length > 0 ? delta : undefined;
}

function snapshotIndexIn(store: StoreEntry, snap: StateSnapshot): number {
  return store.history.indexOf(snap);
}

@Injectable({ providedIn: 'root' })
export class RecordingService {
  private registry = inject(StellarRegistryService);

  readonly isRecording  = signal(false);
  readonly lastSession  = signal<RecordingSession | null>(null);
  private recordingStart: number | null = null;
  private recordingName = '';

  start(name = 'recording'): void {
    this.recordingName = name;
    this.recordingStart = Date.now();
    this.isRecording.set(true);
  }

  stop(): RecordingSession | null {
    if (!this.isRecording() || this.recordingStart === null) return null;
    const start = this.recordingStart;
    const end = Date.now();
    this.isRecording.set(false);
    this.recordingStart = null;
    const session = this.buildSession(this.recordingName, start, end);
    this.lastSession.set(session);
    return session;
  }

  download(session: RecordingSession): void {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/\s+/g, '-')}.recording.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildSession(name: string, start: number, end: number): RecordingSession {
    const stores = this.registry.getAllStores();
    const httpEvents = this.registry.getHttpEvents()
      .filter(e => e.timestamp >= start && e.timestamp <= end);

    const nodes: RecordingNode[] = [];
    const edges: RecordingEdge[] = [];
    let counter = 0;
    const newId = (): string => `n${++counter}`;

    // ── HTTP nodes ────────────────────────────────────────────────────────────
    // Build req/resp pairs first — they have reliable timestamps.
    const httpNodeMap = new Map<string, { reqId: string; respId: string }>();
    for (const ev of httpEvents) {
      const reqId = newId();
      const respId = newId();
      nodes.push({
        id: reqId,
        type: 'http-request',
        t: ev.timestamp - start,
        method: ev.method,
        url: ev.url,
      });
      nodes.push({
        id: respId,
        type: 'http-response',
        t: ev.timestamp + ev.duration - start,
        status: ev.status,
        duration: ev.duration,
        ...(ev.error ? { error: ev.error } : {}),
      });
      edges.push({ from: reqId, to: respId, label: 'resolved' });
      httpNodeMap.set(ev.id, { reqId, respId });
    }

    // ── Trigger node deduplication ────────────────────────────────────────────
    // Same trigger text within 50ms → reuse the node. This handles the case
    // where both an HTTP event and a state snapshot from the same user action
    // arrive nearly simultaneously (~2–5ms apart in practice). 500ms was too
    // wide: it collapsed distinct rapid clicks on the same button into one node.
    const triggerIndex: Array<{ text: string; id: string; minTime: number }> = [];

    const findOrCreateTrigger = (triggerText: string, atTime: number): string => {
      const existing = triggerIndex.find(
        e => e.text === triggerText && Math.abs(e.minTime - atTime) < 50,
      );
      if (existing) return existing.id;

      const id = newId();
      const t = atTime - start;
      // "click: 'label'" vs "[Event] type — click: 'label'" vs "[Event] type"
      if (triggerText.startsWith('click:')) {
        const label = triggerText.slice('click:'.length).trim().replace(/^"|"$/g, '');
        nodes.push({ id, type: 'click', t, label });
      } else {
        const parts = triggerText.split(' — click:');
        const eventType = parts[0].trim();
        const clickLabel = parts[1]?.trim().replace(/^"|"$/g, '');
        nodes.push({
          id,
          type: 'ngrx-event',
          t,
          label: clickLabel ? `${eventType} — click: "${clickLabel}"` : eventType,
        });
      }
      triggerIndex.push({ text: triggerText, id, minTime: atTime });
      return id;
    };

    // Wire trigger → http-request (initiated)
    for (const ev of httpEvents) {
      if (ev.trigger) {
        const triggerId = findOrCreateTrigger(ev.trigger, ev.timestamp);
        const pair = httpNodeMap.get(ev.id);
        if (pair) edges.push({ from: triggerId, to: pair.reqId, label: 'initiated' });
      }
    }

    // ── State-snapshot nodes ──────────────────────────────────────────────────
    const allSnaps: Array<{
      store: StoreEntry;
      snap: StateSnapshot;
      prev: StateSnapshot | null;
    }> = [];

    for (const store of stores) {
      const inWindow = store.history.filter(
        s => s.timestamp >= start && s.timestamp <= end,
      );
      for (let i = 0; i < inWindow.length; i++) {
        const globalIdx = store.history.indexOf(inWindow[i]);
        const prev = globalIdx > 0 ? store.history[globalIdx - 1] : null;
        allSnaps.push({ store, snap: inWindow[i], prev });
      }
    }
    allSnaps.sort((a, b) => a.snap.timestamp - b.snap.timestamp);

    for (const { store, snap, prev } of allSnaps) {
      const id = newId();
      const delta = prev ? snapshotDelta(prev.state, snap.state) : undefined;
      nodes.push({
        id,
        type: 'state-snapshot',
        t: snap.timestamp - start,
        store: store.name,
        snapshotIndex: snapshotIndexIn(store, snap),
        ...(delta ? { delta } : {}),
      });

      const httpPair = snap.httpEventId ? httpNodeMap.get(snap.httpEventId) : undefined;
      if (httpPair) {
        edges.push({ from: httpPair.respId, to: id, label: 'produced' });
      } else if (snap.trigger) {
        const triggerId = findOrCreateTrigger(snap.trigger, snap.timestamp);
        edges.push({ from: triggerId, to: id, label: 'caused' });
      }
    }

    // Sort all nodes by t so the output reads chronologically
    nodes.sort((a, b) => a.t - b.t);

    // Store context: descriptions for stores that actually appear in this recording
    const storeNamesInRecording = new Set(allSnaps.map(s => s.store.name));
    const storeContext: Record<string, string> = {};
    for (const store of stores) {
      if (storeNamesInRecording.has(store.name) && store.description) {
        storeContext[store.name] = store.description;
      }
    }

    return {
      name,
      recordedAt: new Date(start).toISOString(),
      duration: end - start,
      description: RECORDING_FORMAT,
      storeContext,
      nodes,
      edges,
    };
  }
}
