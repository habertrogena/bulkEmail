# Frontend — customer dashboard

Customer-facing Next.js app for the email campaign platform: company registration/login, sending
domain + sender setup, campaign composer, live send status, and suppression list. Talks to the
NestJS API (`apps/api`) over REST with an httpOnly cookie for auth (no tokens in localStorage).

## Running locally

1. From the repo root, start the backend's local infra and API (see the root `README.md`):
   ```bash
   docker compose up -d        # Postgres + Redis
   pnpm exec prisma migrate deploy
   pnpm --filter @apps/api dev # http://localhost:4500
   ```
2. Copy `.env.example` to `.env.local` in this directory (or set `NEXT_PUBLIC_API_URL` another
   way) — it defaults to `http://localhost:4500`, matching the API's default port.
3. From the repo root:
   ```bash
   pnpm --filter @apps/frontend dev   # http://localhost:3200
   ```

## What works without real AWS credentials

Registration, login, adding a sender on the platform's shared fallback domain, composing a
campaign, uploading a CSV, and sending are all fully testable without SES access — sending will
enqueue and each recipient will end up `failed` with the SES auth error surfaced in the recipient
table (verified end-to-end against the backend). Actual domain verification and successful
delivery require real AWS SES/SNS credentials on the backend.

## Structure

- `app/(login|register|forgot-password|reset-password)` — public auth pages.
- `app/dashboard` — campaigns list (home page after login).
- `app/campaigns/new`, `app/campaigns/[id]` — composer and live status.
- `app/settings/domain` — sending domain + approved senders.
- `app/suppression` — read-only suppression list.
- `proxy.ts` (Next 16's replacement for `middleware.ts`) — redirects to `/login` when the
  `accessToken` cookie is absent (presence check
  only; the JWT itself is verified server-side on every API call, same as before).
- `hooks/` — one hand-rolled `useState` + `apiFetch` hook per backend resource, matching the
  existing `useLogin`/`useRegister` pattern (no react-query/SWR in this project).
