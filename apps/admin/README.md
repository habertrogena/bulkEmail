# Platform Admin

Internal-only Next.js app for the platform owner — cross-tenant company management, reputation
monitoring, and AWS SES account health. Not linked from, or reachable through, the customer-facing
app (`apps/frontend`) anywhere; this is a structurally and (in production) domain-separate app.

**This app has no self-serve way to grant admin access.** Every route requires
`isPlatformAdmin: true` on the logged-in user, enforced server-side on every request by
`PlatformAdminGuard` in the backend — not just checked once at login.

## Running locally

1. From the repo root, start the backend's local infra and API (see the root `README.md`):
   ```bash
   docker compose up -d
   pnpm exec prisma migrate deploy
   pnpm --filter @apps/api dev   # http://localhost:4500
   ```
2. Register a normal account through either the API directly or the customer app
   (`POST /auth/register`), then grant it platform-admin access:
   ```bash
   pnpm --filter @apps/api admin:grant you@example.com
   ```
   This is a deliberate manual step (a small script, `apps/api/scripts/set-platform-admin.ts`) —
   there is no UI or endpoint to self-elevate.
3. Copy `.env.example` to `.env.local` in this directory (or set `NEXT_PUBLIC_API_URL` another
   way) — it defaults to `http://localhost:4500`, matching the API's default port.
4. From the repo root:
   ```bash
   pnpm --filter @apps/admin dev   # http://localhost:3001
   ```
   Pinned to port 3001 so it can run alongside the customer app (now on 3200) locally.

## What works without real AWS credentials

Everything except `/` (overview)'s AWS health tiles and `GET /admin/aws-health` — those call SES
`GetAccount` directly and will show an error without real SES credentials on the backend.
Companies list/detail, suspend/unsuspend, limit changes, and reputation monitoring are all backed
by the database only and work fully in local dev.

## Production deployment (not done in this pass)

Per the build spec, this app must be deployed on a separate subdomain from the customer app (e.g.
`admin.okwiyatech.co.ke` vs `app.okwiyatech.co.ke`), with no navigation link between them — that's
satisfied structurally here (separate app, no shared code or links), but the actual DNS/Nginx/
hosting setup is an infra task outside this pass, same as the Contabo/Docker/Nginx deployment gap
already flagged in the backend's README.

## Structure

- `app/login` — the only public route.
- `app/page.tsx` (`/`) — overview: AWS health, reputation warnings, platform-wide summary stats.
- `app/companies`, `app/companies/[id]` — company list and detail (suspend/unsuspend, plan/limit
  edits, campaign history, bounce/complaint chart).
- `app/reputation` — full 30-day bounce/complaint monitoring view.
- `proxy.ts` — cookie-presence gate (Next 16's replacement for `middleware.ts`); the actual
  `isPlatformAdmin` check happens via `AdminAuthProvider` calling `GET /auth/me` after login, and
  independently on the backend via `PlatformAdminGuard` on every `/admin/*` call.
- `components/admin/ConfirmActionDialog.tsx` — the one shared confirmation dialog every mutating
  action (suspend/unsuspend, limit changes) goes through.
