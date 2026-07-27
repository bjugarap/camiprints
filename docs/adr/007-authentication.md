# ADR 007 — Authentication

**Status**: Accepted · 2026-07-26

## Context

Anonymous users must be able to browse, print, download and convert — the
critical path can never hit a login wall. Accounts exist only for
favorites, saved creations, history and future premium features.

## Decision

Supabase Auth (email + OAuth later). No local user table: `userId` columns
reference `auth.users`. Anonymous favorites live in `localStorage` and merge
into the account on first login. Converter sessions are keyed by an
anonymous session id; saving a creation is the only account-gated step and
is offered only after the page is generated.

## Why

- Matches the sitemap's "optional — never required to browse, print, or
  convert once" contract.
- RLS policies (owner-only rows) come for free with Supabase Auth.
- Merging device favorites on login means no child ever loses their hearts
  by signing in on a parent's account.

## Consequences

Every account feature needs a working anonymous fallback first; PRs that
gate the critical path on auth are rejected.
