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
  sourceHint?: string;
  typeDefinition?: string;
}

export interface StateSnapshot {
  timestamp: number;
  state: Record<string, unknown>;
  route: string | null;
  inferredShape: ShapeMap;
  trigger?: string;
}

export interface StoreEntry {
  name: string;
  sourceHint?: string;
  typeDefinition?: string;
  history: StateSnapshot[];
}
