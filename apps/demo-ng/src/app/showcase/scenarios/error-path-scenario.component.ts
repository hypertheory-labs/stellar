import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductsStore } from '../../products.store';

type ChaosState = 'off' | 'errors' | 'activating';

@Component({
  selector: 'app-error-path-scenario',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="grid gap-6">

      <!-- Header -->
      <div class="flex items-start gap-3">
        <a routerLink="/ai-collaboration" class="btn btn-ghost btn-sm btn-square mt-0.5">←</a>
        <div>
          <h1 class="text-xl font-bold">Error path — dead letters</h1>
          <p class="text-sm text-base-content/60 mt-0.5">
            Enable chaos mode to force 500 errors on all mutations. The outbox pattern
            catches each failure and moves it to dead letters instead of silently losing it.
          </p>
        </div>
      </div>

      <!-- Chaos toggle -->
      <div class="card border"
           [class]="chaosState() === 'errors' ? 'bg-error/10 border-error/40' : 'bg-base-200 border-base-300'">
        <div class="card-body py-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-semibold text-sm">
                Chaos mode — force errors
                @if (chaosState() === 'errors') {
                  <span class="badge badge-error badge-sm ml-2">active</span>
                }
              </h2>
              <p class="text-xs text-base-content/60 mt-0.5">
                When on: all POST, PUT, and DELETE requests to <code>/api/products</code>
                return 500. The outbox pattern catches each failure and moves it to dead letters.
              </p>
            </div>
            <button class="btn btn-sm flex-shrink-0"
                    [class]="chaosState() === 'errors' ? 'btn-error' : 'btn-outline'"
                    [disabled]="chaosState() === 'activating'"
                    (click)="toggleChaos()">
              @if (chaosState() === 'activating') {
                <span class="loading loading-spinner loading-xs"></span>
              }
              {{ chaosState() === 'errors' ? 'Disable chaos' : 'Enable chaos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body py-4">
          <h2 class="font-semibold text-sm mb-3">How to run this demo</h2>
          <ol class="text-sm text-base-content/70 grid gap-2 list-none">
            <li><span class="badge badge-neutral badge-sm mr-2">1</span>Enable <strong>Chaos mode</strong> above</li>
            <li><span class="badge badge-neutral badge-sm mr-2">2</span>Open the Stellar overlay and click <strong>⏺ Rec</strong></li>
            <li><span class="badge badge-neutral badge-sm mr-2">3</span>Click <strong>Add product</strong> — the request fires and fails with 500</li>
            <li><span class="badge badge-neutral badge-sm mr-2">4</span>Watch the entry move from outbox to dead letters</li>
            <li><span class="badge badge-neutral badge-sm mr-2">5</span>Stop the recording and paste with the prompt below</li>
          </ol>
          <div class="divider my-2"></div>
          <p class="text-xs text-base-content/50 font-mono leading-relaxed">
            This recording shows a failed mutation. Does the recording confirm that the failed request
            was captured as a dead letter? Is there anything in the state sequence that looks incorrect?
          </p>
        </div>
      </div>

      <!-- Add form -->
      <div class="card bg-base-200">
        <div class="card-body">
          <div class="flex items-center gap-3 mb-3">
            <h2 class="font-semibold text-sm flex-1">
              ProductsStore
              @if (store.hasPending()) {
                <span class="badge badge-warning badge-sm ml-2">{{ store.outbox().length }} in-flight</span>
              }
            </h2>
          </div>
          <div class="flex gap-2 flex-wrap">
            <input class="input input-sm input-bordered flex-1 min-w-36"
                   placeholder="Name"
                   [(ngModel)]="newName" />
            <button class="btn btn-sm btn-primary" (click)="add()">Add product</button>
            <button class="btn btn-sm btn-ghost" (click)="store.load()">Reload</button>
          </div>
        </div>
      </div>

      <!-- Products -->
      <div class="card bg-base-200">
        <div class="card-body py-3">
          <h3 class="text-sm font-semibold mb-2">Products in state</h3>
          <ul class="divide-y divide-base-300">
            @for (product of store.products(); track product.id) {
              <li class="py-2 flex items-center gap-3 text-sm">
                <span class="flex-1">{{ product.name }}</span>
                <span class="text-base-content/50">{{ '$' + product.price }}</span>
              </li>
            } @empty {
              <li class="py-4 text-center text-sm text-base-content/40">No products.</li>
            }
          </ul>
        </div>
      </div>

      <!-- Outbox -->
      @if (store.hasPending()) {
        <div class="card bg-base-200 border border-warning/40">
          <div class="card-body py-3">
            <h3 class="text-sm font-semibold text-warning mb-2">In-flight</h3>
            <ul class="grid gap-1">
              @for (entry of store.outbox(); track entry.id) {
                <li class="flex items-center gap-2 text-sm">
                  <span class="loading loading-spinner loading-xs text-warning"></span>
                  {{ entry.name }}
                </li>
              }
            </ul>
          </div>
        </div>
      }

      <!-- Dead letters -->
      @if (store.hasErrors()) {
        <div class="card bg-base-200 border border-error/40">
          <div class="card-body py-3">
            <h3 class="text-sm font-semibold text-error mb-2">Dead letters</h3>
            <ul class="grid gap-1">
              @for (letter of store.deadLetters(); track letter.id) {
                <li class="flex items-center gap-2 text-sm">
                  <span class="badge badge-error badge-xs">{{ letter.statusCode || 500 }}</span>
                  <span class="flex-1">{{ letter.name }}</span>
                  <span class="text-xs text-error/60">{{ letter.error }}</span>
                  <button class="btn btn-xs btn-ghost"
                          (click)="store.clearDeadLetter(letter.id)">Dismiss</button>
                </li>
              }
            </ul>
          </div>
        </div>
      }

    </div>
  `,
})
export class ErrorPathScenarioComponent {
  readonly store = inject(ProductsStore);

  chaosState = signal<ChaosState>('off');
  newName = 'Widget';

  async toggleChaos() {
    const next = this.chaosState() === 'errors' ? 'off' : 'errors';
    this.chaosState.set('activating');
    await fetch('/api/__dev/chaos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next }),
    });
    this.chaosState.set(next);
  }

  add() {
    const name = this.newName.trim() || `Product-${Date.now()}`;
    this.store.addProduct(name, 0);
  }
}
