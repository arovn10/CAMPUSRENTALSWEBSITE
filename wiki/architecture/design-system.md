# Campus Rentals Design System

One visual language across the public site AND the investor portal. Established 2026-07 (public-site redesign, then portal overhaul). Tokens live in `campus-rentals/tailwind.config.js` + component classes in `src/app/globals.css`.

## Tokens

| Token | Value | Use |
|---|---|---|
| `ink-50…950` | neutral scale (#F7F8F8 → #0A0C0D) | backgrounds, text, borders — the default for everything non-semantic |
| `accent` | `#54AAB1` (hover `#4b9ba2`) | primary actions, active nav, focus rings, links |
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
