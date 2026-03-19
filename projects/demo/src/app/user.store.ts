import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory/stellardevtools';

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState({ name: 'Alice', loggedIn: false }),
  withStellarDevtools('UserStore'),
  withMethods(store => ({
    login() { patchState(store, { loggedIn: true }); },
    logout() { patchState(store, { loggedIn: false }); },
    setName(name: string) { patchState(store, { name }); },
  })),
);
