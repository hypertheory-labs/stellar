import { signalStore, withState, type } from '@ngrx/signals';
import { event, eventGroup, withReducer, on } from '@ngrx/signals/events';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export const counterEvents = eventGroup({
  source: 'Counter',
  events: {
    increment: type<void>(),
    decrement: type<void>(),
    reset: type<void>(),
  },
});

export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0, label: 'Counter' }),
  withStellarDevtools('CounterStore', {
    description: 'Simple increment/decrement counter driven by NgRx event groups. Primary demo of trigger capture and event-to-state causal linking.',
    sourceHint: 'apps/demo-ng/src/app/counter.store.ts',
  }),
  withReducer(
    on(counterEvents.increment, (_, state) => ({ count: state.count + 1 })),
    on(counterEvents.decrement, (_, state) => ({ count: state.count - 1 })),
    on(counterEvents.reset, () => ({ count: 0 })),
  ),
);
