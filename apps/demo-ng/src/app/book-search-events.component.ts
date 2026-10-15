import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { injectDispatch } from '@ngrx/signals/events';
import { bookSearchPageEvents, BookSearchEventsStore } from './book-search-events.store';

@Component({
  selector: 'app-book-search-events',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="grid gap-8 max-w-2xl">

      <div>
        <h1 class="text-2xl font-bold mb-1">NgRx Events — Async Search</h1>
        <p class="text-base-content/60 text-sm max-w-xl">
          Two event groups flow through this store:
          <code class="text-primary">bookSearchPageEvents</code> (dispatched by this component) and
          <code class="text-primary">bookSearchApiEvents</code> (dispatched by the store's async handler).
          Open Stellar and watch each state transition as you type.
        </p>
      </div>

      <div class="card bg-base-200">
        <div class="card-body gap-4">

          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered flex-1"
              placeholder="Search books (2+ characters)…"
              [value]="store.query()"
              (input)="onQueryChange($event)"
            />
            <button class="btn btn-ghost" (click)="dispatch.cleared()">Clear</button>
          </div>

          @if (store.loading()) {
            <div class="flex items-center gap-2 text-base-content/60 text-sm">
              <span class="loading loading-spinner loading-sm"></span>
              Searching Open Library…
            </div>
          }

          @if (store.error()) {
            <div class="alert alert-error text-sm">{{ store.error() }}</div>
          }

          @if (store.results().length > 0) {
            <ul class="grid gap-2">
              @for (book of store.results(); track book.title) {
                <li class="flex justify-between items-start bg-base-300 rounded px-3 py-2">
                  <div>
                    <p class="font-medium text-sm">{{ book.title }}</p>
                    <p class="text-xs text-base-content/60">{{ book.author }}</p>
                  </div>
                  @if (book.year) {
                    <span class="text-xs text-base-content/40 flex-shrink-0 ml-2 mt-0.5">
                      {{ book.year }}
                    </span>
                  }
                </li>
              }
            </ul>
          }

          @if (!store.loading() && !store.error() && store.query().length >= 2 && store.results().length === 0) {
            <p class="text-sm text-base-content/50">No results.</p>
          }

        </div>
      </div>

      <div class="text-xs text-base-content/40 space-y-1">
        <p>Try: <button class="link" (click)="dispatch.queryChanged('pragmatic programmer')">pragmatic programmer</button>
           · <button class="link" (click)="dispatch.queryChanged('design patterns')">design patterns</button>
           · <button class="link" (click)="dispatch.queryChanged('dune')">dune</button>
        </p>
        <p>Results from <a href="https://openlibrary.org" target="_blank" class="link">Open Library</a>.</p>
      </div>

    </div>
  `,
})
export class BookSearchEventsComponent {
  readonly store = inject(BookSearchEventsStore);
  readonly dispatch = injectDispatch(bookSearchPageEvents);

  onQueryChange(e: Event) {
    this.dispatch.queryChanged((e.target as HTMLInputElement).value);
  }
}
