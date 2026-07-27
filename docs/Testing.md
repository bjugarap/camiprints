# Testing

| Layer | Tool | Where |
|---|---|---|
| Unit | Vitest (+ Testing Library) | `tests/unit/`, `src/**/*.test.ts(x)` |
| End-to-end | Playwright (desktop + 390px mobile projects) | `tests/e2e/` |
| Accessibility | @axe-core/playwright inside the e2e suite | every route |

```bash
npm run test    # unit
npm run e2e     # starts the dev server on :3100 and runs Playwright
```

## Product-constraint audits

Beyond ordinary correctness, the e2e suite asserts the handoff's
non-negotiables:

- The amber focus ring (3px, 2px offset) computes identically on controls.
- Calm Mode persists per device and removes the surfaces it must remove.
- No filled button on cards except Print; one filled button above the fold
  on detail (Phase 3).
- Every interactive element measures ≥44×44 (Phase 6 sweep).
- Converter failures keep step 5 with settings deep-equal preserved;
  Cancel returns to step 4 intact (Phase 4).
- Print routes hide nav/footer/controls in printed output (print-to-PDF
  assertion, Phase 3).

CI (`.github/workflows/ci.yml`) runs lint → typecheck → unit → build → e2e
on every push and PR.
