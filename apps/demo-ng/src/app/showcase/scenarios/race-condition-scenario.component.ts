import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NaiveProductsStore } from '../naive-products.store';

type ChaosState = 'off' | 'race' | 'activating';

@Component({
  selector: 'app-race-condition-scenario',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="grid gap-6">

      <!-- Header -->
      <div class="flex items-start gap-3">
        <a routerLink="/ai-collaboration" class="btn btn-ghost btn-sm btn-square mt-0.5">←</a>
        <div>
          <h1 class="text-xl font-bold">Race condition — stale closure bug</h1>
          <p class="text-sm text-base-content/60 mt-0.5">
            This store captures state at call time instead of reading it when the response arrives.
            In chaos mode, the first request is delayed so the second resolves first — exposing
            the bug.
          </p>
        </div>
      </div>

      <!-- Chaos toggle -->
      <div class="card border"
           [class]="chaosState() === 'race' ? 'bg-error/10 border-error/40' : 'bg-base-200 border-base-300'">
        <div class="card-body py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-semibold text-sm">
                Chaos mode
                @if (chaosState() === 'race') {
                  <span class="badge badge-error badge-sm ml-2">active</span>
                }
              </h2>
              <p class="text-xs text-base-content/60 mt-0.5">
                When on: first POST to <code>/api/naive-products</code> gets a 2.8s delay,
                subsequent ones get 0.6s. This guarantees out-of-order responses.
              </p>
            </div>
            <button class="btn btn-sm flex-shrink-0"
                    [class]="chaosState() === 'race' ? 'btn-error' : 'btn-outline'"
                    [disabled]="chaosState() === 'activating'"
                    (click)="toggleChaos()">
              @if (chaosState() === 'activating') {
                <span class="loading loading-spinner loading-xs"></span>
              }
              {{ chaosState() === 'race' ? 'Disable chaos' : 'Enable chaos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body py-4">
          <h2 class="font-semibold text-sm mb-3">How to run this demo</h2>
          <ol class="text-sm text-base-content/70 grid gap-2 list-none">
            <li><span class="badge badge-neutral badge-sm mr-2">1</span>Click <strong>Reset</strong> to start from a clean state, then <strong>Load</strong></li>
            <li><span class="badge badge-neutral badge-sm mr-2">2</span>Enable <strong>Chaos mode</strong> above</li>
            <li><span class="badge badge-neutral badge-sm mr-2">3</span>Open the Stellar overlay and click <strong>⏺ Rec</strong></li>
            <li><span class="badge badge-neutral badge-sm mr-2">4</span>Click <strong>Add product</strong> twice in quick succession (two different names)</li>
            <li><span class="badge badge-neutral badge-sm mr-2">5</span>Wait for both responses — notice only one product appears</li>
            <li><span class="badge badge-neutral badge-sm mr-2">6</span>Stop the recording and paste with the prompt below</li>
          </ol>
          <div class="divider my-2"></div>
          <p class="text-xs text-base-content/50 font-mono leading-relaxed">
            Looking at the causal graph, do you see evidence of a race condition?
            How many products should exist after both requests resolved, and how many actually do?
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div class="card bg-base-200">
        <div class="card-body">
          <div class="flex items-center gap-3 mb-3">
            <h2 class="font-semibold text-sm flex-1">
              NaiveProductsStore
              @if (store.loading()) {
                <span class="loading loading-spinner loading-xs ml-2"></span>
              }
            </h2>
            <button class="btn btn-xs btn-ghost" (click)="reset()">Reset</button>
            <button class="btn btn-xs btn-ghost" (click)="store.load()">Load</button>
          </div>

          <div class="flex gap-2 flex-wrap">
            <input class="input input-sm input-bordered flex-1 min-w-36"
                   placeholder="Name"
                   [(ngModel)]="nameA" />
            <button class="btn btn-sm btn-primary" (click)="add(nameA)">
              Add "{{ nameA || '…' }}"
            </button>
          </div>
          <div class="flex gap-2 flex-wrap mt-2">
            <input class="input input-sm input-bordered flex-1 min-w-36"
                   placeholder="Name"
                   [(ngModel)]="nameB" />
            <button class="btn btn-sm btn-secondary" (click)="add(nameB)">
              Add "{{ nameB || '…' }}"
            </button>
          </div>
          <p class="text-xs text-base-content/40 mt-2">
            In chaos mode: first add gets 2.8s delay, second gets 0.6s.
            Click both buttons before either resolves to reproduce the race.
          </p>
        </div>
      </div>

      <!-- Product list -->
      <div class="card bg-base-200">
        <div class="card-body py-3">
          <h3 class="text-sm font-semibold mb-2">
            Products in state
            <span class="badge badge-neutral badge-sm ml-1">{{ store.products().length }}</span>
          </h3>
          <ul class="divide-y divide-base-300">
            @for (product of store.products(); track product.id) {
              <li class="py-2 flex items-center gap-3 text-sm">
                <span class="flex-1 font-medium">{{ product.name }}</span>
                <span class="text-base-content/50">{{ '$' + product.price }}</span>
                <button class="btn btn-xs btn-ghost btn-error"
                        (click)="store.deleteProduct(product.id)">×</button>
              </li>
            } @empty {
              <li class="py-4 text-center text-sm text-base-content/40">
                Click Load to fetch products.
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- Bug callout -->
      <div class="alert bg-base-200 border border-base-300">
        <div>
          <p class="text-xs font-semibold text-base-content/70 mb-1">The bug in this store</p>
          <code class="text-xs text-base-content/60 leading-relaxed block">
            const captured = store.products(); &nbsp;← captured before await<br>
            const res = await fetch(...);<br>
            patchState(store, &#123; products: [...captured, product] &#125;); &nbsp;← stale spread
          </code>
          <p class="text-xs text-base-content/50 mt-2">
            If another response arrives while this request is in flight and extends <code>products[]</code>,
            that addition will be overwritten when this response spreads from <code>captured</code>.
          </p>
        </div>
      </div>

    </div>
  `,
})
export class RaceConditionScenarioComponent {
  readonly store = inject(NaiveProductsStore);

  chaosState = signal<ChaosState>('off');
  nameA = 'Alpha';
  nameB = 'Beta';

  async toggleChaos() {
    const next = this.chaosState() === 'race' ? 'off' : 'race';
    this.chaosState.set('activating');
    await fetch('/api/__dev/chaos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    });
    this.chaosState.set(next);
  }

  async reset() {
    await fetch('/api/__dev/reset', { method: 'POST' });
    // Also re-enable chaos if it was active (reset clears the counter)
    if (this.chaosState() === 'race') {
      await fetch('/api/__dev/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'race' }),
      });
    }
    await this.store.load();
  }

  add(name: string) {
    const trimmed = name.trim() || `Product-${Date.now()}`;
    this.store.addProduct(trimmed, 0);
  }
}
