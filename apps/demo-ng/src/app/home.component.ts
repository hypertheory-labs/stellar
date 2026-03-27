import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CounterStore, counterEvents } from './counter.store';
import { UserStore } from './user.store';
import { BooksStore } from './books.store';
import { TodosStore } from './todos.store';
import { injectDispatch } from '@ngrx/signals/events';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  template: `
    <div class="grid gap-8">

      <div>
        <h1 class="text-2xl font-bold mb-1">Basics</h1>
        <p class="text-base-content/60 text-sm max-w-2xl">
          Four simple stores — Counter, User, Books, and Todos — wired up with
          <code class="text-primary">withStellarDevtools()</code>.
          Open <strong>✦ Stellar</strong> in the bottom-right, pick a store, and interact.
          Todos also exercises HTTP monitoring: load the list to see fetch events appear in the overlay.
        </p>
      </div>

      <!-- Counter -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">Counter</h2>
          <p class="text-5xl font-mono font-bold my-2">{{ counter.count() }}</p>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-sm" (click)="dispatch.decrement()">−</button>
            <button class="btn btn-sm" (click)="dispatch.increment()">+</button>
            <button class="btn btn-sm btn-ghost" (click)="dispatch.reset()">Reset</button>
          </div>
        </div>
      </div>

      <!-- User -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">User</h2>
          <div class="flex items-center gap-3 my-2">
            <div class="avatar placeholder">
              <div class="bg-neutral text-neutral-content w-10 rounded-full">
                <span>{{ counter.count() % 2 === 0 ? 'J' : 'B' }}</span>
              </div>
            </div>
            <div>
              <p class="font-medium">{{ user.name() }}</p>
              <span class="badge badge-sm" [class]="user.loggedIn() ? 'badge-success' : 'badge-ghost'">
                {{ user.loggedIn() ? 'Logged in' : 'Logged out' }}
              </span>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap mt-2">
            <button class="btn btn-sm btn-primary" (click)="user.login()">Login</button>
            <button class="btn btn-sm btn-ghost" (click)="user.logout()">Logout</button>
            <button class="btn btn-sm btn-ghost" (click)="user.setName('Bob')">Set name → Bob</button>
          </div>
        </div>
      </div>

      <!-- Books -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">Books</h2>
          <div class="flex gap-2 flex-wrap my-2">
            <input class="input input-sm input-bordered flex-1 min-w-48"
                   placeholder="Search…"
                   (input)="books.setSearch($any($event.target).value)" />
            <button class="btn btn-sm btn-ghost" (click)="books.setFilter('Tech')">Tech</button>
            <button class="btn btn-sm btn-ghost" (click)="books.setFilter('Sci-Fi')">Sci-Fi</button>
            <button class="btn btn-sm btn-ghost" (click)="books.setFilter(null)">All</button>
          </div>

          <p class="text-sm text-base-content/50">
            Selected ID: <code>{{ books.selectedId() ?? 'none' }}</code>
          </p>

          <ul class="divide-y divide-base-300 mt-2">
            @for (book of books.books(); track book.id) {
              <li class="py-2 flex items-center gap-3"
                  [class.opacity-50]="books.selectedId() !== null && books.selectedId() !== book.id">
                <button class="flex-1 text-left" (click)="books.select(book.id)">
                  <span class="font-medium">{{ book.title }}</span>
                  <span class="text-base-content/50 text-sm ml-2">{{ book.author }}, {{ book.year }}</span>
                </button>
                <span class="badge badge-sm">{{ book.genre }}</span>
                @if (book.read) {
                  <span class="badge badge-sm badge-success">read</span>
                } @else {
                  <button class="btn btn-xs btn-ghost" (click)="books.markRead(book.id)">Mark read</button>
                }
              </li>
            }
          </ul>

          <div class="card-actions mt-4">
            <button class="btn btn-sm btn-outline"
                    (click)="books.addBook({ title: 'New Book', author: 'Someone', year: 2026, genre: 'Tech', rating: 3, read: false })">
              + Add book
            </button>
          </div>
        </div>
      </div>

      <!-- Todos (jsonplaceholder — exercises HTTP monitoring) -->
      <div class="card bg-base-200">
        <div class="card-body">
          <h2 class="card-title">
            Todos
            @if (todos.loading()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
          </h2>

          @if (todos.error()) {
            <div class="alert alert-error text-sm py-2">{{ todos.error() }}</div>
          }

          @if (todos.todos().length === 0 && !todos.loading()) {
            <p class="text-sm text-base-content/50">No todos loaded yet.</p>
          } @else {
            <ul class="divide-y divide-base-300 my-2 max-h-48 overflow-y-auto">
              @for (todo of todos.todos(); track todo.id) {
                <li class="py-1.5 flex items-center gap-2">
                  <input type="checkbox" class="checkbox checkbox-xs"
                         [checked]="todo.completed"
                         (change)="todos.toggleTodo(todo.id)" />
                  <span class="text-sm flex-1" [class.line-through]="todo.completed"
                        [class.opacity-40]="todo.completed">
                    {{ todo.title }}
                  </span>
                </li>
              }
            </ul>
          }

          <div class="flex gap-2 mt-2 flex-wrap">
            <button class="btn btn-sm btn-primary" (click)="todos.load()">Load todos</button>
            <div class="flex gap-1 flex-1 min-w-48">
              <input class="input input-sm input-bordered flex-1"
                     placeholder="New todo…"
                     [(ngModel)]="todoInput" />
              <button class="btn btn-sm"
                      [disabled]="!todoInput.trim()"
                      (click)="todos.addTodo(todoInput); todoInput = ''">Add</button>
            </div>
            @if (todos.todos().some(t => t.completed)) {
              <button class="btn btn-sm btn-ghost" (click)="todos.clearCompleted()">
                Clear completed
              </button>
            }
          </div>
        </div>
      </div>

    </div>
  `,
})
export class HomeComponent {
  readonly counter = inject(CounterStore);
  readonly dispatch = injectDispatch(counterEvents);
  readonly user = inject(UserStore);
  readonly books = inject(BooksStore);
  readonly todos = inject(TodosStore);
  todoInput = '';
}
