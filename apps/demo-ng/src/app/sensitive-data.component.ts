import { Component, inject } from '@angular/core';
import { SensitiveDataStore } from './sensitive-data.store';

@Component({
  selector: 'app-sensitive-data',
  template: `
    <div class="grid gap-6">

      <div>
        <h2 class="text-2xl font-semibold mb-1">Sanitization Demo</h2>
        <p class="text-base-content/60 text-sm">
          Each field in <code class="text-primary">SensitiveDataStore</code> uses a different
          sanitization rule. Open <strong>✦ Stellar</strong> and select the store to see the
          sanitized output — the table below shows the raw values before sanitization.
        </p>
      </div>

      <div class="card bg-base-200">
        <div class="card-body p-0">
          <table class="table table-sm">
            <thead>
              <tr class="text-base-content/50">
                <th>Field</th>
                <th>Raw value (in state)</th>
                <th>Rule applied in devtools</th>
              </tr>
            </thead>
            <tbody>

              <tr class="border-t border-base-300">
                <td colspan="3" class="text-xs text-base-content/40 pt-3 pb-1 font-semibold uppercase tracking-widest">
                  Primitive operators
                </td>
              </tr>
              <tr>
                <td><code>sessionToken</code></td>
                <td class="font-mono text-xs text-warning/80 max-w-xs truncate">{{ store.sessionToken() }}</td>
                <td><span class="badge badge-sm badge-error">'omitted'</span> key removed entirely</td>
              </tr>
              <tr>
                <td><code>internalNote</code></td>
                <td class="font-mono text-xs text-warning/80 max-w-xs truncate">{{ store.internalNote() }}</td>
                <td><span class="badge badge-sm badge-warning">'redacted'</span> → [redacted]</td>
              </tr>
              <tr>
                <td><code>pinCode</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.pinCode() }}</td>
                <td><span class="badge badge-sm badge-warning">'masked'</span> → ****</td>
              </tr>

              <tr class="border-t border-base-300">
                <td colspan="3" class="text-xs text-base-content/40 pt-3 pb-1 font-semibold uppercase tracking-widest">
                  Semantic aliases
                </td>
              </tr>
              <tr>
                <td><code>ssn</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.ssn() }}</td>
                <td><span class="badge badge-sm badge-error">'ssn'</span> → [redacted]</td>
              </tr>
              <tr>
                <td><code>password</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.password() }}</td>
                <td><span class="badge badge-sm badge-warning">'password'</span> → masked</td>
              </tr>
              <tr>
                <td><code>apiKey</code></td>
                <td class="font-mono text-xs text-warning/80 max-w-xs truncate">{{ store.apiKey() }}</td>
                <td><span class="badge badge-sm badge-info">'apiKey'</span> → [~hash] correlation token</td>
              </tr>
              <tr>
                <td><code>creditCard</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.creditCard() }}</td>
                <td><span class="badge badge-sm badge-neutral">'creditCard'</span> → last four digits</td>
              </tr>
              <tr>
                <td><code>email</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.email() }}</td>
                <td><span class="badge badge-sm badge-neutral">'emailAddress'</span> → jo***&#64;example.com</td>
              </tr>

              <tr class="border-t border-base-300">
                <td colspan="3" class="text-xs text-base-content/40 pt-3 pb-1 font-semibold uppercase tracking-widest">
                  Parameterized operators
                </td>
              </tr>
              <tr>
                <td><code>userId</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.userId() }}</td>
                <td><span class="badge badge-sm badge-neutral">keepFirst(8)</span> preserve ID prefix</td>
              </tr>
              <tr>
                <td><code>orderRef</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.orderRef() }}</td>
                <td><span class="badge badge-sm badge-neutral">keepLast(6)</span> preserve short suffix</td>
              </tr>
              <tr>
                <td><code>notes</code></td>
                <td class="font-mono text-xs text-warning/80 max-w-xs truncate">{{ store.notes() }}</td>
                <td><span class="badge badge-sm badge-neutral">truncate(40)</span> cap freeform text</td>
              </tr>

              <tr class="border-t border-base-300">
                <td colspan="3" class="text-xs text-base-content/40 pt-3 pb-1 font-semibold uppercase tracking-widest">
                  Structural
                </td>
              </tr>
              <tr>
                <td><code>paymentMethods</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.paymentMethods().length }} item(s)</td>
                <td>
                  <span class="badge badge-sm badge-neutral">arrayOf</span>
                  cardNumber → lastFour, expiry → omitted
                </td>
              </tr>
              <tr>
                <td><code>profile.displayName</code></td>
                <td class="font-mono text-xs">{{ store.profile().displayName }}</td>
                <td class="text-base-content/40">— untouched</td>
              </tr>
              <tr>
                <td><code>profile.dateOfBirth</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.profile().dateOfBirth }}</td>
                <td><span class="badge badge-sm badge-error">'omitted'</span> key removed</td>
              </tr>
              <tr>
                <td><code>profile.phone</code></td>
                <td class="font-mono text-xs text-warning/80">{{ store.profile().phone }}</td>
                <td><span class="badge badge-sm badge-neutral">'phoneNumber'</span> → last four digits</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      <div class="flex gap-3 flex-wrap">
        <button class="btn btn-sm btn-primary" (click)="store.cycleApiKey()">
          Cycle API key <span class="opacity-60 ml-1">— watch hash stay consistent</span>
        </button>
        <button class="btn btn-sm btn-outline" (click)="store.addPaymentMethod()">
          + Add payment method
        </button>
        <button class="btn btn-sm btn-ghost" (click)="store.reset()">Reset</button>
      </div>

    </div>
  `,
})
export class SensitiveDataComponent {
  readonly store = inject(SensitiveDataStore);
}
