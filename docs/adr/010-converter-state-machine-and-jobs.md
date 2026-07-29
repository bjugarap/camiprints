# ADR 010 — Converter state machine and the Conversion Job model

**Status**: Accepted · 2026-07-28

## Context

The six-step wizard has hard product invariants (a failure never leaves
step 5 or touches settings; Back and Cancel are lossless; refresh restores
the session) and must work identically over an instant local pipeline
today and slow, job-based AI vendors tomorrow. Scattered `useState`
booleans cannot carry those guarantees.

## Decision

**State machine.** One serializable `ConverterState` and one pure reducer
(`converterReducer(state, event)`) with explicit statuses — `idle`,
`uploaded`, `cropping`, `style-selected`, `adjusting`, `processing`,
`completed`, `printing`, `error` — and typed events for every UI action
and provider callback. Illegal transitions are no-ops. No state library:
`useReducer` over a pure function is enough, and the function runs in
plain vitest.

**Conversion Jobs.** Every conversion — including the LocalProvider's
instant ones — produces a `ConversionJob` record: `id`, `provider`,
`status` (`queued → processing → completed | failed | cancelled`),
`createdAt`, `completedAt`, `processingDurationMs`, `settings`, `crop`,
`output` metadata, `error`. The output image itself travels as a Blob via
`fetchOutput`, keeping the job record serializable.

## Why

- The failure contract ("Your settings are still here") is a **transition
  property**; encoding it in the reducer makes it unit-testable and
  impossible to regress from a component refactor.
- Serializable state is what makes refresh-restore trivial: persist the
  state on change, replay `SESSION_RESTORED` on boot (mid-flight jobs are
  deliberately not restored — the work is gone, the settings are not).
- Jobs exist even for instant local processing because the *wizard's*
  contract must not depend on provider speed: the UI drives
  queued/processing/terminal for every provider, so an async vendor plugs
  in with zero UI changes. The record also gives one shape for future
  persistence ("my creations"), diagnostics (`processingDurationMs`) and
  the polling/webhook path.

## Consequences

- New wizard behaviour = new event + transition + test, not a new boolean.
- Async providers reuse the existing poll loop (`convert` returns a
  non-terminal job → `getJob` until terminal → `fetchOutput`).
- The machine file must stay DOM-free; effects (blobs, providers, object
  URLs) live only in the orchestrator component.
