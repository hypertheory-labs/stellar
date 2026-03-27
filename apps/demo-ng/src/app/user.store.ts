import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({ name: 'Alice', loggedIn: false }),
  withStellarDevtools('UserStore', {
    description: 'Minimal auth state — logged-in flag and display name. Demo of simple boolean state transitions with click triggers.',
    sourceHint: 'apps/demo-ng/src/app/user.store.ts',
  }),
  withMethods(store => ({
    login() { patchState(store, { loggedIn: true }); },
    logout() { patchState(store, { loggedIn: false }); },
    setName(name: string) { patchState(store, { name }); },
  })),
);
