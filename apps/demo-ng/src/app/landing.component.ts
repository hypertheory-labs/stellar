import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <div class="grid gap-12 max-w-2xl mx-auto">

      <!-- Hero -->
      <div class="pt-4">
        <h1 class="text-3xl font-bold tracking-tight mb-2">✦ Stellar Devtools</h1>
        <p class="text-base-content/60 text-base leading-relaxed">
          An in-browser devtool for NgRx Signal Store. Inspect state, trace HTTP causality,
          and export structured context for AI coding assistants — without leaving your app.
        </p>
        <a href="https://stellar.hypertheory-labs.dev" target="_blank" rel="noopener"
           class="btn btn-sm btn-outline mt-4">Read the docs ↗</a>
      </div>

      <!-- Start here -->
      <div>
        <h2 class="text-lg font-semibold mb-4">Start here</h2>
        <ol class="grid gap-6">

          <li class="flex gap-4">
            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-content
                         flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <p class="font-medium mb-0.5">Open the overlay</p>
              <p class="text-sm text-base-content/60">
                Click the <strong>✦</strong> button in the bottom-right corner of this page.
                The overlay is mounted inside the demo app — no browser extension needed.
              </p>
            </div>
          </li>

          <li class="flex gap-4">
            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-content
                         flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <p class="font-medium mb-0.5">Explore the Basics tab</p>
              <p class="text-sm text-base-content/60">
                Head to <a routerLink="/basics" class="link link-primary">Basics</a> and interact
                with the Counter, User, Books, or Todos stores. Pick a store in the overlay — state
                updates live as you click.
              </p>
            </div>
          </li>

          <li class="flex gap-4">
            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-content
                         flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <p class="font-medium mb-0.5">Try the console API</p>
              <p class="text-sm text-base-content/60 mb-2">
                Open the browser console and run:
              </p>
              <div class="grid gap-1.5">
                <code class="block bg-base-300 rounded px-3 py-1.5 text-xs font-mono">
                  window.__stellarDevtools.snapshot('Counter')
                </code>
                <code class="block bg-base-300 rounded px-3 py-1.5 text-xs font-mono">
                  window.__stellarDevtools.describe()
                </code>
              </div>
              <p class="text-xs text-base-content/50 mt-1.5">
                <code>describe()</code> returns a structured manifest — store names, descriptions,
                snapshot counts — formatted for an AI coding assistant.
              </p>
            </div>
          </li>

          <li class="flex gap-4">
            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-content
                         flex items-center justify-center text-sm font-bold">4</span>
            <div>
              <p class="font-medium mb-0.5">Record a session and hand it to an AI</p>
              <p class="text-sm text-base-content/60">
                Head to <a routerLink="/ai-collaboration" class="link link-primary">AI Collaboration</a>
                for guided scenarios. Each one includes a suggested prompt to paste alongside the
                recording output — so you can see what Stellar + an AI assistant can do together.
              </p>
            </div>
          </li>

        </ol>
      </div>

      <!-- Quick links -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <a routerLink="/basics"
           class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
          <div class="card-body py-3 px-4">
            <p class="font-medium text-sm">Basics</p>
            <p class="text-xs text-base-content/50">Simple stores</p>
          </div>
        </a>
        <a routerLink="/outbox"
           class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
          <div class="card-body py-3 px-4">
            <p class="font-medium text-sm">Outbox</p>
            <p class="text-xs text-base-content/50">Async mutations</p>
          </div>
        </a>
        <a routerLink="/sanitize"
           class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
          <div class="card-body py-3 px-4">
            <p class="font-medium text-sm">Sanitization</p>
            <p class="text-xs text-base-content/50">Safe AI export</p>
          </div>
        </a>
        <a routerLink="/ai-collaboration"
           class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
          <div class="card-body py-3 px-4">
            <p class="font-medium text-sm">AI Collaboration</p>
            <p class="text-xs text-base-content/50">Guided scenarios</p>
          </div>
        </a>
      </div>

    </div>
  `,
})
export class LandingComponent {}
