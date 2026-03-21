import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools, sanitizeConfig } from '@hypertheory/stellar-ng-devtools';

export interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
  genre: string;
  rating: number;
  read: boolean;
}

const initialBooks: Book[] = [
  { id: 1, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', year: 1999, genre: 'Tech', rating: 5, read: true },
  { id: 2, title: 'Clean Code', author: 'Robert C. Martin', year: 2008, genre: 'Tech', rating: 4, read: true },
  { id: 3, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', year: 2017, genre: 'Tech', rating: 5, read: false },
  { id: 4, title: 'A Fire Upon the Deep', author: 'Vernor Vinge', year: 1992, genre: 'Sci-Fi', rating: 5, read: true },
  { id: 5, title: 'Project Hail Mary', author: 'Andy Weir', year: 2021, genre: 'Sci-Fi', rating: 5, read: false },
];

export interface BooksState {
  books: Book[];
  selectedId: number | null;
  filterGenre: string | null;
  searchQuery: string;
  loading: boolean;
}

export const BooksStore = signalStore(
  { providedIn: 'root' },
  withState<BooksState>({
    books: initialBooks,
    selectedId: null,
    filterGenre: null,
    searchQuery: '',
    loading: false,
  }),
  withStellarDevtools('BooksStore', {
    sanitize: sanitizeConfig<BooksState>({
      searchQuery: 'omitted',
    }),
  }),
  withMethods(store => ({
    select(id: number) { patchState(store, { selectedId: id }); },
    clearSelection() { patchState(store, { selectedId: null }); },
    setFilter(genre: string | null) { patchState(store, { filterGenre: genre }); },
    setSearch(query: string) { patchState(store, { searchQuery: query }); },
    markRead(id: number) {
      patchState(store, s => ({
        books: s.books.map(b => b.id === id ? { ...b, read: true } : b),
      }));
    },
    addBook(book: Omit<Book, 'id'>) {
      patchState(store, s => ({
        books: [...s.books, { ...book, id: s.books.length + 1 }],
      }));
    },
  })),
);
