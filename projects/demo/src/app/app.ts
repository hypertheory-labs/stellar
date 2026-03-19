import { Component, inject } from '@angular/core';
import { CounterStore } from './counter.store';
import { UserStore } from './user.store';
import { BooksStore } from './books.store';

@Component({
  selector: 'app-root',
  template: `
    <h2>Stellar Devtools Demo</h2>

    <h3>Counter</h3>
    <p>Count: {{ counter.count() }}</p>
    <button (click)="counter.increment()">+</button>
    <button (click)="counter.decrement()">−</button>
    <button (click)="counter.reset()">Reset</button>

    <h3>User</h3>
    <p>{{ user.name() }} — {{ user.loggedIn() ? 'Logged in' : 'Logged out' }}</p>
    <button (click)="user.login()">Login</button>
    <button (click)="user.logout()">Logout</button>
    <button (click)="user.setName('Bob')">Set name to Bob</button>

    <h3>Books</h3>
    <p>
      <input placeholder="search" (input)="books.setSearch($any($event.target).value)" />
      &nbsp;
      <button (click)="books.setFilter('Tech')">Filter: Tech</button>
      <button (click)="books.setFilter('Sci-Fi')">Filter: Sci-Fi</button>
      <button (click)="books.setFilter(null)">Clear filter</button>
    </p>
    <p>Selected ID: {{ books.selectedId() ?? 'none' }}</p>
    <ul>
      @for (book of books.books(); track book.id) {
        <li>
          <b (click)="books.select(book.id)" style="cursor:pointer">{{ book.title }}</b>
          — {{ book.author }} ({{ book.year }})
          @if (!book.read) { <button (click)="books.markRead(book.id)">Mark read</button> }
          @if (book.read) { <span style="color:green">✓ read</span> }
        </li>
      }
    </ul>
    <button (click)="books.addBook({ title: 'New Book', author: 'Someone', year: 2026, genre: 'Tech', rating: 3, read: false })">
      Add book
    </button>

    <p style="color: #888; font-size: 12px; margin-top: 2rem">Click ✦ Stellar in the bottom-right corner to open the devtools.</p>
  `,
})
export class App {
  readonly counter = inject(CounterStore);
  readonly user = inject(UserStore);
  readonly books = inject(BooksStore);
}
