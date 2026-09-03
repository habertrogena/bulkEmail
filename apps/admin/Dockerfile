# syntax=docker/dockerfile:1
#
# Build context MUST be the repo root (not apps/admin), e.g.:
#   docker build -f apps/admin/Dockerfile .
#
# Why: this is a pnpm workspace, so `pnpm install --frozen-lockfile` needs to
# see every workspace member's package.json (pnpm-workspace.yaml matches
# apps/*), not just apps/admin's.
#
# NEXT_PUBLIC_API_URL is a build-time value in Next.js — it gets inlined into
# the client JS bundle at `next build`, not read at container start. It MUST
# be passed as a --build-arg pointing at the API's real public URL (the same
# one apps/frontend's image is built with); if left unset it silently falls
# back to http://localhost:4500 (see lib/api.ts), which will not work from a
# real browser hitting the deployed site.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

# --- deps + build ---
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --frozen-lockfile

COPY apps/admin ./apps/admin

RUN pnpm --filter @apps/admin build

# --- runtime ---
# `output: "standalone"` (next.config.ts) produces a self-contained server
# with only the production deps it actually needs, copied into
# .next/standalone — no repo-wide node_modules required at runtime.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/apps/admin/public ./apps/admin/public
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
