export interface StateSnapshot {
  timestamp: number;
  state: Record<string, unknown>;
}

export interface StoreEntry {
  name: string;
  history: StateSnapshot[];
}
