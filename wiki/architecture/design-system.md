# Campus Rentals Design System

One visual language across the public site AND the investor portal. Established 2026-07 (public-site redesign, then portal overhaul). Tokens live in `campus-rentals/tailwind.config.js` + component classes in `src/app/globals.css`.

## Tokens

| Token | Value | Use |
|---|---|---|
| `ink-50…950` | neutral scale (#F7F8F8 → #0A0C0D) | backgrounds, text, borders — the default for everything non-semantic |
| `accent` | `#54AAB1` (hover `#4b9ba2`) | **dark backgrounds only** (7.25:1 on ink-950), decorative fills, translucent tints |
| `accent-deep` | `#3A7A7F` (hover `#336E73`) | **anything needing AA on light**: button fills under white text, accent text/links on white or ink-50 |
| `shadow-soft` / `shadow-lift` / `shadow-glow` | layered shadows | cards / hover / primary CTAs |
| `text-display-xl / display / headline` | fluid type ramp, tight tracking | marketing headlines |
| `animate-fade-up / fade-in / scale-in`, `ease-out-expo` | motion | reveals; always wrapped by `prefers-reduced-motion` |

Component classes (globals.css): `btn-hero`, `btn-ghost`, `btn-quiet`, `glass-nav`, `card-premium`, `chip`, `section-shell`, `eyebrow`, `.stagger`.

## Portal recipe (`/investors/*`)

- **Page bg** `bg-ink-50`; body text `text-ink-800`; headings `text-ink-900 font-semibold tracking-tight`.
- **Cards/panels:** `rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5` — never ad-hoc `border shadow-md` combos.
- **KPI tiles:** label `text-xs font-medium uppercase tracking-[0.15em] text-ink-400`, value `text-2xl md:text-3xl font-semibold tracking-tight text-ink-900`.
- **Primary button:** `rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4b9ba2] transition-colors`. Secondary: `bg-ink-100 text-ink-700 hover:bg-ink-200`. Destructive: red-600.
- **Inputs:** `rounded-xl border border-ink-200 focus:border-accent focus:ring-2 focus:ring-accent/20`.
- **Tables:** header `text-xs uppercase tracking-wider text-ink-400`, `divide-ink-100` rows, `hover:bg-ink-50`.
- **Nav active state:** `bg-accent/10 text-ink-900` + inset accent bar (see `investors/layout.tsx`).
- **Spinners:** `border-accent border-t-transparent`.
- **Brand block:** `bg-ink-950` square with `text-accent` icon.

## Semantic color stays semantic

Green = positive money/success, red = negative/error, amber = warning/pending (e.g. `requested` tours, pending capital calls). Everything that is merely *decorative* amber/violet/sky from older passes gets replaced by accent or ink.

## Hard rules

1. Restyles change classes/markup, **never** handlers, data flow, or business logic.
2. No full-file reformatting — keep diffs reviewable.
3. Money rendering keeps existing `Number(...)`/Decimal handling untouched.
4. Every fullscreen modal: body scroll-lock + `overflow-y-auto` panel (see UI gotchas in `website.md`).
5. `backdrop-filter` ancestors break `position:fixed` children — overlays render as siblings.
6. **No global element-level color defaults.** A legacy `@layer base` rule painted every unstyled `<button>` `bg-accent` — link-style buttons rendered as solid teal bars with invisible text (2026-07-13 IMS login bug). The same trap bit again on 2026-07-23: base rules forced `text-secondary` on **every heading** (2.77:1 on ink-950 — every heading on a dark section silently failed AA) and `text-text` on body/links (4.29:1 on white). Headings/links now **inherit** their section's color; the base layer sets only font/transition.
7. **Contrast is a hard gate, not a preference.** Plain `accent` is 2.71:1 on white — it may never be a button fill under white text, nor text on a light background. Use `accent-deep`. Muted text: `ink-400` is 2.97:1 on white and is for icons/borders/placeholders, **not body copy**; use `ink-500` on white, `ink-600` on `ink-50`/`ink-100`. On dark backgrounds muted text goes **lighter** (`ink-300`), never darker — a blanket ink-400→ink-500 sweep regressed the footer until caught.
8. **Every page gets exactly one `<main>` and one `<footer>`.** Both come from `app/layout.tsx`. Pages must not render their own — four pages shipped duplicate legacy footers (doubled copyright + leaked vendor branding) until 2026-07-23.
9. **Form fields are ≥16px** (`text-base`). Anything smaller makes iOS Safari zoom the page on focus.
10. **Tap targets ≥44px.** Applies to nav rows, icon buttons, and toggles; inline text links are exempt.

## Verify accessibility before shipping a UI change

```bash
cd campus-rentals && npm run build && PORT=3200 npm start   # then, from a scratch dir:
npm install axe-core --no-save
# Playwright + p.addScriptTag({path: require.resolve('axe-core')}) + axe.run(document)
```
The public site + legal pages + investor login were at **0 axe violations** on 2026-07-23 (from ~150). Treat any regression as a bug, and remember axe only sees what is *rendered* — modals and portal screens need to be opened, or swept in code.
