# Warm Graphite Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for task-by-task execution.

**Goal:** Apply approved Warm Graphite Desk neutrals + champagne accent via `themes.css` while keeping gain/loss hex values locked.

**Architecture:** Single source of truth in `themes.css`; landing, login, and app inherit through existing `--color-*` / `--t-*` aliases.

**Tech Stack:** Vite + React, CSS custom properties

## Global Constraints

- Do not change `--color-gain`, `--color-loss`, or their muted variants from the spec locked table.
- No sky-blue accent (`#60a5fa`, `#2563eb`) in `themes.css`.
- Accent for brand/CTA only; gain/loss for market direction only.

---

### Task 1: Update theme tokens

**Files:**
- Modify: `client/src/styles/themes.css`

- [x] Replace dark/light neutral + accent blocks per spec
- [x] Set `--t-muted2`, `--t-accent-bright` warm values

**Verify:** `grep -E '60a5fa|2563eb' client/src/styles/themes.css` → no matches

### Task 2: Docs and fallbacks

**Files:**
- Modify: `client/src/styles/README.md`
- Modify: `client/src/lib/chartTheme.ts` (accent fallback hex)
- Modify: `client/src/pages/landing.css` (dot grid opacity 0.28)

- [x] README mood blurb
- [x] chartTheme fallback `#d4a574`

### Task 3: Build + visual QA

- [x] `npm run build` in `client/`
- [ ] Manual: `/`, `/login`, `/dashboard`, stock detail, light toggle

