import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { withStellarDevtools, sanitizeConfig } from '@hypertheory/stellar-ng-devtools';
import { keepFirst, keepLast, truncate, arrayOf } from '@hypertheory/sanitize';

export interface PaymentMethod {
  label: string;
  cardNumber: string;
  expiry: string;
}

export interface SensitiveDataState {
  // --- Primitive operators ---
  sessionToken: string;   // 'omitted'   — key disappears entirely from devtools
  internalNote: string;   // 'redacted'  — value replaced with [redacted]
  pinCode: string;        // 'masked'    — ****

  // --- Semantic aliases ---
  ssn: string;            // 'ssn'          → redacted
  password: string;       // 'password'     → masked
  apiKey: string;         // 'apiKey'       → hashed correlation token
  creditCard: string;     // 'creditCard'   → lastFour
  email: string;          // 'emailAddress' → jo***@example.com

  // --- Parameterized operators ---
  userId: string;         // keepFirst(8)  — preserve ID prefix for debugging
  orderRef: string;       // keepLast(6)   — preserve short suffix
  notes: string;          // truncate(40)  — cap long freeform text

  // --- Structural: arrayOf() ---
  paymentMethods: PaymentMethod[];  // arrayOf: card number → lastFour, expiry → omitted

  // --- Nested object ---
  profile: {
    displayName: string;  // untouched
    dateOfBirth: string;  // 'omitted'
    phone: string;        // 'phoneNumber' → lastFour
  };
}

const initialState: SensitiveDataState = {
  sessionToken: 'tok_live_8f3kQz9mNpR7wX2',
  internalNote: 'Created via admin bypass — do not expose',
  pinCode: '7291',

  ssn: '555-12-6789',
  password: 'h0rse-b@ttery-st@ple',
  apiKey: 'sk-prod-4Xm9qRzLpN8wK3jY',
  creditCard: '4111111111114567',
  email: 'jeffry.gonzalez@example.com',

  userId: 'usr-ab3f-7c9d-4e12-8b56',
  orderRef: 'ORD-2026-03-XYZ-001122',
  notes: 'Customer called twice about delayed shipment. Escalated to tier 2 on second contact. Follow-up scheduled.',

  paymentMethods: [
    { label: 'Visa ending 4567',       cardNumber: '4111111111114567', expiry: '12/27' },
    { label: 'Mastercard ending 8888', cardNumber: '5500005555555559', expiry: '09/26' },
  ],

  profile: {
    displayName: 'Jeff G.',
    dateOfBirth: '1983-07-14',
    phone: '555-867-5309',
  },
};

export const SensitiveDataStore = signalStore(
  { providedIn: 'root' },
  withState<SensitiveDataState>(initialState),
  withStellarDevtools('SensitiveDataStore', {
    sanitize: sanitizeConfig<SensitiveDataState>({
      // Primitive operators
      sessionToken: 'omitted',
      internalNote: 'redacted',
      pinCode:      'masked',

      // Semantic aliases
      ssn:        'ssn',
      password:   'password',
      apiKey:     'apiKey',
      creditCard: 'creditCard',
      email:      'emailAddress',

      // Parameterized operators
      userId:   keepFirst(8),
      orderRef: keepLast(6),
      notes:    truncate(40),

      // Structural: each payment method → card number lastFour, expiry gone
      paymentMethods: arrayOf({
        cardNumber: 'lastFour',
        expiry:     'omitted',
      }),

      // Nested: hide DOB entirely, show last 4 of phone
      profile: {
        dateOfBirth: 'omitted',
        phone:       'phoneNumber',
      },
    }),
  }),
  withMethods(store => ({
    cycleApiKey() {
      const keys = [
        'sk-prod-4Xm9qRzLpN8wK3jY',
        'sk-prod-9Zp2mQxRkN5vL8wH',
        'sk-prod-1Bn7jYtMpQ3rX6kC',
      ];
      const current = keys.indexOf(store.apiKey());
      patchState(store, { apiKey: keys[(current + 1) % keys.length] });
    },
    updateNotes(notes: string) { patchState(store, { notes }); },
    addPaymentMethod() {
      patchState(store, s => ({
        paymentMethods: [
          ...s.paymentMethods,
          { label: 'Amex ending 0005', cardNumber: '378282246310005', expiry: '06/28' },
        ],
      }));
    },
    reset() { patchState(store, initialState); },
  })),
);
