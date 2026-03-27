import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Scenario {
  slug: string;
  label: string;
  description: string;
  prompt: string;
  status: 'ready' | 'coming-soon';
}

@Component({
  selector: 'app-showcase-home',
  imports: [RouterLink],
  template: `
    <div class="grid gap-8">
      <div>
        <h1 class="text-2xl font-bold mb-1">AI Collaboration</h1>
        <p class="text-base-content/60 text-sm max-w-2xl">
          Each scenario is a reproducible demo. Start recording in the Stellar overlay,
          perform the interaction, stop — then paste the <strong>Copy for AI</strong> output
          with the suggested prompt into any AI coding assistant.
        </p>
      </div>

      <div class="grid gap-4">
        @for (scenario of scenarios; track scenario.slug) {
          <div class="card bg-base-200">
            <div class="card-body py-4 px-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <h2 class="font-semibold text-base mb-0.5">{{ scenario.label }}</h2>
                  <p class="text-sm text-base-content/60 mb-3">{{ scenario.description }}</p>
                  <div class="bg-base-300 rounded p-3 text-xs font-mono text-base-content/70 leading-relaxed">
                    <span class="text-base-content/40 mr-2">Prompt →</span>{{ scenario.prompt }}
                  </div>
                </div>
                <div class="flex-shrink-0 mt-1">
                  @if (scenario.status === 'ready') {
                    <a [routerLink]="['/ai-collaboration', scenario.slug]"
                       class="btn btn-sm btn-primary">Run demo</a>
                  } @else {
                    <span class="badge badge-outline badge-sm">Coming soon</span>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ShowcaseHomeComponent {
  readonly scenarios: Scenario[] = [
    {
      slug: 'outbox',
      label: 'Outbox pattern — concurrent mutations',
      description:
        'Add multiple products in rapid succession. Each mutation lands in the outbox immediately, then drains as responses arrive. Useful for verifying optimistic updates stay consistent under overlapping in-flight requests.',
      prompt:
        'This recording includes multiple in-flight requests that overlapped. Do you see any evidence of a race condition — state updates applied out of order, or one response overwriting another?',
      status: 'ready',
    },
    {
      slug: 'race-condition',
      label: 'Race condition — stale closure bug',
      description:
        'Enable chaos mode, then add two products quickly. The first request gets a longer delay so the second resolves first — exposing a stale-closure bug in the naïve store that silently loses an addition.',
      prompt:
        'Looking at the causal graph, do you see evidence of a race condition? How many products should exist after both requests resolved, and how many actually do?',
      status: 'ready',
    },
    {
      slug: 'error-path',
      label: 'Error path — dead letters',
      description:
        'Enable chaos mode to force 500 errors on mutations. Watch the outbox pattern move failed entries to dead letters instead of products. Useful for verifying error handling is complete.',
      prompt:
        'This recording shows a failed mutation. Does the recording confirm that the failed request was captured as a dead letter? Is there anything in the state sequence that looks incorrect?',
      status: 'ready',
    },
    {
      slug: 'missing-tests',
      label: 'Missing test coverage',
      description: 'Record a happy-path interaction, then ask the AI what branches in the store code are not exercised.',
      prompt:
        'This recording shows the happy path. Looking at the store code and what this recording exercises, what branches or conditions aren\'t covered? What tests would you write?',
      status: 'coming-soon',
    },
    {
      slug: 'story-card',
      label: 'Story card verification',
      description: 'Record a completed feature interaction and verify it against acceptance criteria.',
      prompt:
        'Here is the story card I was working from, and a recording of me exercising the feature. Does the recording demonstrate that all acceptance criteria are met?',
      status: 'coming-soon',
    },
    {
      slug: 'code-tour',
      label: 'CodeTour generation',
      description: 'Record an interaction across multiple stores and generate a guided code walkthrough from the causal graph.',
      prompt:
        'Generate a CodeTour file (.tours/checkout-flow.tour) that walks a new developer through the code that participated in this recording.',
      status: 'coming-soon',
    },
  ];
}
