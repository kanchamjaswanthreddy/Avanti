# Avanti — School Management Platform

## Working Name
Avanti (placeholder — rename later via one-click global find-replace)

## What This Is
India-first, AI-native, 100% customizable school management OS.
Three tiers: school management + Avanti Learn (education content) + Avanti Device (tablet deployment).
v1.0 ships COMPLETE — no shortcuts, no "add in v2" for core features.

## All Docs Are In /docs/
- SchoolPlatform_Brainstorm_v1.docx — product vision, all modules, pricing, 12 innovation modules, full tech stack rationale
- TechnicalArchitecture_v1.docx — complete engineering spec: provisioning, SME, canvas builder, API, auth, AI agent, mobile, monitoring
- OperationsDesignReference_v1.docx — 8 sections: migrations, CI/CD, security, OpenAPI, design system, AIIS, owner portal, cloud/dev workflow

## Stack (Locked — all latest stable as of 2026)

### Frontend Web
- Next.js 16.1 + React 19.2 + TypeScript strict
- Tailwind CSS — tokens only (spacing, color vars, typography scales). Zero pre-built component classes.
- All UI components hand-built in-house. No Shadcn, no Radix, no MUI, no Ant Design.
- Zustand — canvas builder state + global app state
- React Flow — graph engine for canvas (completely reskinned, no default React Flow UI visible)
- Motion (Framer Motion v12+) — micro-interactions, page transitions, drag feedback
- GSAP — scroll-driven animations on marketing/onboarding pages
- next-intl — i18n (6 languages: English, Hindi, Telugu, Tamil, Kannada, Marathi)
- Socket.io client — real-time WebSocket connection

### Backend
- Fastify v5 + TypeScript + Node.js 22
- Prisma — ORM for core/static tables only
- Raw SQL — for dynamic meta-schema operations (never Prisma for schema engine)
- BullMQ + Redis — job queue (background reports, payroll, notifications, schema migrations)
- Socket.io — per-school WebSocket namespaces (/ws/school-{schoolId})
- Sentry — error tracking, PII scrubbed from all payloads

### Mobile
- React Native 0.83 (New Architecture / Fabric renderer)
- React Navigation v7 (native stack + bottom tabs)
- react-native-biometrics — Face ID / fingerprint login
- react-native-fast-image — cached image loading
- FCM (Android) + APNs (iOS) — push notifications

### Database & Storage
- PostgreSQL 16 — one fully isolated instance per school
- Redis 7 — per school (caching, BullMQ, pub/sub, session cache)
- GCP Cloud Storage — per-school bucket, files served via signed URLs only

### AI & Voice
- Claude API: claude-sonnet-4-6 — AI agent reasoning
- Sarvam AI (saarika:v2) — STT/TTS for Indian English, Hindi, regional languages
- Whisper (OpenAI) — fallback STT when Sarvam confidence < 0.7

### Infrastructure
- Turborepo monorepo
- GCP asia-south1 (Mumbai) — Cloud Run + Cloud SQL + Secret Manager + Cloud Storage + Memorystore
- Docker + Cloud Run — API services containerized
- Terraform — infrastructure-as-code for per-school provisioning
- GitHub Actions — CI/CD (see OperationsDesignReference Section 2)
- Local dev: Docker Compose only (postgres:16 + redis:7-alpine + mailpit)

### Auth (Decision Pending)
- Clerk (managed, faster) vs Auth.js (self-hosted, more control) — evaluate before Phase 1 auth build
- JWT: 15-min access tokens + 30-day refresh tokens in httpOnly cookies
- One super admin per school, managed via Control Plane (not school DB)

## Monorepo Structure
```
apps/
  web/              — Next.js 16 web app (localhost:3000)
  api/              — Fastify v5 API (localhost:4000)
  mobile/           — React Native 0.83 iOS + Android
  owner-portal/     — Internal ops portal (localhost:3001)
packages/
  types/            — Shared TypeScript interfaces (MetaSchema, PermissionSet, etc.)
  api-client/       — Typed fetch client shared by web + mobile
  ui-tokens/        — Design tokens (CSS vars for web, StyleSheet for mobile — same source)
  schema-engine/    — SME client library
  i18n/             — Shared translation keys + locale files
  utils/            — Date formatting, currency, validation
tools/
  migrate.ts        — Core migration runner (runs against all active schools)
  smoke-test.ts     — Post-deploy smoke tests
packages/migrations/
  core/             — Versioned SQL migration files (001_init.sql, 002_..., etc.)
```

## Architecture
**Two-plane topology:**
- Control Plane: our global ops DB — schools registry, billing, provisioning, monitoring, owner portal, AIIS
- Data Plane: per-school isolated PostgreSQL + Redis + Cloud Storage bucket

