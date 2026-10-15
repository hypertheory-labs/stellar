import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

// Route-scoped (NOT providedIn: 'root') so navigating away destroys the
// instance and navigating back creates a fresh one. This is the fixture
// the lifecycle e2e tests use to exercise re-mount behavior.
export const LifecycleStore = signalStore(
  withState({ count: 0 }),
  withStellarDevtools('LifecycleStore', {
    description: 'Route-scoped store used by lifecycle e2e tests to exercise re-mount.',
    sourceHint: 'apps/demo-ng/src/app/lifecycle-test.component.ts',
  }),
  withMethods((store) => ({
    bump(): void {
      patchState(store, (s) => ({ count: s.count + 1 }));
    },
  })),
);

@Component({
  selector: 'demo-lifecycle-test',
  imports: [RouterLink],
  providers: [LifecycleStore],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section style="padding: 1rem;">
      <h2>Lifecycle Test</h2>
      <p>Count: <span data-test="count">{{ store.count() }}</span></p>
      <button data-test="bump" (click)="store.bump()">+</button>
      <a data-test="leave" routerLink="/__test/empty">leave</a>
    </section>
  `,
})
export class LifecycleTestComponent {
  protected store = inject(LifecycleStore);
}

@Component({
  selector: 'demo-empty-test',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section style="padding: 1rem;">
      <p>Empty test page</p>
      <a data-test="back" routerLink="/__test/lifecycle">back</a>
    </section>
  `,
})
export class EmptyTestComponent {}
