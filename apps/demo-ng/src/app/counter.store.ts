import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory/stellar-ng-devtools';

export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0, label: 'Counter' }),
  withStellarDevtools('CounterStore'),
  withMethods(store => ({
    increment() { patchState(store, s => ({ count: s.count + 1 })); },
    decrement() { patchState(store, s => ({ count: s.count - 1 })); },
    reset() { patchState(store, { count: 0 }); },
  })),
);
