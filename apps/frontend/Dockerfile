# syntax=docker/dockerfile:1
#
# Build context MUST be the repo root (not apps/frontend), e.g.:
#   docker build -f apps/frontend/Dockerfile .
#
# Why: this is a pnpm workspace, so `pnpm install --frozen-lockfile` needs to
# see every workspace member's package.json (pnpm-workspace.yaml matches
# apps/*), not just apps/frontend's.
#
# NEXT_PUBLIC_API_URL is a build-time value in Next.js — it gets inlined into
# the client JS bundle at `next build`, not read at container start. It MUST
# be passed as a --build-arg pointing at the API's real public URL; if left
# unset it silently falls back to http://localhost:4500 (see lib/api.ts),
# which will not work from a real browser hitting the deployed site.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

# --- deps + build ---
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/admin/package.json ./apps/admin/package.json

RUN pnpm install --frozen-lockfile

COPY apps/frontend ./apps/frontend

RUN pnpm --filter @apps/frontend build

# --- runtime ---
# `output: "standalone"` (next.config.ts) produces a self-contained server
# with only the production deps it actually needs, copied into
# .next/standalone — no repo-wide node_modules required at runtime.
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3200
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/apps/frontend/public ./apps/frontend/public
COPY --from=build /repo/apps/frontend/.next/standalone ./
COPY --from=build /repo/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3200
CMD ["node", "apps/frontend/server.js"]