**Schema Migration Engine (SME):** most complex component. Real-time, synchronous, transactional DB schema changes triggered by canvas UI actions. Meta-schema registry (_meta_schema table) tracks all tables/fields. Never receives raw SQL — receives typed ChangeDescriptors. Full rollback capability.

**Canvas Builder:** React Flow (engine) + Zustand (state) + Motion (animations). Diff algorithm computes ChangeDescriptors on save. Full undo/redo history.

**AI Agent:** claude-sonnet-4-6. Context = meta-schema + user role + current screen + last 10 turns. 7 tools: query_school_data, create_record, update_record, apply_schema_change, send_notification, generate_report, get_screen_data. Voice: Sarvam AI → Claude → Sarvam TTS.

**WebSockets:** Socket.io per-school namespace /ws/school-{schoolId}. Rooms: dashboard, attendance-{classId}, canvas-{canvasId}, notifications.

## Design System (see OperationsDesignReference Section 5 for full tokens)
- Brand primary: #1A3C6B (deep navy blue)
- Accent: #F59E0B (amber)
- Font: Inter Variable (UI) + JetBrains Mono (code)
- Motion: dur-fast 100ms, dur-normal 200ms, dur-slow 350ms; spring + smooth easings
- Design benchmarks: Apple.com (storytelling), Tesla dashboard (data-dense), Linear.app (SaaS clarity), Notion (info architecture)

## Module Business Logic (Standard Indian School Rules)
- PF: 12% of basic salary (employer)
- ESI: 3.25% employer + 0.75% employee on gross salary < ₹21,000/month
- TDS: per current income tax slabs
- Attendance: present / absent / half-day / late
- Grades: marks-based, configurable grade boundaries per school
- Fees: amount × installment plan; late fee = flat or % (configurable per school)
- Build with sensible defaults — school configures via canvas

## AI Agent Tools (from TechnicalArchitecture Section 8)
Model: claude-sonnet-4-6
Context: meta-schema + user role + current screen + last 10 turns
Tools:
1. query_school_data — READ on target table
2. create_record — CREATE on target table
3. update_record — UPDATE on target table
4. apply_schema_change — CANVAS_EDIT permission only
5. send_notification — any authenticated user
6. generate_report — queued async job, returns jobId
7. get_screen_data — any authenticated user

## Pricing (Locked)
- Starter: ₹14,999/month (up to 500 students)
- Growth: ₹34,999/month (up to 2,000 students, multi-branch up to 3)
- Enterprise: ₹74,999/month (unlimited students + branches)
- 15% discount on annual billing

## API Route Structure
- /api/v1/control/* — Control Plane (platform admin only)
- /api/v1/platform/* — Provisioning, billing, subscription
- /api/v1/school/* — All school data (tenant-scoped)
- /api/v1/schema/* — Schema Migration Engine
- /api/v1/canvas/* — Canvas save/load
- /api/v1/ai/* — AI agent proxy
- /api/v1/auth/* — Authentication
- /ws/* — WebSocket upgrades

## Local Dev Commands
- npm run dev → docker compose up + turbo dev (all apps hot-reload)
- npm run dev:stop → docker compose down + kill processes
- npm run db:reset → wipe + re-seed local DB
- npm run deploy:production → manual production deploy (normally via git push → GitHub Actions)

## GCP Setup (run once before first deploy)
See OperationsDesignReference Section 8.7 for full commands.
GCP project not set up yet. Local Docker Compose only for now.

## Non-Negotiable Rules
- NEVER hardcode secrets — GCP Secret Manager in prod, .env.local locally (never committed)
- ALL DB queries scoped by school_id from JWT — never from request params
- ALL user-supplied column/table names validated against [a-z0-9_] before SQL use
- Parameterized queries only — zero string interpolation into SQL
- Every API route: auth middleware + permission check + rate limit
- TypeScript strict mode — no `any`, no `// @ts-ignore`
- DROP COLUMN = soft delete only (isHidden: true in meta-schema) unless explicit admin confirmation
- Production-grade from line 1

## Build Order (Confirmed)
- Phase 1: Turborepo scaffold → Docker Compose → Control Plane DB → provisioning pipeline → auth
- Phase 2: Core school modules — students, attendance, fees, timetable
- Phase 3: Canvas builder + Schema Migration Engine
- Phase 4: AI agent (chat + voice)
- Phase 5: Mobile app + Avanti Learn + Avanti Device

## Current Phase
**Phase 1** — nothing built yet.
First task: Turborepo monorepo scaffold.

## Standing Rules for Claude Code
1. Read the relevant doc section before building any feature — all docs are in /docs/
2. Present plan → get confirmation → then build. Never build without confirmation first.
3. Never build beyond what was asked
4. Cite the doc section when implementing from spec
