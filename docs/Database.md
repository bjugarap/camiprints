# Database

Supabase Postgres, managed through Prisma migrations. Schema:
[`prisma/schema.prisma`](../prisma/schema.prisma).

## Models

| Model | Purpose |
|---|---|
| `Category`, `ColoringPage`, `Tag`/`PageTag` | The public catalog. Asset URLs are nullable; the UI renders marked placeholders until artwork exists. |
| `Favorite` | Account favorites (`userId` references Supabase `auth.users`). Anonymous favorites live in `localStorage` and merge on login. |
| `Creation` | Opt-in saved converter results. Only generated line art — never the source photo. |
| `ConversionJob` | Converter lifecycle (`idle → uploading → queued → processing → ready | failed`). `photoPath` points into a **private** Storage bucket and rows carry `expiresAt`; a scheduled cleanup deletes expired photos. |
| `AdminAuditLog` | Product requirement: every admin action that reveals a user photo is recorded. |
| `AnalyticsEvent` | Privacy-first events (print, download, category_view, search, conversion_*) with anonymous props only. |

## Row Level Security

Applied in the Supabase migration layer:

- `categories`, `coloring_pages`, `tags`: public **select** where published.
- `favorites`, `creations`: owner-only (`auth.uid() = user_id`).
- `conversion_jobs`: owner/session only; no public reads ever.
- `admin_audit_log`: insert-only for admins; select for admins.

## Workflow

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev (needs DIRECT_URL)
npm run db:seed       # seeds from src/server/data/seed-data.ts
```

`DATABASE_URL` is the pooled (pgBouncer) URL; `DIRECT_URL` the direct
connection for migrations — both from the Supabase dashboard.
