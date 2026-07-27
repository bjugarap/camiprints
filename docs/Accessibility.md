# Accessibility

Target: WCAG 2.2 AA. Accessibility is a requirement, not an enhancement —
the site's second primary persona is a child who cannot read, and the design
is ASD-aware (Calm Mode, no surprise motion, predictable navigation).

## Commitments (from the design handoff)

- **Focus**: every interactive element takes the same ring —
  `outline: 3px solid #E8A32B; outline-offset: 2px` — via one global
  `:focus-visible` rule. Focus order follows DOM order. The print-preview
  route moves focus to its Print button; drawers trap focus and return it.
- **Touch targets**: nothing interactive is under 44px in either axis.
- **Motion**: only 120–160ms colour/opacity transitions on hover/focus;
  `prefers-reduced-motion: reduce` drops even those. Nothing moves on load;
  nothing auto-advances; no carousels.
- **Type**: nothing below 13.5px.
- **Semantics**: the metadata card is a definition list; the stepper is an
  ordered list with `aria-current="step"`; style choice is a radio group;
  toasts are polite live regions that never auto-hide; converter failures
  are `role="alert"` and receive focus.
- **Colour never carries meaning alone**: selected tiles add a ✓, active
  filter chips add an ✕ affordance.
- **Navigation**: the same four links on every public route; pictures
  navigate on the critical path.

## Verification

- axe-core runs against every route in the Playwright suite (zero
  violations allowed).
- Keyboard-only walkthroughs of the three primary journeys are part of the
  Phase 6 audit (see Testing.md).
