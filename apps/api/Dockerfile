# Avanti API — Production Dockerfile
# Multi-stage: builder compiles TypeScript; runner is a lean Node.js image.
# Target: GCP Cloud Run (asia-south1). Port: 4000.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Build tools needed for native deps (pg, bcryptjs)
RUN apk add --no-cache python3 make g++

WORKDIR /repo

# Copy manifests for layer-cached installs
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json                    ./apps/api/
COPY packages/queue/package.json              ./packages/queue/
COPY packages/schema-engine/package.json      ./packages/schema-engine/
COPY packages/types/package.json              ./packages/types/
COPY packages/utils/package.json              ./packages/utils/

# Install all workspace deps (hoisted to root node_modules)
RUN npm ci

# Copy source for every package the API depends on
COPY packages/types/src            ./packages/types/src
COPY packages/types/tsconfig.json  ./packages/types/
COPY packages/utils/src            ./packages/utils/src
COPY packages/utils/tsconfig.json  ./packages/utils/
COPY packages/queue/src            ./packages/queue/src
COPY packages/queue/tsconfig.json  ./packages/queue/
COPY packages/schema-engine/src    ./packages/schema-engine/src
COPY packages/schema-engine/tsconfig.json ./packages/schema-engine/
COPY apps/api/src                  ./apps/api/src
COPY apps/api/tsconfig.json        ./apps/api/

# Build dependency packages first, then the API
# (turbo resolves the correct order automatically)
RUN npx turbo build --filter=@avanti/api

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

WORKDIR /repo

# node_modules from the builder stage:
# - external deps live at /repo/node_modules/
# - workspace symlinks (e.g. node_modules/@avanti/types) are followed
#   by Docker COPY, so the compiled package dist is inlined automatically.
COPY --from=builder /repo/node_modules    ./node_modules
COPY --from=builder /repo/apps/api/dist  ./apps/api/dist
COPY --from=builder /repo/apps/api/package.json ./apps/api/
COPY --from=builder /repo/package.json   ./

# Run as non-root
RUN addgroup --system --gid 1001 avanti && \
    adduser  --system --uid 1001 --ingroup avanti avanti
USER avanti

WORKDIR /repo/apps/api

EXPOSE 4000

# dumb-init handles PID 1 signal forwarding (important for Cloud Run graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
