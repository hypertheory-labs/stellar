import { Component, computed, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

// ── Three counter stores, each with a deliberately different scope ──────────
// They share an identical shape so the only thing the showcase teaches is
// *where* a store lives — not what it does.

export const RootCounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0 }),
  withStellarDevtools('LifecycleRootCounter', {
    description: 'Counter A — providedIn: "root". Single instance for the lifetime of the app; survives navigation.',
    sourceHint: 'apps/demo-ng/src/app/lifecycle-showcase.component.ts',
  }),
  withMethods((store) => ({
    inc(): void { patchState(store, (s) => ({ count: s.count + 1 })); },
    dec(): void { patchState(store, (s) => ({ count: s.count - 1 })); },
  })),
);

export const RouteCounterStore = signalStore(
  withState({ count: 0 }),
  withStellarDevtools('LifecycleRouteCounter', {
    description: 'Counter B — provided on the /lifecycle route. Fresh instance every visit; destroyed when you navigate away.',
    sourceHint: 'apps/demo-ng/src/app/lifecycle-showcase.component.ts',
  }),
  withMethods((store) => ({
    inc(): void { patchState(store, (s) => ({ count: s.count + 1 })); },
    dec(): void { patchState(store, (s) => ({ count: s.count - 1 })); },
  })),
);

export const ScopedCounterStore = signalStore(
  withState({ count: 0 }),
  withStellarDevtools('LifecycleScopedCounter', {
    description: 'Counter C — provided on a togglable child component. Mount/unmount creates and destroys instances inline, no navigation required.',
    sourceHint: 'apps/demo-ng/src/app/lifecycle-showcase.component.ts',
  }),
  withMethods((store) => ({
    inc(): void { patchState(store, (s) => ({ count: s.count + 1 })); },
    dec(): void { patchState(store, (s) => ({ count: s.count - 1 })); },
  })),
);

// ── Live readout of one store's lifecycle from the registry ─────────────────
// Reads window.__stellarDevtools.describe() so the user can see exactly the
// data an AI assistant would receive.

interface LifecycleReadout {
  instances: number;
  active: number;
  destroyed: number;
  totalSnapshots: number;
}

interface RegistryShape {
  describe(): {
    stores: Array<{
      name: string;
      instances: Array<{ destroyedAt: number | null; snapshotCount: number }>;
    }>;
  };
}

@Component({
  selector: 'demo-lifecycle-readout',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-base-content/70 mt-2">
      <dt>instances</dt>
      <dd [attr.data-test]="storeName() + '-instances'" class="font-mono">{{ readout().instances }}</dd>
      <dt>active</dt>
      <dd [attr.data-test]="storeName() + '-active'" class="font-mono">{{ readout().active }}</dd>
      <dt>destroyed</dt>
      <dd [attr.data-test]="storeName() + '-destroyed'" class="font-mono">{{ readout().destroyed }}</dd>
      <dt>snapshots (total)</dt>
      <dd [attr.data-test]="storeName() + '-snapshot-total'" class="font-mono">{{ readout().totalSnapshots }}</dd>
    </dl>
  `,
})
export class LifecycleReadoutComponent {
  storeName = input.required<string>();

  // Polled — the registry doesn't expose its change subscription through
  // window.__stellarDevtools, so we tick on a short interval to keep the
  // readout fresh as the user clicks.
  private tick = signal(0);

  constructor() {
    setInterval(() => this.tick.update(t => t + 1), 250);
  }

  readout = computed<LifecycleReadout>(() => {
    this.tick();
    const dev = (window as unknown as { __stellarDevtools?: RegistryShape }).__stellarDevtools;
    if (!dev) return { instances: 0, active: 0, destroyed: 0, totalSnapshots: 0 };
    const entry = dev.describe().stores.find(s => s.name === this.storeName());
    if (!entry) return { instances: 0, active: 0, destroyed: 0, totalSnapshots: 0 };
    return {
      instances: entry.instances.length,
      active: entry.instances.filter(i => i.destroyedAt === null).length,
      destroyed: entry.instances.filter(i => i.destroyedAt !== null).length,
      totalSnapshots: entry.instances.reduce((sum, i) => sum + i.snapshotCount, 0),
    };
  });
}

// Wrapper for the scoped (component-providers) counter so we can mount/unmount
// it via @if without affecting the others.
@Component({
  selector: 'demo-scoped-counter-card',
  imports: [LifecycleReadoutComponent],
  providers: [ScopedCounterStore],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="card bg-base-200">
      <div class="card-body">
        <h3 class="card-title text-base">Counter C</h3>
        <p class="text-xs text-base-content/60">component-providers — alive only while this card is mounted</p>
        <div class="flex items-baseline gap-3 my-3">
          <span class="text-3xl font-mono" data-test="LifecycleScopedCounter-count">{{ store.count() }}</span>
          <button class="btn btn-sm btn-square" data-test="LifecycleScopedCounter-dec" (click)="store.dec()">−</button>
          <button class="btn btn-sm btn-square btn-primary" data-test="LifecycleScopedCounter-inc" (click)="store.inc()">+</button>
        </div>
        <demo-lifecycle-readout [storeName]="'LifecycleScopedCounter'" />
      </div>
    </div>
  `,
})
export class ScopedCounterCardComponent {
  protected store = inject(ScopedCounterStore);
}

