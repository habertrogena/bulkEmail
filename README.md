# Auth Workspace

A multi-tenant B2B SaaS platform for sending bulk email campaigns via Amazon SES, with
per-recipient delivery tracking (sent/delivered/bounced/complained), suppression lists, and a
BullMQ-driven send queue. NestJS API + Next.js frontend in a pnpm monorepo.

> **Note:** this pass focused entirely on the backend (`apps/api`). The existing frontend
> (`apps/frontend`) still has the old single-tenant register form (name/age/nationalID) — it was
> explicitly out of scope here and now needs updating to the new `companyName + email + password`
> registration shape (see "Breaking changes" below).

---

## Tech stack

| Layer         | Technology |
|---------------|------------|
| **Monorepo**  | pnpm workspaces |
| **Backend**   | NestJS 11, Node 22, TypeScript |
| **API**       | Express, Passport (JWT), bcrypt, class-validator, class-transformer, Helmet, cookie-parser, Throttler, Pino (logging) |
| **Database**  | PostgreSQL via Prisma 5 (ORM + migrations) |
| **Queue**     | BullMQ + Redis |
| **Email**     | Amazon SES v2 (`@aws-sdk/client-sesv2`) + SNS delivery/bounce/complaint webhooks |
| **Frontend**  | Next.js 16, React 19, TypeScript |
| **UI**        | Tailwind CSS, Radix UI, react-hook-form, Zod, Lucide React |
| **Auth**      | JWT stored in HTTP-only cookies; CORS + credentials for cross-origin frontend |

---

## Domain model

- **Company** — a tenant. Has a sending domain (verified via SES DKIM), an app-level allowlist of
  approved sender addresses, a monthly email limit, and a dedicated SES Configuration Set.
- **User** — belongs to a Company (`owner` / `admin` / `member`).
- **Campaign** — belongs to a Company. Subject/body/from-address, with live send/delivery/bounce/
  complaint counts.
- **Recipient** — belongs to a Campaign. Per-recipient send status and SES message ID.
- **SuppressionEntry** — a Company's do-not-send list (bounce / complaint / manual unsubscribe).

Every query in every module is scoped by the authenticated user's `companyId` — cross-tenant reads
return 404, never another company's data.

---

## How to run the project locally

**Prerequisites:** Node.js 22 (or LTS), pnpm 10.x, Docker (for local Postgres + Redis), and an AWS
account with SES access (sandbox is fine for testing).

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd auth-workspace
   pnpm install
   ```

2. **Start Postgres + Redis**
   ```bash
   docker compose up -d
   ```
   This starts Postgres on `localhost:5433` and Redis on `localhost:6380` (non-default ports to
   avoid clashing with anything else you might have running locally — adjust `docker-compose.yml`
   and `.env` together if you change them).

3. **Environment**
   - Copy `.env.example` to `.env` at the **repo root** and fill in the values. Required:
     - `DATABASE_URL` — Postgres connection string (matches `docker-compose.yml` by default)
     - `JWT_SECRET` — long random string (e.g. `openssl rand -base64 32`)
     - `REDIS_URL` — matches `docker-compose.yml` by default
     - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — SES/SNS credentials
     - `SES_SNS_TOPIC_ARN` — the shared SNS topic your SES configuration sets publish events to
       (see "SES/SNS setup" below)
     - `PLATFORM_SENDING_DOMAIN` — the shared verified domain (`mail.okwiyatech.co.ke`) companies
       can send from before they verify their own domain

4. **Run migrations**
   ```bash
   pnpm exec prisma migrate deploy
   ```

5. **Start dev (API + frontend)**
   ```bash
   pnpm dev
   ```
   - API: http://localhost:4500
   - Frontend: http://localhost:3200

All commands above are intended to be run from the **repo root**.

---

## SES / SNS setup (one-time, per AWS account)

1. In SES, move out of the sandbox (or keep sandbox — sandbox only lets you send to verified
   addresses, at 1 email/sec, which is fine for testing).
2. Create an SNS topic (any name) and note its ARN — this is `SES_SNS_TOPIC_ARN`.
3. Subscribe your API's public URL to that topic with an HTTPS subscription pointing at
   `https://<your-domain>/webhooks/ses` — SNS will POST a `SubscriptionConfirmation` message, which
   the API auto-confirms by GETing the `SubscribeURL` it contains (check the API logs).
4. Verify the platform's shared sending domain (`PLATFORM_SENDING_DOMAIN`) in SES so companies can
   send immediately, before verifying their own domain.
5. Each Company gets its own SES **Configuration Set** (`company-<id>`) automatically on
   registration, wired to publish Send/Delivery/Bounce/Complaint/Reject events to the shared SNS
   topic — no per-company AWS setup needed.

### Test-send walkthrough (sandbox-safe)

1. `POST /auth/register` with `{ companyName, email, password }` — creates the Company + owner
   User and provisions its SES configuration set.
2. `POST /auth/login` to get the JWT cookie.
3. `POST /companies/senders` with `{ "address": "you@<PLATFORM_SENDING_DOMAIN>" }` (or your own
   verified domain, once added via `POST /companies/domain` and confirmed via
   `GET /companies/domain/status`).
