# StockSage app styles

## Load order (`index.css`)

1. `tokens.css` — spacing, radius, typography scale (theme-agnostic)
2. `themes.css` — semantic colors for `html.dark` / `html.light`
3. `terminal.css` — layout shell and page components
4. `components/ui/ui.css` — shared UI primitives

## Mood

**Warm Graphite Desk** — warm charcoal surfaces, steel accent (`#9eb4ce` dark / `#4d647a` light). Gain/loss tokens unchanged for market data.

## Semantic colors

| Token | Use |
|-------|-----|
| `--color-accent` | Brand, links, nav active, primary buttons, focus rings |
| `--color-gain` / `--color-loss` | Market direction, P&L, live pulse — **not** brand |
| `--color-text` / `--color-text-secondary` | Body and labels |
| `--color-surface` / `--color-surface-elevated` | Cards and table headers |

## Do / don't

- **Do** use `var(--color-*)` or legacy `var(--t-*)` (aliases) in app CSS.
- **Don't** use green (`--color-gain`) for navigation or CTAs.
- **Don't** hardcode hex in new styles; add a token in `themes.css` if needed.

## Legacy

`--t-green` maps to `--color-gain`. Prefer `--color-gain` in new code.

## Marketing pages

- `pages/login.css` and `pages/landing.css` consume the same `--color-*` tokens as the app (`themes.css`).
- Landing keeps `ln-*` class names; `.ln-root` maps local aliases (`--bg`, `--up`, …) to semantic tokens.
- CTAs use `--color-accent`; gain/loss only for quotes, charts, and ticker movement.
