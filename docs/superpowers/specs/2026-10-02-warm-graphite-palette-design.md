# StockSage color system — Warm Graphite Desk

**Date:** 2026-10-02  
**Status:** Approved — implemented  
**Scope:** Replace neutral + accent tokens in `themes.css`. **Do not change** gain/loss market semantics.

---

## Goals

- Full mood shift away from cold blue-gray + sky-blue accent (“generic fintech”).
- Warm, restrained neutrals so existing mint/coral gain/loss feel integrated.
- Single implementation surface: semantic CSS variables (landing, login, app inherit automatically).

## Non-goals

- New fonts, layout, or Phase F features.
- Changing heatmap logic (optional minor hue nudge only if contrast fails QA).
- Reintroducing green/red for brand, nav, or primary CTAs.

---

## Locked tokens (unchanged)

### Dark (`html.dark`, `:root`)

| Token | Value |
|-------|--------|
| `--color-gain` | `#34d399` |
| `--color-gain-muted` | `rgba(52, 211, 153, 0.14)` |
| `--color-loss` | `#f87171` |
| `--color-loss-muted` | `rgba(248, 113, 113, 0.14)` |
| `--color-warning` | `#fbbf24` |

### Light (`html.light`)

| Token | Value |
|-------|--------|
| `--color-gain` | `#047857` |
| `--color-gain-muted` | `rgba(4, 120, 87, 0.12)` |
| `--color-loss` | `#dc2626` |
| `--color-loss-muted` | `rgba(220, 38, 38, 0.1)` |
| `--color-warning` | `#d97706` |

Heatmap step tokens may remain as-is initially; revisit only if WCAG contrast on warm surfaces fails.

---

## New tokens — dark (primary)

| Token | Hex / value | Notes |
|-------|-------------|--------|
| `--color-bg` | `#0e0d0c` | Warm near-black |
| `--color-surface` | `#161514` | Card / sidebar |
| `--color-surface-elevated` | `#1c1b19` | Hover rows, modals |
| `--color-border` | `#2a2826` | Default borders |
| `--color-border-strong` | `#3a3734` | Focus rings, dividers |
| `--color-text` | `#edeae6` | Primary copy |
| `--color-text-secondary` | `#9a9590` | Labels, captions |
| `--color-accent` | `#d4a574` | Brand name, links, primary buttons |
| `--color-accent-muted` | `rgba(212, 165, 116, 0.14)` | Hover fills, selected nav wash |
| `--color-accent-strong` | `rgba(212, 165, 116, 0.24)` | Stronger selection |
| `--color-on-accent` | `#141210` | Text/icons on champagne buttons |
| `--color-on-danger` | `#ffffff` | Unchanged use on loss buttons if any |
| `--color-overlay` | `rgba(10, 9, 8, 0.78)` | Modals |
| `--color-neutral-muted` | `rgba(154, 149, 144, 0.12)` | Subtle chips |

Legacy aliases (`--t-*`) continue to map to `--color-*` as today.

### `--t-muted2`

Update from cool `#64748b` to **`#7a756f`** (warm mid-gray) in dark mode only.

### Accent bright (optional alias)

`--t-accent-bright`: `#e8c9a8` for hover states on links (dark).

---

## New tokens — light

| Token | Hex / value | Notes |
|-------|-------------|--------|
| `--color-bg` | `#f4f2ef` | Warm paper |
| `--color-surface` | `#ffffff` | Cards |
| `--color-surface-elevated` | `#ebe8e4` | Striped headers |
| `--color-border` | `#d8d4ce` | |
| `--color-border-strong` | `#c4beb6` | |
| `--color-text` | `#141210` | |
| `--color-text-secondary` | `#5c574f` | |
| `--color-accent` | `#b8863e` | Darker champagne for contrast |
| `--color-accent-muted` | `rgba(184, 134, 62, 0.12)` | |
| `--color-accent-strong` | `rgba(184, 134, 62, 0.2)` | |
| `--color-on-accent` | `#ffffff` | White on gold buttons |
| `--color-overlay` | `rgba(20, 18, 16, 0.45)` | |
| `--color-neutral-muted` | `rgba(92, 87, 79, 0.1)` | |

Light `--t-muted2`: **`#6b6560`**.

`--t-accent-bright`: `#9a6b2f` (light).

---

## Usage rules

1. **Accent (champagne):** logo (`Brand`), primary CTAs, active nav, focus rings, link default — never for P&L direction.
2. **Gain / loss:** quotes, badges, charts (direction), heatmap — only locked greens/reds above.
3. **Surfaces:** stack bg → surface → elevated; avoid pure `#000` or `#fff` outside light card faces.
4. **Landing dot grid:** keep; opacity may drop to `0.28` on warm bg if grid reads too loud.

---

## Implementation

| File | Change |
|------|--------|
| `client/src/styles/themes.css` | Replace neutral + accent blocks; keep gain/loss/warning blocks verbatim |
| `client/src/styles/README.md` | One-line mood note + accent description |
| Visual QA | `/`, `/login`, `/dashboard`, `/stock/:sym`, sector heatmap, light toggle |

No component TS changes expected unless contrast fixes need `on-accent` tweaks.

---

## Acceptance criteria

- [ ] Dark and light: brand + CTAs read clearly (WCAG AA for button label vs background).
- [ ] Gain/loss hex values match locked table (grep `themes.css`).
- [ ] No sky-blue `#60a5fa` / `#2563eb` left in `themes.css`.
- [ ] Sidebar active state, login accent bar, landing primary buttons feel cohesive.
- [ ] Charts: gain/loss strokes unchanged; grid/tick colors follow new borders/text-secondary.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Champagne feels “luxury” not “trading” | Keep saturation muted; use dark `on-accent` text on buttons |
| Warm bg + mint looks “Christmas” | Use champagne only for chrome; mint only on numbers |
| Light mode gold muddy | Use `#b8863e` + white on-accent, not pale gold on white |

---

## Next step

After user approves this spec → **writing-plans** skill for a short implementation plan (themes.css + QA checklist).
