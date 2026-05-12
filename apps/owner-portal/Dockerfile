# Avanti Owner Portal — Production Dockerfile
# Next.js 16 standalone build. Internal access only (not public).
# Target: GCP Cloud Run (asia-south1). Port: 3001.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json turbo.json ./
COPY apps/owner-portal/package.json            ./apps/owner-portal/
COPY packages/types/package.json               ./packages/types/
COPY packages/ui-tokens/package.json           ./packages/ui-tokens/
COPY packages/utils/package.json               ./packages/utils/

RUN npm ci

COPY packages/types/src                 ./packages/types/src
COPY packages/types/tsconfig.json       ./packages/types/
COPY packages/utils/src                 ./packages/utils/src
COPY packages/utils/tsconfig.json       ./packages/utils/
COPY packages/ui-tokens/src             ./packages/ui-tokens/src
COPY packages/ui-tokens/tsconfig.json   ./packages/ui-tokens/

COPY apps/owner-portal ./apps/owner-portal

RUN npx turbo build --filter=@avanti/owner-portal

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder /repo/apps/owner-portal/.next/standalone ./
COPY --from=builder /repo/apps/owner-portal/.next/static      ./apps/owner-portal/.next/static

RUN addgroup --system --gid 1001 avanti && \
    adduser  --system --uid 1001 --ingroup avanti avanti
USER avanti

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/owner-portal/server.js"]
