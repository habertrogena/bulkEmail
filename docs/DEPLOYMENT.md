# Deployment Guide

Production setup: this project shares a Contabo VPS with two unrelated projects
(CrewOS and Tafuta), using the same structural pattern CrewOS already proved
out there — one env-var-driven Docker Compose file, images built by GitHub
Actions and pushed to GHCR, the VPS only ever pulling and restarting. This
project is **production-only** — there is no staging environment and no
`develop`-branch workflow, unlike CrewOS. That's a deliberate choice, not a
partial copy of CrewOS's pattern.

- **CI/CD** → GitHub Actions (`.github/workflows/deploy-production.yml`), triggered on push to `main`, gated behind a `production` GitHub Environment (manual approval — see step 6)
- **Image registry** → GitHub Container Registry (GHCR): `bulk-email-api`, `bulk-email-frontend`, `bulk-email-admin`
- **Runtime** → Docker Compose on the VPS (`docker-compose.deploy.yml`): Postgres, Redis, the API (also runs the BullMQ worker — see below), the customer-facing frontend, and the platform-admin app
- **Reverse proxy / TLS** → Nginx + Let's Encrypt, config version-controlled at `infra/nginx/bulkmail-production.conf`

The API image doubles as the queue worker: `EmailSendingProcessor` is registered
directly in `AppModule` and runs in the same Nest process as the HTTP server
(alongside the auth/companies/campaigns/webhooks/suppression/admin modules).
There is no separate worker entrypoint or container —
`docker-compose.deploy.yml` runs one `api` service, not an `api` + `worker` pair.

---

## 1. Architecture

One compose file, `docker-compose.deploy.yml`, is entirely driven by env
vars — container names, the Docker network, volume names, and every app's
port all come from `.env`, nothing is hardcoded in the compose file itself.
This project only has one environment (production), so there's only one VPS
directory using this file — but it's still structured the CrewOS way so
that if a staging environment is ever added later, it's a second directory
with its own `.env`, never a change to the compose file.

