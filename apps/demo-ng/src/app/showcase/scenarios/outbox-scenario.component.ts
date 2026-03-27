import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductsStore } from '../../products.store';

@Component({
  selector: 'app-outbox-scenario',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="grid gap-6">

      <!-- Header -->
      <div class="flex items-start gap-3">
        <a routerLink="/ai-collaboration" class="btn btn-ghost btn-sm btn-square mt-0.5">←</a>
        <div>
          <h1 class="text-xl font-bold">Outbox pattern — concurrent mutations</h1>
          <p class="text-sm text-base-content/60 mt-0.5">
            Each addition lands in the outbox immediately, then drains as the response arrives.
            Add several quickly to see multiple requests in flight simultaneously.
          </p>
        </div>
      </div>

      <!-- Instructions -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body py-4">
          <h2 class="font-semibold text-sm mb-3">How to run this demo</h2>
          <ol class="text-sm text-base-content/70 grid gap-2 list-none">
            <li><span class="badge badge-neutral badge-sm mr-2">1</span>Open the Stellar overlay (bottom-right ✦) and click <strong>⏺ Rec</strong></li>
            <li><span class="badge badge-neutral badge-sm mr-2">2</span>Click <strong>Add product</strong> 3–4 times in rapid succession without waiting</li>
            <li><span class="badge badge-neutral badge-sm mr-2">3</span>Watch the outbox count grow, then drain as each response arrives</li>
            <li><span class="badge badge-neutral badge-sm mr-2">4</span>Click <strong>⏹ Stop &amp; Export</strong> in the overlay</li>
            <li><span class="badge badge-neutral badge-sm mr-2">5</span>In the timeline view, click <strong>Copy for AI</strong> and paste with the prompt below</li>
          </ol>
          <div class="divider my-2"></div>
          <p class="text-xs text-base-content/50 font-mono leading-relaxed">
            This recording includes multiple in-flight requests that overlapped. Do you see any evidence
            of a race condition — state updates applied out of order, or one response overwriting another?
          </p>
        </div>
      </div>

      <!-- Add form -->
      <div class="card bg-base-200">
        <div class="card-body">
          <div class="flex items-center gap-3 mb-1">
            <h2 class="card-title text-base flex-1">Products</h2>
            @if (store.loading()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            @if (store.hasPending()) {
              <span class="badge badge-warning">{{ store.outbox().length }} in-flight</span>
            }
          </div>

          <div class="flex gap-2 flex-wrap">
            <input class="input input-sm input-bordered flex-1 min-w-36"
                   placeholder="Name"
                   [(ngModel)]="newName" />
            <input class="input input-sm input-bordered w-24"
                   type="number"
                   placeholder="Price"
                   [(ngModel)]="newPrice" />
            <button class="btn btn-sm btn-primary" (click)="add()">Add product</button>
            <button class="btn btn-sm btn-ghost" (click)="store.load()">Reload</button>
          </div>
          <p class="text-xs text-base-content/40">
            Each request takes ~1.5s. Clicking rapidly creates overlapping in-flight requests.
          </p>
        </div>
      </div>

      <!-- Product list -->
      <div class="card bg-base-200">
        <div class="card-body py-3">
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
                No products yet — click Reload or Add product.
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- Outbox -->
      @if (store.hasPending()) {
        <div class="card bg-base-200 border border-warning/40">
          <div class="card-body py-3">
            <h3 class="text-sm font-semibold text-warning mb-2">In-flight mutations</h3>
            <ul class="grid gap-1">
              @for (entry of store.outbox(); track entry.id) {
                <li class="flex items-center gap-2 text-sm">
                  <span class="loading loading-spinner loading-xs text-warning"></span>
                  <span class="badge badge-outline badge-xs">{{ entry.kind }}</span>
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
            <h3 class="text-sm font-semibold text-error mb-2">Failed mutations</h3>
            <ul class="grid gap-1">
              @for (letter of store.deadLetters(); track letter.id) {
                <li class="flex items-center gap-2 text-sm">
                  <span class="badge badge-error badge-xs">{{ letter.kind }}</span>
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
export class OutboxScenarioComponent {
  readonly store = inject(ProductsStore);

  newName = 'Widget';
  newPrice = 0;

  add() {
    const name = this.newName.trim() || `Product-${Date.now()}`;
    this.store.addProduct(name, this.newPrice);
  }
}
