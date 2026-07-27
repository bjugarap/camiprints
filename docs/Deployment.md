# Deployment

Target: **Vercel** (app) + **Supabase** (Postgres, Auth, Storage).

## Environments

| Env | Data source | Notes |
|---|---|---|
| Local dev | `DATA_SOURCE=static` | No infrastructure needed. |
| Preview | `static` or a branch database | Vercel preview deployments per PR. |
| Production | `DATA_SOURCE=database` | Supabase project + storage buckets. |

## Environment variables

See [.env.example](../.env.example). In Vercel, set them per environment;
`SUPABASE_SERVICE_ROLE_KEY` and `DIRECT_URL` are server-only secrets and must
not be exposed with `NEXT_PUBLIC_`.

## Notes

- `npm run build` must pass with `DATA_SOURCE=static` so previews never
  depend on the database.
- The converter route runs the Sharp/OpenCV pipeline in a Node runtime
  (not Edge); it is declared `runtime = "nodejs"`.
- Storage: `coloring-pages` (public read) and `conversion-uploads`
  (private) buckets; a scheduled job deletes expired uploads. Media can
  later migrate to Cloudflare R2 by swapping the storage helper — URLs are
  data, not code.
