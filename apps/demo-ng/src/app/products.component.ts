import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductsStore } from './products.store';

@Component({
  selector: 'app-products',
  imports: [FormsModule],
  template: `
    <div class="grid gap-8">

      <!-- Controls -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">
            Products
            @if (store.loading()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            @if (store.hasPending()) {
              <span class="badge badge-warning badge-sm">{{ store.outbox().length }} pending</span>
            }
          </h2>

          <!-- Add form -->
          <div class="flex gap-2 mt-2 flex-wrap">
            <input class="input input-sm input-bordered flex-1 min-w-40"
                   placeholder="Name"
                   [(ngModel)]="newName" />
            <input class="input input-sm input-bordered w-28"
                   type="number"
                   placeholder="Price"
                   [(ngModel)]="newPrice" />
            <button class="btn btn-sm btn-primary"
                    (click)="add()">Add product</button>
            <button class="btn btn-sm btn-ghost" (click)="store.load()">Reload</button>
          </div>

          <!-- Tip for demo -->
          <p class="text-xs text-base-content/40 mt-1">
            Each mutation takes ~800ms. Add several quickly to see parallel in-flight requests.
          </p>
        </div>
      </div>

      <!-- Product list -->
      <div class="card bg-base-200">
        <div class="card-body">
          <ul class="divide-y divide-base-300">
            @for (product of store.products(); track product.id) {
              <li class="py-2 flex items-center gap-3" [class.opacity-50]="isPendingDelete(product.id)">
                @if (editingId() === product.id) {
                  <input class="input input-xs input-bordered flex-1"
                         [(ngModel)]="editName" />
                  <input class="input input-xs input-bordered w-24"
                         type="number"
                         [(ngModel)]="editPrice" />
                  <button class="btn btn-xs btn-primary" (click)="saveEdit(product.id)">Save</button>
                  <button class="btn btn-xs btn-ghost" (click)="cancelEdit()">Cancel</button>
                } @else {
                  <span class="flex-1 font-medium">
                    {{ product.name }}
                    @if (isPendingUpdate(product.id)) {
                      <span class="badge badge-warning badge-xs ml-1">updating…</span>
                    }
                    @if (isPendingDelete(product.id)) {
                      <span class="badge badge-error badge-xs ml-1">deleting…</span>
                    }
                  </span>
                  <span class="text-base-content/60 text-sm">\${{ product.price }}</span>
                  <button class="btn btn-xs btn-ghost" (click)="startEdit(product)">Edit</button>
                  <button class="btn btn-xs btn-error btn-ghost"
                          [disabled]="isPendingDelete(product.id)"
                          (click)="store.deleteProduct(product.id)">Delete</button>
                }
              </li>
            } @empty {
              <li class="py-4 text-center text-base-content/40 text-sm">
                No products. Click Reload or Add product.
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- Outbox (in-flight) -->
      @if (store.hasPending()) {
        <div class="card bg-base-200 border border-warning/30">
          <div class="card-body py-3">
            <h3 class="font-semibold text-sm text-warning">In-flight mutations</h3>
            <ul class="divide-y divide-base-300">
              @for (entry of store.outbox(); track entry.id) {
                <li class="py-1.5 flex items-center gap-2 text-sm">
                  <span class="loading loading-spinner loading-xs text-warning"></span>
                  <span class="badge badge-outline badge-xs">{{ entry.kind }}</span>
                  <span>{{ entry.name }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      }

      <!-- Dead letters -->
      @if (store.hasErrors()) {
        <div class="card bg-base-200 border border-error/30">
          <div class="card-body py-3">
            <h3 class="font-semibold text-sm text-error">Failed mutations</h3>
            <ul class="divide-y divide-base-300">
              @for (letter of store.deadLetters(); track letter.id) {
                <li class="py-1.5 flex items-center gap-2 text-sm">
                  <span class="badge badge-error badge-xs">{{ letter.kind }}</span>
                  <span class="flex-1">{{ letter.name }}</span>
                  <span class="text-error/60 text-xs">{{ letter.error }}</span>
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
export class ProductsComponent {
  readonly store = inject(ProductsStore);

  newName = 'Sample-Data';
  newPrice = 0;

  editingId = signal<string | null>(null);
  editName = '';
  editPrice = 0;

  add() {
    const name = this.newName.trim() || `Product-${Date.now()}`;
    this.store.addProduct(name, this.newPrice);
  }

  startEdit(product: { id: string; name: string; price: number }) {
    this.editingId.set(product.id);
    this.editName = product.name;
    this.editPrice = product.price;
  }

  saveEdit(id: string) {
    this.store.updateProduct(id, this.editName, this.editPrice);
    this.editingId.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  isPendingDelete(id: string) {
    return this.store.outbox().some(e => e.kind === 'deletion' && e.body === id);
  }

  isPendingUpdate(id: string) {
    return this.store.outbox().find(
      e => e.kind === 'update' && (e.body as { id: string }).id === id
    );
  }
}
