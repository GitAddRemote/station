**Button** — the primary call-to-action for Presstronic and Station surfaces; use for the main action in a view, with `ghost`/`subtle` for secondary actions.

```jsx
<Button variant="primary" size="lg" href="#pricing">Launch your org</Button>
<Button variant="ghost">See it in action</Button>
<Button variant="warm" iconLeft={<i data-lucide="rocket" />}>Get Presstronic</Button>
```

- `variant`: `primary` (cornflower-blue brand) · `warm` (coral accent) · `ghost` (outline) · `subtle` (tinted).
- `size`: `sm` · `md` (default) · `lg`.
- Pass `href` to render an `<a>`; otherwise it's a `<button>`. Icons go in `iconLeft` / `iconRight`.
- Fully token-driven — it inherits light/dark and sub-brand automatically.
