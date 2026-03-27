import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export type OutboxKind = 'addition' | 'update' | 'deletion' | 'notification';

export interface OutboxEntry {
  id: string;
  kind: OutboxKind;
  name: string;         // human-readable label for overlay/timeline
  body: unknown;        // full pending value
}

export interface DeadLetter extends OutboxEntry {
  statusCode: number;
  error: string;
}

export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState({
    products: [] as Product[],
    outbox: [] as OutboxEntry[],
    deadLetters: [] as DeadLetter[],
    loading: false,
  }),
  withStellarDevtools('ProductsStore', {
    description: 'Product catalog with outbox pattern. Tracks in-flight mutations (additions, updates, deletions) and failed requests (dead letters). Exercises causal linking between HTTP events and state changes.',
    sourceHint: 'apps/demo-ng/src/app/products.store.ts',
  }),
  withComputed(store => ({
    hasPending: computed(() => store.outbox().length > 0),
    hasErrors: computed(() => store.deadLetters().length > 0),
  })),
  withMethods(store => ({
    async load() {
      patchState(store, { loading: true });
      try {
        const res = await fetch('/api/products');
        const products: Product[] = await res.json();
        patchState(store, { products, loading: false });
      } catch {
        patchState(store, { loading: false });
      }
    },

    async addProduct(name: string, price: number) {
      const entry: OutboxEntry = {
        id: crypto.randomUUID(),
        kind: 'addition',
        name: `Add "${name}"`,
        body: { name, price },
      };
      patchState(store, { outbox: [...store.outbox(), entry] });
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, price }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const product: Product = await res.json();
        patchState(store, {
          products: [...store.products(), product],
          outbox: store.outbox().filter(e => e.id !== entry.id),
        });
      } catch (err) {
        patchState(store, {
          outbox: store.outbox().filter(e => e.id !== entry.id),
          deadLetters: [...store.deadLetters(), {
            ...entry,
            statusCode: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
          }],
        });
      }
    },

    async updateProduct(id: string, name: string, price: number) {
      const entry: OutboxEntry = {
        id: crypto.randomUUID(),
        kind: 'update',
        name: `Update "${name}"`,
        body: { id, name, price },
      };
      patchState(store, { outbox: [...store.outbox(), entry] });
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, price }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const updated: Product = await res.json();
        patchState(store, {
          products: store.products().map(p => p.id === id ? updated : p),
          outbox: store.outbox().filter(e => e.id !== entry.id),
        });
      } catch (err) {
        patchState(store, {
          outbox: store.outbox().filter(e => e.id !== entry.id),
          deadLetters: [...store.deadLetters(), {
            ...entry,
            statusCode: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
          }],
        });
      }
    },

    async deleteProduct(id: string) {
      const product = store.products().find(p => p.id === id);
      const entry: OutboxEntry = {
        id: crypto.randomUUID(),
        kind: 'deletion',
        name: `Delete "${product?.name ?? id}"`,
        body: id,
      };
      patchState(store, { outbox: [...store.outbox(), entry] });
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`${res.status}`);
        patchState(store, {
          products: store.products().filter(p => p.id !== id),
          outbox: store.outbox().filter(e => e.id !== entry.id),
        });
      } catch (err) {
        patchState(store, {
          outbox: store.outbox().filter(e => e.id !== entry.id),
          deadLetters: [...store.deadLetters(), {
            ...entry,
            statusCode: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
          }],
        });
      }
    },

    clearDeadLetter(id: string) {
      patchState(store, {
        deadLetters: store.deadLetters().filter(e => e.id !== id),
      });
    },
  })),
);
