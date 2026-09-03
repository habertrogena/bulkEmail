# syntax=docker/dockerfile:1
#
# Build context MUST be the repo root (not apps/api), e.g.:
#   docker build -f apps/api/Dockerfile .
#
# Why: this is a pnpm workspace, and apps/api imports `@prisma/client` (see
# src/common/prisma/prisma.service.ts) even though it's declared only in the
# ROOT package.json, not apps/api/package.json — it reaches apps/api purely
# through pnpm's hoisting. A `pnpm deploy`-style single-package bundle would
# drop it. So instead of trying to isolate apps/api, this Dockerfile installs
# the whole workspace and ships the whole node_modules tree.
#
# This same image is used for both the API server and the BullMQ worker: the
# queue processor (EmailSendingProcessor) is registered directly in AppModule
# and runs in-process — there is no separate worker entrypoint in this repo.
# docker-compose.deploy.yml therefore runs exactly one "api" service from this
# image, not an api + worker pair.

FROM node:22-slim AS base
# node:22-slim ships no `openssl` binary, so Prisma can't detect the system's
# libssl version and silently defaults to the wrong engine target (openssl-1.1.x
# on a bookworm base that only has libssl3) — the query engine then fails at
# *runtime* with "libssl.so.1.1: cannot open shared object file", not at build
# time. Installing openssl here fixes detection for both the `prisma generate`
# step (build stage) and the engine binary actually loaded at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# --- deps + build ---
FROM base AS build

# Copy just the workspace/package manifests first so `pnpm install` is cached
# across builds as long as no dependency changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/admin/package.json ./apps/admin/package.json
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

RUN pnpm exec prisma generate
RUN pnpm --filter @apps/api build

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/prisma ./prisma

EXPOSE 4500
CMD ["node", "apps/api/dist/main.js"]