Everything is namespaced with the `bulkmail-prod-` prefix (containers,
network, volumes) specifically so it cannot collide with CrewOS's or
Tafuta's containers, networks, or volumes on the same VPS. Postgres and
Redis are dedicated to this project — not shared with CrewOS's or Tafuta's
databases, and not exposed to the host at all (see the comments in
`docker-compose.deploy.yml` for why that's a deliberate difference from
CrewOS's setup).

## 2. One-time VPS directory setup

```bash
sudo mkdir -p /opt/bulk-email/production
sudo chown -R $(whoami):$(whoami) /opt/bulk-email
```

Copy `docker-compose.deploy.yml` into that directory via `scp`:

```bash
scp docker-compose.deploy.yml <vps>:/opt/bulk-email/production/
```

## 3. `.env` on the VPS

Copy `.env.production.example` to `.env` in `/opt/bulk-email/production/`,
fill in every value, and generate every secret with:

```bash
openssl rand -hex 32
```

Never commit the filled-in file — `.env.production.example` (committed) is
a template only. `GHCR_OWNER`, `CONTAINER_PREFIX`, `NETWORK_NAME`, the three
app ports, `CORS_ORIGIN`, `FRONTEND_URL`, and `API_URL` all live in this
file — see the comments in `.env.production.example` for what each does and
why some CrewOS-pattern variables (`NEXT_PUBLIC_API_URL`) are deliberately
**not** here (they're Next.js build-time values, supplied as GitHub Actions
build-args instead — see step 6).

**No seed script exists in this project today.** CrewOS's deploy runs
`prisma db seed` after every migration to upsert an admin credential; this
project has no `prisma/seed.ts` and no `seed` entry in `package.json`, so
the deploy workflow does not attempt it — running it would just fail with
"No seed script found." Platform-admin access is currently granted by a
manual one-off script instead: `pnpm --filter @apps/api admin:grant
<email>` (see `apps/api/scripts/set-platform-admin.ts`), run by hand after
registering a normal account. **Open decision, not yet made:** whether to
add a real seed script that upserts a platform-admin account on every
deploy, matching the CrewOS pattern exactly. If you want that, say so and
it can be added — flagging it here rather than assuming either way.

## 4. DNS records

Point A records at the VPS IP (this is manual — not something this repo or
pipeline can do) for:

- `bulkmail.okwiyatech.co.ke` → customer frontend
- `admin.bulkmail.okwiyatech.co.ke` → admin app
- `bulkmailapi.okwiyatech.co.ke` → API

## 5. Nginx + certbot

`infra/nginx/bulkmail-production.conf` is version-controlled in this repo,
covering all three subdomains as plain-HTTP reverse proxies plus the ACME
challenge location. One-time setup on the VPS:

```bash
scp infra/nginx/bulkmail-production.conf <vps>:/etc/nginx/sites-available/bulkmail-production.conf
ssh <vps> "sudo ln -s /etc/nginx/sites-available/bulkmail-production.conf /etc/nginx/sites-enabled/"
ssh <vps> "sudo nginx -t && sudo systemctl reload nginx"
ssh <vps> "sudo certbot --nginx -d bulkmail.okwiyatech.co.ke -d admin.bulkmail.okwiyatech.co.ke -d bulkmailapi.okwiyatech.co.ke"
```

`certbot --nginx` rewrites the live file on the VPS in place to add the
HTTPS server blocks and the `http`→`https` redirect. That edited version is
**not** synced back into this repo — if you need to change proxy behavior
later, edit the committed file, `scp` it again, and re-run certbot's
`--nginx` install step (or hand-add the SSL directives) rather than letting
the two versions drift apart silently.

## 6. GitHub repo configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | The VPS's IP or hostname |
| `VPS_USER` | SSH user on the VPS |
| `VPS_SSH_KEY` | Private key whose public half is already in that user's `~/.ssh/authorized_keys` |

**Variables** (Settings → Secrets and variables → Actions → Variables) — not
secret, used only as Next.js build args, inlined at build time, **not** set
on the VPS at runtime:

| Variable | Description |
|----------|-------------|
| `PROD_API_URL` | The API's real public URL, e.g. `https://bulkmailapi.okwiyatech.co.ke`. This app has **no global route prefix** (checked `apps/api/src/main.ts` — no `setGlobalPrefix` call), so this must be the bare origin, no `/api/v1` suffix. If a prefix is ever added to the API, update this variable to match or every frontend/admin request will start 404ing after the next deploy. |

**GitHub Environment** — create a `production` environment
(Settings → Environments → New environment → `production`) with required
reviewers configured, **manually, by the project owner — this cannot be
done from a workflow file or from this pass**. The `deploy` job in
`deploy-production.yml` already targets `environment: production`; without
the environment existing, that reference does nothing (no gate) rather than
failing, so this step matters even though CI won't visibly complain if it's
skipped.

Combined with branch protection on `main` (require a reviewed PR before
merge — also a manual repo setting, not configured by this pass), this
means production can never be reached without both a reviewed merge AND an
explicit manual approval click in the Actions UI — no separate promotion
tooling needed, matching CrewOS's approach.

No AWS credentials, database URL, or JWT secret are ever given to GitHub
Actions — those live only in the VPS's own `/opt/bulk-email/production/.env`,
set by hand once and never touched by CI. `GITHUB_TOKEN` (automatic, no
setup needed) is used to push images to GHCR.

## 7. First deploy sequence

On every push to `main` (after the `production` environment approval),
the workflow:

1. Builds and pushes all three images — `bulk-email-api`, `bulk-email-frontend`,
   `bulk-email-admin` — tagged both `:latest` and `:<short-sha>`.
2. SSHes into the VPS and runs:
   ```bash
   cd /opt/bulk-email/production
   docker compose -f docker-compose.deploy.yml --env-file .env pull
   docker compose -f docker-compose.deploy.yml --env-file .env up -d
   docker compose -f docker-compose.deploy.yml --env-file .env exec -T api npx prisma migrate deploy
   docker image prune -f
   ```

`prisma migrate deploy` runs on every deploy automatically (safe — it's a
no-op when there's nothing pending). There is **no** `prisma db seed` step,
per the open decision in step 3.

For the very first deploy: complete steps 2–6 above first (VPS directory,
`.env`, DNS, Nginx/certbot, GitHub secrets/variables/environment), then push
to `main` (or re-run the workflow) to trigger it.

## 8. Rolling back

There's no automatic rollback. To manually redeploy a previous build, SSH
in and point the compose file at a specific SHA tag instead of `latest` —
temporarily edit the three `image:` lines in `docker-compose.deploy.yml` on
the VPS to the known-good `:<short-sha>` tag, then:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env pull
docker compose -f docker-compose.deploy.yml --env-file .env up -d
```

Revert the edit (or let the next successful deploy overwrite it) once the
fix ships.

## 9. Verification checklist (run after every first deploy or infra change)

- [ ] `docker compose -f docker-compose.deploy.yml --env-file .env ps` shows
      all five containers (`bulkmail-prod-postgres`, `-redis`, `-api`,
      `-frontend`, `-admin`) `Up`.
- [ ] `curl -s https://bulkmailapi.okwiyatech.co.ke/health` returns
      `{"status":"ok"}` with a valid cert (no `-k` needed).
- [ ] `https://bulkmail.okwiyatech.co.ke` and
      `https://admin.bulkmail.okwiyatech.co.ke` both load over HTTPS with a
      valid cert.
- [ ] Register a company through the customer frontend, confirm
      `POST /auth/register` succeeds against the real production API (not a
      CORS error in the browser console — this is the most likely way a
      port or origin mismatch shows up).
- [ ] Log into the admin app with an `admin:grant`-elevated account and
      confirm `/companies` loads real data.
- [ ] **Critically:** confirm every OTHER project's containers and Docker
      networks on this VPS are completely untouched:
      ```bash
      # before this project's first deploy
      docker ps > /tmp/before-ps.txt; docker network ls > /tmp/before-net.txt
      # after
      docker ps > /tmp/after-ps.txt; docker network ls > /tmp/after-net.txt
      diff /tmp/before-ps.txt /tmp/after-ps.txt
      diff /tmp/before-net.txt /tmp/after-net.txt
      ```
      The only new entries should be the five `bulkmail-prod-*` containers
      and the `bulkmail-prod-net` network — nothing belonging to CrewOS or
      Tafuta should appear, restart, or disappear.
- [ ] Migrations applied cleanly (`docker compose ... exec -T api npx
      prisma migrate deploy` in the deploy log shows "No pending migrations"
      or lists the ones it just applied, not an error).
- [ ] SNS is subscribed to `https://bulkmailapi.okwiyatech.co.ke/webhooks/ses`
      so delivery/bounce/complaint tracking actually updates (see the main
      README's "SES/SNS setup" section).

## 10. Production checklist (config correctness, check once per env change)

- [ ] VPS `.env` has real `JWT_SECRET`, `POSTGRES_PASSWORD`, `DATABASE_URL`
      (pointing at the `postgres` service, not `localhost`), `REDIS_URL`
      (pointing at the `redis` service), `CORS_ORIGIN` (both the frontend
      and admin origins, comma-separated), `FRONTEND_URL`, `API_URL`,
      `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`,
      `SES_SNS_TOPIC_ARN`, and `PLATFORM_SENDING_DOMAIN`.
- [ ] VPS `.env` has `COOKIE_DOMAIN=.okwiyatech.co.ke` set. **This is easy to
      miss and breaks login silently in a very specific way**: without it,
      the login cookie is scoped only to the API's own subdomain, the
      frontend's and admin app's middleware never see it, and every login
      redirects straight back to `/login` even though the login call itself
      succeeded and the cookie was set correctly (verified in production —
      see the auth.controller.ts comment on `COOKIE_OPTIONS` for the full
      writeup). Confirm this is set before assuming any other part of a
      broken login is the cause.
- [ ] `CONTAINER_PREFIX`, `NETWORK_NAME`, and `GHCR_OWNER` are set and don't
      collide with CrewOS's or Tafuta's values on this VPS.
- [ ] `API_PORT`/`FRONTEND_PORT`/`ADMIN_PORT` (4500/3200/3001) don't collide
      with CrewOS's documented range (Postgres 5434, apps 4101–4113) or
      Tafuta's ports — already cross-checked when these were fixed.
- [ ] `NODE_ENV=production` is set — this switches the auth cookie to
      `SameSite=None; Secure`, required since the frontend, admin, and API
      are on different subdomains.
- [ ] GitHub repo has `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets, the
      `PROD_API_URL` variable, and the `production` Environment (with
      required reviewers) all configured.
- [ ] Branch protection on `main` requires a reviewed PR before merge.
- [ ] The VPS user's `~/.ssh/authorized_keys` has the public half of
      `VPS_SSH_KEY`.
