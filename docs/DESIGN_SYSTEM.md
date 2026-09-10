# Design System — Evony Rally Coordinator

This documents the visual language implemented in the foundation phase. All values are defined
as tokens in `tailwind.config.js` — use the token names below rather than raw hex/px values
anywhere in the app, so the palette and scale stay centrally editable.

## Ecosystem identity

The header shows a small uppercase "Evony Tools" eyebrow (linking to the hub) above the
`font-display` app wordmark, and the footer links out to the sibling tools (Resource Advisor,
Defense Planner, Prestige Tracker, Boss Predictor). This is the same brand-hierarchy pattern used
on the other Evony Tools pages: ecosystem name first, product name second.

## Design intent

Dark, gaming-utility interface with a single restrained gold accent. The gold is chrome/branding
only — it never represents player-declared data (status colors are deliberately separate, see
below), so it never gets diluted into meaning something other than "this is part of the app's
own interface." The one signature element is a small gold diamond/rune motif, used only as a
hairline section divider (header/footer) and a tiny logo mark — repeated exactly once per
surface, never as general decoration.

## Colors

| Token | Hex | Usage |
|---|---|---|
| `ink-950` | `#0B0D12` | Page background |
| `ink-900` | `#12151C` | Card / base surface |
| `ink-800` | `#1A1E28` | Elevated surface (modals, hovered/active cards, mobile menu) |
| `ink-700` | `#262B38` | Borders, dividers |
| `ink-600` | `#3A4152` | Stronger borders, input borders, disabled states |
| `gold` (DEFAULT) | `#C9A227` | Primary accent — links, primary buttons, active nav, headings |
| `gold-bright` | `#E8C766` | Hover/focus state of gold elements only — never a resting state |
| `gold-dim` | `#8A7220` | Text selection background, subdued accent use |
| `status-available` | `#4C9A6A` | "Available" status only |
| `status-maybe` | `#D9922C` | "Maybe" status only |
| `status-unavailable` | `#8A8F9C` | "Unavailable" status; also reused for destructive/error tone |
| `ash-50` | `#F4F5F7` | Primary body text |
| `ash-200` | `#C7CBD4` | Secondary text, nav labels |
| `ash-400` | `#8A8F9C` | Tertiary text, captions, placeholders |
| `ash-500` | `#6B7080` | Lowest-emphasis text (disabled, placeholder) |

**Rule:** gold is chrome; status colors are data. Never use a status color for a UI element, and
never use gold to represent a player's status, even coincidentally.

## Typography

| Role | Font | Token | Usage |
|---|---|---|---|
| Display | Cinzel (serif, Roman capitals) | `font-display` | Page titles (`h1`–`h3`), the logo wordmark, card section headings. Used sparingly — never body copy, never small UI labels. |
| Body / UI | Inter | `font-sans` (default) | All body text, nav labels, buttons, form labels — anything read at length or at small size. |
| Data | IBM Plex Mono | `font-mono` | Capability strings (`Lv5`, `Hard 60`, `Hell`), timestamps, anything meant to align in a column. Not yet used in the foundation phase (no data rendering yet) — reserved for the Status Board phase. |

### Scale (Tailwind defaults, used consistently)
- `text-3xl` / `text-4xl` — page `h1`
- `text-2xl` — section `h1` on inner pages
- `text-lg` / `text-base` — card headings (`font-display`)
- `text-sm` — body copy, nav, buttons, inputs
- `text-xs` — captions, badges, hints, error text

## Spacing

Standard Tailwind spacing scale throughout (`4px` base unit). Page content is capped at
`max-w-6xl` and horizontally padded `px-4` (mobile) / `px-6` (desktop, ≥768px) via
`PageContainer`. Vertical rhythm between major sections uses `gap-6`–`gap-8`; within a card,
`gap-2`–`gap-4`.

## Cards (`Card` component)

- Background: `ink-900` (default) or `ink-800` (`elevated` prop — nested/hovered contexts)
- Border: `1px solid ink-700`
- Corner radius: `rounded-card` (`0.625rem`) — every card, modal, and input shares this radius
- Shadow: `shadow-card` — a subtle dual shadow (soft black drop + 1px gold-tinted ring at 6%
  opacity) so cards read as separated from the page without a heavy drop shadow
- Padding: `p-4` as the default; increase for feature/hero cards only, don't decrease below `p-4`
  on interactive cards (keeps touch targets and tap-friendly spacing consistent)

## Buttons (`Button` component)

Four variants — pick by intent, not by visual preference:

| Variant | When to use |
|---|---|
| `primary` | The one primary action on a page/card (gold fill, dark text) |
| `secondary` | Any non-primary action that still needs visual weight (outlined) |
| `ghost` | Low-emphasis actions, often paired next to a primary button |
| `danger` | Destructive or "leave/remove" actions only — never for anything else |

All buttons enforce a **44px minimum height** — this is a hard floor, not a suggestion, per the
"large touch targets" requirement; don't override it with custom padding that shrinks below it.

## Forms (`Input` component)

- 44px minimum height, matching buttons
- Label above the field, `text-sm font-medium text-ash-200`
- Hint text below in `ash-400`; error text below in `status-unavailable`, both `text-xs`
- Border switches to `status-unavailable` only when `error` is set — never use red for anything
  but an actual validation error
- Focus state: 2px gold ring (`focus-visible`), consistent with the global focus rule below

## Badges (`Badge` component)

Used for status/tag display (status board work in a later phase). Five tones: `gold`, `available`,
`maybe`, `unavailable`, `neutral`. Each tone is a low-opacity fill of its color with a matching
border and full-opacity text — never a solid fill, to keep badges legible in dense rows without
overpowering the card they sit in.

## Responsive rules

- **Mobile-first**: every component's base styles target a phone viewport; `md:` (≥768px)
  breakpoints layer on enhancements (multi-column grids, full nav bar, extra padding) — never the
  reverse.
- **Header**: full nav bar at `md:` and above; below that, a hamburger toggle opens a stacked menu
  (44px tap target, matches Button sizing).
- **Page width**: content never exceeds `max-w-6xl`, regardless of viewport, so desktop text lines
  stay readable.
- **Cards**: single column on mobile; grid layouts (e.g. the three feature cards on Home) go to
  `md:grid-cols-3` and above only.

## Motion

Deliberately minimal, per the "avoid unnecessary animations" requirement:
- Color/border transitions on hover/focus (`transition-colors`) — functional feedback only
- The `Loading` component's spinner is the only continuous animation in the app
- `prefers-reduced-motion: reduce` is respected globally (see `src/styles/index.css`) — all
  transition/animation durations collapse to near-zero for users who've requested it
- No page-load animations, no scroll-triggered reveals, no decorative motion of any kind

## Accessibility baseline

- Visible focus ring (2px gold) on every interactive element, never suppressed
- Status is always communicated by color **and** text label together, never color alone
- All interactive elements meet the 44px touch-target minimum
- Modal dialogs use `role="dialog"`, `aria-modal`, and close on `Escape`
