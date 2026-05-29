# Results page: two-door layout

## Problem

Today `/results` lays its content out as a hero (break-even years, 25-year value) followed by a three-tab bar: Overview, Data, Readiness. Connection Readiness is the third tab — a click away, ranked visually third, and easy to skip during a live demo.

Connection Readiness is genuinely the product's moat: no competing solar tool surfaces a per-property grid-readiness score (net metering cap, feeder utilization, DER density, distance to substation). The current layout undersells it.

The product demo flows: getting to know you → rebate → money → grid → follow-up. The money story should still come before grid, but grid must read as equal in weight, not as an epilogue tab.

## Solution

Replace the three-tab bar inside the right-hand content column with **two equal-weight "door" buttons**: Money and Grid. Default state shows the hero and the two doors only. Clicking a door reveals its body below. Clicking the other door swaps bodies.

Everything outside the content column is unchanged: map on the left, hero at the top, `BottomCTA` ("Find a local installer") at the bottom.

## Layout

```
HERO          12 yrs    $34,800
              break-even  25-yr value     [Customize]

DOORS         ┌────────────────────┐  ┌────────────────────┐
              │ MONEY              │  │ GRID               │
              │ How the math works │  │ Will the grid let  │
              │ out on your roof.  │  │ you connect?       │
              │                  → │  │                  → │
              └────────────────────┘  └────────────────────┘

BODY          (renders below once a door is clicked)

CTA           Find a local installer →
```

### Door visuals

- Both doors share dimensions: full half-width each, ~140 px tall, generous padding. Side by side on `sm` and up; stacked on mobile.
- Card surface uses existing tokens: `bg-[var(--card)]`, `ring-1 ring-[var(--border)]`, rounded `2xl`.
- Content per door:
  - Eyebrow label (`MONEY` / `GRID`), using the existing `.eyebrow` class from `globals.css`.
  - One-line teaser (Money: "How the math works out on your roof." Grid: "Will the grid let you connect?").
  - Trailing arrow glyph (right-arrow when inactive, down-chevron when active).
- Active state: thicker `ring-2` ring in `var(--foreground)`, plus a small filled dot (8 px, `bg-[var(--foreground)]`) in the top-right corner. **No brand-color fill** — both doors stay visually peer-ranked even when one is open. The point is to make readiness feel like a peer to the money story, not a secondary lane.
- Hover: subtle opacity transition matching the existing `Button` component.

### Body

- Money body: wraps the existing `OverviewTab` and `DataTab` content. Owns its own internal 2-tab state (`"overview" | "data"`) using the same pill-style tab bar that the old top-level `TabBar` rendered.
- Grid body: the existing `ReadinessTab` content unchanged — score-out-of-10 + four breakdown items (net metering cap, feeder capacity, DER density, distance).

## Interaction

State: a single `activeDoor: "money" | "grid" | null` lives in `ResultsLayout`. Starts at `null`.

| Action | Effect |
| --- | --- |
| Click a door when `null` | Set `activeDoor` to that door. Body fades in (~180 ms opacity + 4 px translate). Smooth-scroll the body section into view (`scrollIntoView({ behavior: "smooth", block: "start" })`). |
| Click the other door when one is active | Set new value. Body cross-fades (out 120 ms, in 180 ms). No scroll change. |
| Click the currently-active door | No-op. Once a story is open, the only move is to swap to the other one. |

The doors stay rendered above the body at all times — they're persistent navigation. No sticky behavior; they sit in normal document flow.

Inside the Money body, the existing Overview / Data tabs continue to work as today. The third (Readiness) tab is removed from that internal bar.

## Back navigation

Browser back peels the door selection one layer at a time:

- Opening a door from `null` → `pushState`. URL hash becomes `#money` or `#grid`.
- Swapping from one door to the other → `replaceState`. We don't want back to walk Money → Grid → empty; one swap is one history state.
- Closing implicitly via back → handled by the `popstate` listener that mirrors `window.location.hash` into `activeDoor`. Hash empty ⇒ `activeDoor = null`.
- Back from `null` (no door open) → normal browser back, out of `/results`.

The hash is the source of truth; state mirrors it. On initial mount, read the hash so a hard refresh on `/results#grid` lands with Grid open.

## Scope boundary

In scope:
- Replacing the top-level tab bar in `ResultsLayout` with the door row.
- Internal 2-tab state inside Money body.
- Hash-driven back-button behavior.

Out of scope:
- Routing changes. `/results` stays a single page.
- Any change to the map column, hero, `CustomizeModal`, `BottomCTA`, or `app/results/page.tsx`.
- Any change to derive-results, the API layer, or storage.
- Keyboard shortcuts for door switching.
- Deep-link sharing UI (the hash works for refresh, but we don't surface "copy link" anywhere).
- Animation polish beyond the simple fades described above.

## Implementation footprint

One file touched: `frontend/components/results/ResultsLayout.tsx`.

- Replace `type TabValue = "overview" | "data" | "readiness"` with `type ActiveDoor = "money" | "grid" | null`.
- Remove the existing top-level `TabBar` component (~lines 184–225).
- Add a `DoorRow` component rendering the two cards.
- Wrap the existing `OverviewTab` + `DataTab` in a new `MoneyBody` component that owns the internal `"overview" | "data"` tab state. Reuse the styling from the removed `TabBar` for those inner sub-tabs.
- Rename `ReadinessTab` → `GridBody`. Content unchanged.
- Add the `activeDoor` state plus a `useEffect` that pushes/replaces history entries and a `popstate` listener that syncs state back from the hash.
- A `ref` on the body wrapper for `scrollIntoView` when a door opens from `null`.

Net: roughly 80 lines added, 50 lines removed in one file. No other files touched.

## Success criteria

- Landing on `/results` shows the hero, the two doors, and no body content below.
- Clicking either door reveals its body with a smooth fade and a scroll-into-view.
- Clicking the other door swaps the body in place with no scroll movement.
- The browser back button closes the open door first, then exits the page on a second press.
- Hard-refreshing `/results#money` lands with the Money body already open.
- The Grid body is visually peer-weighted with the Money body — same door size, same card treatment, same active-state styling, no brand-color downgrade on either.
- All four readiness breakdown items still render correctly inside the Grid body.
- Overview and Data tabs inside the Money body still work, with the Readiness tab no longer present in that inner bar.
