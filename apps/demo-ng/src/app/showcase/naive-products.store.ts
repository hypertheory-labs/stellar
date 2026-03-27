import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export interface NaiveProduct {
  id: string;
  name: string;
  price: number;
}

/**
 * Intentionally naïve product store — demonstrates the stale-closure race condition.
 *
 * The bug: `addProduct` captures `store.products()` at call time and uses that
 * captured array when the response arrives. If two requests are in flight and
 * the second resolves first, the first response will overwrite the second's
 * addition — because it spreads from the captured (pre-second-add) snapshot.
 *
 * Compare to ProductsStore, which uses the outbox pattern to avoid this entirely.
 */
export const NaiveProductsStore = signalStore(
  { providedIn: 'root' },
  withState({
    products: [] as NaiveProduct[],
    loading: false,
  }),
  withStellarDevtools('NaiveProductsStore', {
    description: 'Intentionally naïve product store. Captures state at request time and writes it back on response — vulnerable to stale-closure race conditions when mutations overlap.',
    sourceHint: 'apps/demo-ng/src/app/showcase/naive-products.store.ts',
  }),
  withMethods(store => ({
    async load() {
      patchState(store, { loading: true });
      const res = await fetch('/api/naive-products');
      const products: NaiveProduct[] = await res.json();
      patchState(store, { products, loading: false });
    },

    async addProduct(name: string, price: number) {
      // ⚠ BUG: state captured here, before the async gap
      const captured = store.products();
      const res = await fetch('/api/naive-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const product: NaiveProduct = await res.json();
      // ⚠ BUG: spreads from `captured`, not store.products()
      // If another response arrived while this was in flight, that addition is lost.
      patchState(store, { products: [...captured, product] });
    },

    async deleteProduct(id: string) {
      await fetch(`/api/naive-products/${id}`, { method: 'DELETE' });
      patchState(store, { products: store.products().filter(p => p.id !== id) });
    },
  })),
);