4. `POST /campaigns` to create a draft.
5. `POST /campaigns/:id/recipients` with a small CSV — in SES sandbox mode, use your own
   SES-verified email address as the recipient.
6. `POST /campaigns/:id/send` — returns immediately; a BullMQ worker sends each recipient.
7. Poll `GET /campaigns/:id` for live counts, or `GET /campaigns/:id/recipients?status=sent`.
8. If your SNS subscription is live, delivery/bounce/complaint events will flip recipient status
   automatically.

---

## Production deployment

Production runs on a shared Contabo VPS (alongside two unrelated projects, CrewOS and Tafuta)
via one env-var-driven Docker Compose file, with images built and pushed by GitHub Actions
(`.github/workflows/deploy-production.yml`) on every push to `main` — gated behind a `production`
GitHub Environment approval — no staging pipeline. Three images are built: the API (which also
runs the BullMQ worker in-process), the customer-facing frontend, and the platform-admin app.
Full setup instructions, the VPS-side `docker-compose.deploy.yml`, the Nginx/certbot setup, and
the manual migration/rollback steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Required GitHub configuration (**Settings → Secrets and variables → Actions**):

| Type | Name | Description |
|------|------|-------------|
| Secret | `VPS_HOST` | The VPS's IP or hostname |
| Secret | `VPS_USER` | SSH user on the VPS |
| Secret | `VPS_SSH_KEY` | Private key whose public half is already in that user's `~/.ssh/authorized_keys` |
| Variable | `PROD_API_URL` | The API's real public URL, inlined into the frontend/admin builds (no route prefix — see `docs/DEPLOYMENT.md`) |

Also required, and **not** configurable from code — see `docs/DEPLOYMENT.md` for details:
a `production` GitHub Environment with required reviewers, and branch protection on `main`.

No AWS credentials, database URL, or JWT secret are ever given to CI — those live only in the
VPS's own production `.env` (`/opt/bulk-email/production/.env`), set by hand and never touched
by the pipeline.

---

## Breaking changes from the previous single-tenant scaffold

- `User` no longer has `name`/`age`/`nationalID` — it now only has `email`, `passwordHash`,
  `companyId`, `role`.
- `POST /auth/register` now takes `{ companyName, email, password }` instead of
  `{ name, email, password, age?, nationalID? }`, and creates a Company + owner User.
- The database provider switched from MySQL to PostgreSQL; old MySQL migrations were removed and
  replaced with one fresh baseline migration.
- **The existing frontend register form (`apps/frontend`) was not updated** — it still posts
  name/age/nationalID and expects `name` back. It needs a follow-up pass to match the new
  register shape. This was an explicit, confirmed tradeoff for this backend-focused pass.
- `docs/DEPLOYMENT.md` and `.github/workflows/deploy-production.yml` now target the
  Postgres/Docker/GHCR/Contabo VPS setup (see "Production deployment" below) — the old
  MySQL/Render/Vercel/PlanetScale pipeline has been removed.

---

## Assumptions and decisions

- **Tenant isolation:** every query is scoped by the authenticated user's `companyId`, resolved
  from the JWT. Campaigns/recipients are always fetched through
  `CampaignsService.getOwnedCampaignOrThrow`, which 404s instead of leaking another company's data.
- **SES v2, not v1:** `@aws-sdk/client-sesv2` is used throughout (identity/domain verification,
  configuration sets, send) since it's the only client with `CreateEmailIdentity`,
  `GetEmailIdentity`, and `GetAccount` (used for the send-rate limiter).
- **Send-rate limiting:** BullMQ's queue limiter is configured from SES `GetAccount`'s
  `MaxSendRate` at boot (falls back to `1/sec`, the sandbox default, if the call fails or
  `SES_MAX_SEND_RATE` isn't set).
- **Idempotent webhooks:** SNS is at-least-once delivery, so Bounce/Complaint/Delivery handlers
  check the recipient's current status before mutating, inside a transaction — duplicate
  notifications are no-ops.
- **SNS signature verification:** every webhook payload is verified against AWS's signing
  certificate before being trusted; unverified payloads are rejected with 400.
- **Registration doesn't hard-fail on SES being down:** if provisioning a company's SES
  configuration set fails at registration time (e.g. bad AWS creds), the company/user are still
  created — the company just lacks delivery/bounce tracking until it's provisioned (retriable by
  re-running domain/sender setup).
- **JWT in HTTP-only cookies:** unchanged from the original scaffold.

---

## What would be improved with more time

- A retry/backfill path for companies whose SES configuration set failed to provision at
  registration time.
- Frontend updates to match the new register shape and add the campaigns/companies UI.
- E2E tests (register → login → campaign → send → webhook) using a mocked SES/SNS.
- A proper monthly-usage counter instead of summing `Recipient` rows per send (fine at current
  scale, would need an indexed rollup at higher volume).
- Wiring `docs/DEPLOYMENT.md` and CI/CD to the actual target stack (Postgres/Docker/Nginx/Contabo)
  instead of the legacy MySQL/Render/Vercel/PlanetScale setup.
