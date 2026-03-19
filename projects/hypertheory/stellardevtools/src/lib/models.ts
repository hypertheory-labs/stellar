export interface StateSnapshot {
  timestamp: number;
  state: Record<string, unknown>;
  route: string | null;
}

export interface StoreEntry {
  name: string;
  history: StateSnapshot[];
}
