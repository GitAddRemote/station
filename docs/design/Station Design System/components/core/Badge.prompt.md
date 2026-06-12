**Badge** — a small mono-cased pill for status and category labels; use it for fleet readiness, contract states, plan tiers, and inline tags.

```jsx
<Badge tone="success">Ready</Badge>
<Badge tone="brand" variant="solid">Most popular</Badge>
<Badge tone="warm">Payout due</Badge>
```

- `tone`: `brand` · `warm` · `success` · `warning` · `danger` · `neutral`.
- `variant`: `soft` (tinted, default) · `solid` (filled).
- Token-driven; pairs naturally inside table rows, cards, and nav.
