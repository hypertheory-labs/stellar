


## Design notes

### `satisfies` on the handler map — do not remove

```ts
const sanitizationHandlers = {
    omitted: null,
    lastFour: (v: string) => v.slice(-4),
} satisfies Record<string, ((v: string) => string) | null>;
```

`SanitizationRule` is derived as `keyof typeof sanitizationHandlers`. If `satisfies` is replaced with
a type annotation (`: Record<string, ...>`), TypeScript widens the type and `keyof` produces `string`
instead of `'omitted' | 'lastFour'`, breaking the whole config type. `satisfies` validates the shape
while preserving the narrow literal key types.

### Single-element tuple `[config]` for arrays

When a property is an array, the config entry is a **single-element tuple** containing the per-item config:

```ts
sanitized(state, {
    customers: [{ email: 'omitted', creditCard: 'lastFour' }],
//             ^ tuple, not array — signals "map this config over every element"
})
```

A plain object config `{}` means "this property is a nested object — recurse into it."
A string rule like `'omitted'` means "apply this rule to the whole property."
A tuple `[{}]` means "this property is an array — apply the inner config to each element."
