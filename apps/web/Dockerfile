# Avanti Web — Production Dockerfile
# Next.js 16 standalone build. Minimal image via standalone output mode.
# Target: GCP Cloud Run (asia-south1). Port: 3000.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /repo

# Copy manifests for layer-cached install
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json                    ./apps/web/
COPY packages/api-client/package.json         ./packages/api-client/
COPY packages/i18n/package.json               ./packages/i18n/
COPY packages/schema-engine/package.json      ./packages/schema-engine/
COPY packages/types/package.json              ./packages/types/
COPY packages/ui-tokens/package.json          ./packages/ui-tokens/
COPY packages/utils/package.json              ./packages/utils/

RUN npm ci

# Source for all packages web depends on
COPY packages/types/src                 ./packages/types/src
COPY packages/types/tsconfig.json       ./packages/types/
COPY packages/utils/src                 ./packages/utils/src
COPY packages/utils/tsconfig.json       ./packages/utils/
COPY packages/ui-tokens/src             ./packages/ui-tokens/src
COPY packages/ui-tokens/tsconfig.json   ./packages/ui-tokens/
COPY packages/api-client/src            ./packages/api-client/src
COPY packages/api-client/tsconfig.json  ./packages/api-client/
COPY packages/i18n/src                  ./packages/i18n/src
COPY packages/i18n/tsconfig.json        ./packages/i18n/
COPY packages/schema-engine/src         ./packages/schema-engine/src
COPY packages/schema-engine/tsconfig.json ./packages/schema-engine/

# Web app source
COPY apps/web ./apps/web

# Build packages then the Next.js app
RUN npx turbo build --filter=@avanti/web

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# Next.js standalone build is self-contained — no root node_modules needed
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static      ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public            ./apps/web/public

RUN addgroup --system --gid 1001 avanti && \
    adduser  --system --uid 1001 --ingroup avanti avanti
USER avanti

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