// ── The showcase route component ────────────────────────────────────────────

@Component({
  selector: 'demo-lifecycle-showcase',
  imports: [RouterLink, ScopedCounterCardComponent, LifecycleReadoutComponent],
  providers: [RouteCounterStore],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="max-w-4xl mx-auto p-6 grid gap-6">
      <header>
        <h1 class="text-2xl font-bold mb-2">Store Lifecycle</h1>
        <p class="text-sm text-base-content/70 leading-relaxed">
          Three counters with the same behaviour, registered at three different scopes. Stellar tracks each
          one as a chain of <em>instances</em> over the session. Open the overlay (✦) or run
          <code class="text-xs">window.__stellarDevtools.describe()</code> in the console to see the lifecycle data
          AI consumers receive.
        </p>
      </header>

      <div class="grid sm:grid-cols-3 gap-4">
        <!-- Counter A: root-provided -->
        <div class="card bg-base-200">
          <div class="card-body">
            <h3 class="card-title text-base">Counter A</h3>
            <p class="text-xs text-base-content/60">providedIn: 'root' — single instance, survives navigation</p>
            <div class="flex items-baseline gap-3 my-3">
              <span class="text-3xl font-mono" data-test="LifecycleRootCounter-count">{{ rootStore.count() }}</span>
              <button class="btn btn-sm btn-square" data-test="LifecycleRootCounter-dec" (click)="rootStore.dec()">−</button>
              <button class="btn btn-sm btn-square btn-primary" data-test="LifecycleRootCounter-inc" (click)="rootStore.inc()">+</button>
            </div>
            <demo-lifecycle-readout [storeName]="'LifecycleRootCounter'" />
          </div>
        </div>

        <!-- Counter B: route-provided -->
        <div class="card bg-base-200">
          <div class="card-body">
            <h3 class="card-title text-base">Counter B</h3>
            <p class="text-xs text-base-content/60">route providers — fresh each visit to /lifecycle</p>
            <div class="flex items-baseline gap-3 my-3">
              <span class="text-3xl font-mono" data-test="LifecycleRouteCounter-count">{{ routeStore.count() }}</span>
              <button class="btn btn-sm btn-square" data-test="LifecycleRouteCounter-dec" (click)="routeStore.dec()">−</button>
              <button class="btn btn-sm btn-square btn-primary" data-test="LifecycleRouteCounter-inc" (click)="routeStore.inc()">+</button>
            </div>
            <demo-lifecycle-readout [storeName]="'LifecycleRouteCounter'" />
          </div>
        </div>

        <!-- Counter C: component-providers, toggleable -->
        @if (showScoped()) {
          <demo-scoped-counter-card />
        } @else {
          <div class="card bg-base-200 border-2 border-dashed border-base-300">
            <div class="card-body items-center justify-center text-center">
              <p class="text-xs text-base-content/60 mb-2">Counter C — unmounted</p>
              <p class="text-xs text-base-content/50">No instance currently provides this store.</p>
            </div>
          </div>
        }
      </div>

      <div class="flex gap-2">
        <button class="btn btn-sm" data-test="toggle-scoped" (click)="showScoped.update(v => !v)">
          {{ showScoped() ? 'Unmount' : 'Mount' }} Counter C
        </button>
        <a class="btn btn-sm btn-ghost" routerLink="/" data-test="leave">leave (try coming back)</a>
      </div>

      <section class="mt-2">
        <h2 class="font-semibold mb-2">Try this</h2>
        <ol class="list-decimal list-inside space-y-1 text-sm text-base-content/80">
          <li>Click <code>+</code> on each counter so they have distinct values.</li>
          <li>Click <strong>Unmount Counter C</strong>. Watch its readout: <code>active</code> drops to 0, <code>destroyed</code> goes to 1.</li>
          <li>Click <strong>Mount Counter C</strong>. A second instance appears: <code>instances: 2</code>, count starts back at 0.</li>
          <li>Click <strong>leave</strong>, then come back. Counter A keeps its value (single root instance). Counters B and C reset (new instances).</li>
          <li>Open the overlay (✦) — Counter C's chip will show a <code>2</code> badge if it has been mounted twice; chips for any name with no active instance are greyed.</li>
        </ol>
      </section>
    </div>
  `,
})
export class LifecycleShowcaseComponent {
  protected rootStore = inject(RootCounterStore);
  protected routeStore = inject(RouteCounterStore);
  protected showScoped = signal(true);
}
