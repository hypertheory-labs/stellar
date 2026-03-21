import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { StellarOverlayComponent } from '@hypertheory/stellar-ng-devtools';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, RouterLinkActive, StellarOverlayComponent],
  template: `
    <div class="min-h-screen bg-base-100">
      <div class="navbar bg-base-200 shadow-sm px-6">
        <div class="flex-1">
          <span class="text-xl font-semibold tracking-tight">✦ Stellar Devtools</span>
          <span class="badge badge-outline badge-sm ml-3">demo</span>
        </div>
        <nav class="flex gap-1">
          <a routerLink="/" routerLinkActive="btn-active" [routerLinkActiveOptions]="{ exact: true }"
             class="btn btn-ghost btn-sm">Home</a>
          <a routerLink="/sanitize" routerLinkActive="btn-active"
             class="btn btn-ghost btn-sm">Sanitization</a>
        </nav>
      </div>

      <main class="max-w-4xl mx-auto p-8">
        <router-outlet />
      </main>

      <footer class="text-center text-base-content/40 text-xs pb-6">
        Open <strong>✦ Stellar</strong> in the bottom-right corner to inspect store state.
      </footer>
    </div>

    <stellar-overlay />
  `,
})
export class App {}
