import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools } from '@hypertheory-labs/stellar-ng-devtools';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

export const TodosStore = signalStore(
  { providedIn: 'root' },
  withState({
    todos: [] as Todo[],
    loading: false,
    error: null as string | null,
  }),
  withStellarDevtools('TodosStore', {
    description: 'Manages the todo list — fetch from jsonplaceholder, add, toggle completion. Exercises HTTP monitoring and causal linking.',
    sourceHint: 'apps/demo-ng/src/app/todos.store.ts',
  }),
  withMethods(store => ({
    async load() {
      patchState(store, { loading: true, error: null });
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=8');
        const todos: Todo[] = await res.json();
        patchState(store, { todos, loading: false });
      } catch (err) {
        patchState(store, { loading: false, error: 'Failed to load todos' });
      }
    },

    async addTodo(title: string) {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, completed: false, userId: 1 }),
      });
      const todo: Todo = await res.json();
      // jsonplaceholder always returns id: 201 — give it a local unique id for display
      patchState(store, s => ({
        todos: [...s.todos, { ...todo, id: Date.now() }],
      }));
    },

    toggleTodo(id: number) {
      patchState(store, s => ({
        todos: s.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t),
      }));
    },

    clearCompleted() {
      patchState(store, s => ({
        todos: s.todos.filter(t => !t.completed),
      }));
    },
  })),
);
