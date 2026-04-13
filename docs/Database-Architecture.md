# BidWork Database Architecture & Migration Guide

**Version:** 1.0
**Date:** April 12, 2026
**Status:** Active — Phase 1 (Single Instance, Multi-Schema)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Current State: Phase 1](#2-current-state-phase-1)
3. [Domain Schemas](#3-domain-schemas)
4. [Table Reference](#4-table-reference)
5. [Connection Architecture](#5-connection-architecture)
6. [Migration System](#6-migration-system)
7. [Phase 2: Read Replicas](#7-phase-2-read-replicas)
8. [Phase 3: Domain Database Splitting](#8-phase-3-domain-database-splitting)
9. [Phase 4: Horizontal Scaling](#9-phase-4-horizontal-scaling)
10. [Data Migration Runbook](#10-data-migration-runbook)
11. [Cross-Domain Data Access Rules](#11-cross-domain-data-access-rules)
12. [Monitoring & Alerts](#12-monitoring--alerts)
13. [Backup & Recovery](#13-backup--recovery)

---

## 1. Architecture Overview

BidWork uses a **domain-isolated schema architecture** — three logical domains (Auth, Projects, Bidding) are separated at the PostgreSQL schema level from day one. This enables future migration to separate database servers with minimal code changes.

```
                        PHASE 1 (Current)                    PHASE 3 (Future)
                   ┌─────────────────────┐          ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │   bidwork_db         │          │ auth_db  │ │project_db│ │ bid_db   │
                   │                     │          │          │ │          │ │          │
                   │  ┌── auth ────────┐ │    →     │  users   │ │ projects │ │  bids    │
                   │  │ users          │ │          │  profiles│ │ media    │ │  reviews │
                   │  │ profiles       │ │          │          │ │ tasks    │ │          │
                   │  └────────────────┘ │          └──────────┘ │ ai_jobs  │ └──────────┘
                   │  ┌── projects ────┐ │                       └──────────┘
                   │  │ projects       │ │
                   │  │ project_media  │ │
                   │  │ scope_tasks    │ │
                   │  │ ai_jobs        │ │
                   │  └────────────────┘ │
                   │  ┌── bidding ─────┐ │
                   │  │ bids           │ │
                   │  └────────────────┘ │
                   └─────────────────────┘
```

### Design Principles

1. **Schema = Domain Boundary.** Each domain has its own PostgreSQL schema. All tables for a domain live in its schema.
2. **No Cross-Schema JOINs.** Application code never JOINs tables across schemas. Data enrichment happens at the service layer via separate queries.
3. **Domain DataService Isolation.** Each domain uses its own database connection pool (`authDb`, `projectDb`, `biddingDb`). Today all pools connect to the same instance. Splitting is a config change.
4. **Idempotent Migrations.** Every migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Safe to run repeatedly on any environment.
5. **Cross-Schema References via UUID.** Foreign keys across schemas use UUIDs that are globally unique. When schemas move to separate DBs, the UUIDs remain valid identifiers for API-level lookups.

---

## 2. Current State: Phase 1

**Deployment:** Single PostgreSQL 15+ instance
**Schemas:** `auth`, `projects`, `bidding` (all in one `bidwork_db` database)
**Connection:** All domain pools connect to the same database URL
**Capacity:** Handles up to ~500 projects/day, ~50 concurrent AI pipeline jobs

### Environment Variables (Phase 1)

```env
# All domains use the same database (default behavior)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bidwork_db
DB_USER=postgres
DB_PASSWORD=postgres

# Optional: domain-specific overrides (not set in Phase 1)
# AUTH_DB_URL=postgresql://...
# PROJECT_DB_URL=postgresql://...
# BIDDING_DB_URL=postgresql://...

# AI Worker pool (separate pool, same DB)
AI_WORKER_CONCURRENCY=3
AI_POLL_INTERVAL_MS=3000
```

---

## 3. Domain Schemas

### 3.1 Auth Domain (`auth` schema)

**Purpose:** User identity, authentication, authorization, and professional profiles.
**Owner Service:** `authService.ts`, `profileService.ts`
**Connection Pool:** `authDb` (max 5 connections)

**Tables:**
- `auth.users` — All user accounts (homeowners, contractors, skilled labor)
- `auth.contractor_profiles` — Extended profile for contractors and skilled labor

**Scaling Characteristics:**
- Low write volume (registrations, profile updates)
- Medium read volume (every API request validates JWT → user lookup)
- Candidate for aggressive caching (Redis) before DB splitting

### 3.2 Projects Domain (`projects` schema)

**Purpose:** Home projects, uploaded media, AI-generated scope of work, AI pipeline jobs.
**Owner Service:** `projectService.ts`, `aiPipelineService.ts`
**Connection Pools:** `projectDb` (max 10), `workerDb` (max 5, dedicated to AI worker)

**Tables:**
- `projects.projects` — Home improvement projects with status, bid range, assignment
- `projects.project_media` — S3 references for uploaded photos/videos
- `projects.scope_tasks` — AI-generated and homeowner-edited task list
- `projects.ai_jobs` — Pipeline job queue (classify, scope_gen, bid_calc)

**Scaling Characteristics:**
- High write volume (AI worker constantly polling and writing results)
- High read volume (project listings, scope retrieval, status polling)
- `ai_jobs` table has constant write churn — benefits most from dedicated DB
- Partial index `idx_ai_jobs_pending` keeps worker poll queries fast even with millions of historical rows

### 3.3 Bidding Domain (`bidding` schema)

**Purpose:** Contractor bids, bid lifecycle management, project assignment.
**Owner Service:** `bidService.ts`
**Connection Pool:** `biddingDb` (max 5 connections)

**Tables:**
- `bidding.bids` — Contractor bid submissions with amount, timeline, status

**Scaling Characteristics:**
- Medium write volume (bid submissions during active project periods)
- High read volume (homeowners comparing bids, contractors checking status)
- Unique constraint prevents duplicate bids per contractor per project

---

## 4. Table Reference

### 4.1 auth.users

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| email | VARCHAR(255) | NO | — | Unique |
| password_hash | VARCHAR(255) | NO | — | bcrypt hash |
| first_name | VARCHAR(100) | YES | — | |
| last_name | VARCHAR(100) | YES | — | |
| phone | VARCHAR(20) | YES | — | |
| role | VARCHAR(50) | NO | 'homeowner' | homeowner, contractor, skilled_labor |
| is_onboarded | BOOLEAN | YES | false | Contractors/skilled labor must onboard |
| is_email_verified | BOOLEAN | YES | false | SendGrid verification |
| verification_code | VARCHAR(6) | YES | — | 6-digit code, cleared after verification |
| verification_code_expires | TIMESTAMPTZ | YES | — | 15 min TTL |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

**Indexes:**
- `users_pkey` — PRIMARY KEY (id)
- `idx_auth_users_email` — UNIQUE (email)

### 4.2 auth.contractor_profiles

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | NO | — | FK → auth.users(id) ON DELETE CASCADE |
| business_name | VARCHAR(255) | YES | — | |
| office_address | TEXT | YES | — | |
| phone | VARCHAR(20) | YES | — | |
| license_number | VARCHAR(100) | YES | — | Required for contractors, optional for skilled labor |
| license_type | VARCHAR(100) | YES | — | e.g., General B, C-10 Electrical |
| category | VARCHAR(100) | NO | — | Primary service category |
| skills | TEXT[] | YES | — | Skill tags for skilled labor |
| years_experience | INTEGER | YES | — | |
| bio | TEXT | YES | — | |
| is_verified | BOOLEAN | YES | false | Admin verification status |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

**Indexes:**
- `contractor_profiles_pkey` — PRIMARY KEY (id)
- `contractor_profiles_user_id_key` — UNIQUE (user_id)

### 4.3 projects.projects

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| homeowner_id | UUID | NO | — | References auth.users.id (not FK when split) |
| title | VARCHAR(255) | NO | — | |
| description | TEXT | YES | — | Homeowner's description |
| location_address | TEXT | YES | — | |
| location_lat | DECIMAL(10,8) | YES | — | Geocoded latitude |
| location_lng | DECIMAL(11,8) | YES | — | Geocoded longitude |
| urgency | VARCHAR(20) | YES | 'flexible' | flexible, within_2_weeks, asap |
| quality_tier | VARCHAR(20) | YES | 'standard' | budget, standard, premium |
| category | VARCHAR(100) | YES | — | Set by AI classification |
| complexity_tier | VARCHAR(20) | YES | — | simple, medium, complex (AI) |
| scope_status | VARCHAR(30) | YES | 'uploading' | Pipeline state machine (see below) |
| bid_floor | DECIMAL(10,2) | YES | — | Minimum bid amount (AI calculated) |
| bid_ceiling | DECIMAL(10,2) | YES | — | Maximum bid amount (AI calculated) |
| estimated_days_min | INTEGER | YES | — | |
| estimated_days_max | INTEGER | YES | — | |
| ai_confidence_score | DECIMAL(3,2) | YES | — | 0.00 to 1.00 |
| assigned_contractor_id | UUID | YES | — | References auth.users.id |
| is_approved | BOOLEAN | YES | false | Homeowner approved scope |
| is_listed | BOOLEAN | YES | false | Visible to contractors |
| status | VARCHAR(30) | YES | 'draft' | Overall project status |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

**Indexes:**
- `projects_pkey` — PRIMARY KEY (id)
- `idx_projects_homeowner` — (homeowner_id, created_at DESC)
- `idx_projects_listed` — (category, created_at DESC) WHERE is_listed = true

**Scope Status State Machine:**
```
uploading → classifying → generating_scope → calculating_bids → complete → (approved by homeowner)
                ↓                ↓                  ↓
              failed           failed             failed   → (retry returns to failed stage)
```

**Project Status State Machine:**
```
draft → bidding → assigned → in_progress → completed
                                            → cancelled
```

### 4.4 projects.project_media

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| project_id | UUID | NO | — | FK → projects.projects(id) CASCADE |
| s3_key | VARCHAR(500) | NO | — | S3 object key |
| s3_bucket | VARCHAR(100) | YES | 'bidwork1' | |
| media_type | VARCHAR(20) | NO | — | photo, video, video_frame |
| file_size_bytes | INTEGER | YES | — | |
| mime_type | VARCHAR(100) | YES | — | |
| sort_order | INTEGER | YES | 0 | |
| is_representative | BOOLEAN | YES | false | Used for classification (cheapest AI call) |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

### 4.5 projects.scope_tasks

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| project_id | UUID | NO | — | FK → projects.projects(id) CASCADE |
| sort_order | INTEGER | YES | 0 | |
| title | VARCHAR(255) | NO | — | |
| description | TEXT | YES | — | |
| category | VARCHAR(100) | YES | — | Sub-category |
| quantity | DECIMAL(10,2) | YES | — | |
| unit | VARCHAR(50) | YES | — | sq_ft, linear_ft, each, hour |
| materials | JSONB | YES | '[]' | [{name, estimated_cost}] |
| labor_hours_min | DECIMAL(6,2) | YES | — | |
| labor_hours_max | DECIMAL(6,2) | YES | — | |
| cost_min | DECIMAL(10,2) | YES | — | Per-task floor |
| cost_max | DECIMAL(10,2) | YES | — | Per-task ceiling |
| ai_confidence | DECIMAL(3,2) | YES | — | |
| photo_evidence_keys | TEXT[] | YES | — | S3 keys |
| homeowner_notes | TEXT | YES | — | |
| is_homeowner_added | BOOLEAN | YES | false | Manually added by homeowner |
| is_removed | BOOLEAN | YES | false | Soft delete |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

### 4.6 projects.ai_jobs

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| project_id | UUID | NO | — | FK → projects.projects(id) CASCADE |
| stage | VARCHAR(30) | NO | — | classify, scope_gen, bid_calc |
| status | VARCHAR(20) | YES | 'pending' | pending, processing, completed, failed |
| priority | INTEGER | YES | 0 | Higher = processed first |
| attempt_count | INTEGER | YES | 0 | |
| max_attempts | INTEGER | YES | 3 | |
| scheduled_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | For retry backoff |
| started_at | TIMESTAMPTZ | YES | — | |
| completed_at | TIMESTAMPTZ | YES | — | |
| result | JSONB | YES | — | Raw AI response for debugging |
| last_error | TEXT | YES | — | |
| model_used | VARCHAR(100) | YES | — | e.g., Qwen/Qwen3-VL-8B-Instruct |
| input_tokens | INTEGER | YES | — | Cost tracking |
| output_tokens | INTEGER | YES | — | Cost tracking |
| cost_usd | DECIMAL(8,6) | YES | — | Per-call cost |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_ai_jobs_pending` — PARTIAL INDEX (scheduled_at ASC) WHERE status = 'pending'

**Worker Query Pattern:**
```sql
SELECT id, project_id, stage, attempt_count, max_attempts
FROM projects.ai_jobs
WHERE status = 'pending' AND scheduled_at <= NOW()
ORDER BY priority DESC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

### 4.7 bidding.bids

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | |
| project_id | UUID | NO | — | References projects.projects.id (not FK when split) |
| contractor_id | UUID | NO | — | References auth.users.id (not FK when split) |
| bid_amount | DECIMAL(10,2) | NO | — | Must be within project's floor-ceiling |
| estimated_days | INTEGER | NO | — | |
| proposal_notes | TEXT | YES | — | |
| contractor_name | VARCHAR(200) | YES | — | Denormalized for read performance |
| contractor_category | VARCHAR(100) | YES | — | Denormalized |
| status | VARCHAR(20) | YES | 'pending' | pending, accepted, rejected, withdrawn |
| accepted_at | TIMESTAMPTZ | YES | — | |
| rejected_at | TIMESTAMPTZ | YES | — | |
| created_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | YES | CURRENT_TIMESTAMP | |

**Indexes:**
- `idx_bids_contractor_project` — UNIQUE (project_id, contractor_id) WHERE status != 'withdrawn'
- `idx_bids_project` — (project_id, created_at DESC)
- `idx_bids_contractor` — (contractor_id, created_at DESC)

**Note on Denormalization:** `contractor_name` and `contractor_category` are stored directly on the bid row. This avoids cross-schema JOINs and ensures bid data is self-contained when the bidding schema moves to its own DB. The application sets these values at bid submission time.

---

## 5. Connection Architecture

### Code Structure

```typescript
// server/src/services/domainDb.ts

authDb     → connects to AUTH_DB_URL     || default DB, search_path=auth
projectDb  → connects to PROJECT_DB_URL  || default DB, search_path=projects
biddingDb  → connects to BIDDING_DB_URL  || default DB, search_path=bidding
workerDb   → connects to PROJECT_DB_URL  || separate pool for AI worker
```

### Pool Configuration

| Pool | Max Connections | Purpose |
|------|----------------|---------|
| authDb | 5 | User auth, profile operations |
| projectDb | 10 | Project CRUD, scope management, media |
| biddingDb | 5 | Bid submission, acceptance, listing |
| workerDb | 5 | AI worker polling (isolated from API traffic) |

**Total: 25 connections in Phase 1.** PostgreSQL default is 100 max connections.

### Why workerDb is Separate

The AI worker polls every 3 seconds with `FOR UPDATE SKIP LOCKED`. If it shared the projectDb pool, a burst of API requests could exhaust all connections, starving the worker. A dedicated pool guarantees the worker always has available connections.

---

## 6. Migration System

### How It Works

Each domain has its own migration file:

```
server/src/config/migrations/
├── authMigration.ts       → Creates auth schema + tables
├── projectMigration.ts    → Creates projects schema + tables
└── biddingMigration.ts    → Creates bidding schema + tables
```

The master migration runner (`server/src/config/migrate.ts`) calls all three on server startup. Every statement is idempotent.

### Adding New Tables or Columns

1. **New table in existing domain:** Add `CREATE TABLE IF NOT EXISTS` to that domain's migration file.
2. **New column on existing table:** Add to the migration file after the CREATE TABLE:
   ```typescript
   // In the migration function, after the CREATE TABLE:
   await addColumnIfNotExists(pool, 'schema_name.table_name', 'column_name', 'TYPE DEFAULT value');
   ```
3. **New index:** Add `CREATE INDEX IF NOT EXISTS` — always idempotent.
4. **Never edit existing CREATE TABLE statements.** Always append ALTERs.

### When Deploying a Domain-Specific Service

If you deploy only the auth service to a separate server, it runs only `runAuthMigration()`. The other migrations are skipped because the auth service doesn't import them.

```typescript
// auth-service/src/startup.ts (future)
import { runAuthMigration } from './migrations/authMigration';
const pool = new Pool({ connectionString: process.env.AUTH_DB_URL });
await runAuthMigration(pool);
```

---

## 7. Phase 2: Read Replicas

**When:** 500-2000 projects/day, dashboard queries becoming slow

### Architecture

```
                  ┌──────────────┐
     Writes ─────►│  Primary DB  │
                  │  (bidwork_db) │
                  └──────┬───────┘
                         │ Streaming Replication
                  ┌──────▼───────┐
     Reads  ─────►│ Read Replica │
                  │              │
                  └──────────────┘
```

### Implementation Steps

1. **Create read replica** (AWS RDS: Add Read Replica, or manually configure streaming replication)

2. **Add environment variable:**
   ```env
   DB_READ_URL=postgresql://user:pass@replica-host:5432/bidwork_db
   ```

3. **Update domainDb.ts** to create read-only pools:
   ```typescript
   export const projectDbRead = new DomainDb({
     connectionUrl: process.env.DB_READ_URL || buildUrl('PROJECT_DB_URL'),
     schema: 'projects',
     poolMax: 15,
     label: 'projectDbRead',
   });
   ```

4. **Route read queries to replica** in service layer:
   ```typescript
   // projectService.ts
   async function getAvailableProjects(category: string) {
     return await projectDbRead.queryAll(...);  // reads go to replica
   }
   
   async function createProject(...) {
     return await projectDb.queryOne(...);  // writes go to primary
   }
   ```

5. **Which queries go to replica:**
   - Project listings (GET /api/projects/available)
   - Bid comparisons (GET /api/bids/project/:id)
   - Dashboard stats
   - Any GET that doesn't need millisecond freshness

6. **Which queries stay on primary:**
   - AI worker polling (needs latest state)
   - Writes (obviously)
   - Project status polling (needs real-time accuracy)

### Expected Impact

- 60-70% of read traffic moves to replica
- Primary DB handles only writes + real-time reads
- Replication lag: typically <100ms with streaming replication

---

## 8. Phase 3: Domain Database Splitting

**When:** 2000+ projects/day, or when a single PostgreSQL instance hits CPU/IOPS limits

### Architecture

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Auth DB        │   │  Projects DB     │   │  Bidding DB     │
│   (auth-db.int)  │   │  (proj-db.int)   │   │  (bid-db.int)   │
│                  │   │                  │   │                 │
│   auth.users     │   │  projects.proj.. │   │  bidding.bids   │
│   auth.profiles  │   │  projects.media  │   │                 │
│                  │   │  projects.tasks  │   │                 │
│                  │   │  projects.ai_jobs│   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Step-by-Step Migration Runbook

#### Pre-Migration (1-2 weeks before)

1. **Audit cross-schema references:**
   ```sql
   -- Find all cross-schema foreign key constraints
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE contype = 'f'
     AND (conrelid::regclass::text LIKE 'projects.%' OR conrelid::regclass::text LIKE 'bidding.%')
     AND confrelid::regclass::text LIKE 'auth.%';
   ```

2. **Verify no cross-schema JOINs in code:**
   ```bash
   # Search for any queries joining auth + projects tables
   grep -rn "auth\.\|JOIN.*users\|JOIN.*contractor" server/src/services/projectService.ts
   grep -rn "auth\.\|JOIN.*users\|JOIN.*contractor" server/src/services/bidService.ts
   ```
   If any are found, refactor to use service-level enrichment.

3. **Provision new database servers:**
   - Auth DB: Small instance (low traffic)
   - Projects DB: Large instance (high write IOPS for AI worker)
   - Bidding DB: Medium instance

#### Migration Day

4. **Put application in maintenance mode**

5. **Export each schema:**
   ```bash
   # Export auth schema
   pg_dump -h localhost -U postgres -d bidwork_db \
     --schema=auth \
     --no-owner --no-privileges \
     -f auth_schema_export.sql

   # Export projects schema
   pg_dump -h localhost -U postgres -d bidwork_db \
     --schema=projects \
     --no-owner --no-privileges \
     -f projects_schema_export.sql

   # Export bidding schema
   pg_dump -h localhost -U postgres -d bidwork_db \
     --schema=bidding \
     --no-owner --no-privileges \
     -f bidding_schema_export.sql
   ```

6. **Import into new databases:**
   ```bash
   # On each new DB server, the migration will auto-create tables
   # But to bring existing data:
   
   # Auth DB
   psql -h auth-db.internal -U postgres -d auth_db -f auth_schema_export.sql
   
   # Projects DB
   psql -h project-db.internal -U postgres -d projects_db -f projects_schema_export.sql
   
   # Bidding DB
   psql -h bid-db.internal -U postgres -d bidding_db -f bidding_schema_export.sql
   ```

7. **Update environment variables:**
   ```env
   AUTH_DB_URL=postgresql://user:pass@auth-db.internal:5432/auth_db
   PROJECT_DB_URL=postgresql://user:pass@project-db.internal:5432/projects_db
   BIDDING_DB_URL=postgresql://user:pass@bid-db.internal:5432/bidding_db
   ```

8. **Drop cross-schema foreign key constraints** (they can't work across DBs):
   ```sql
   -- On projects_db: projects.projects.homeowner_id no longer FKs to auth.users
   -- This is fine — the application validates via authService.findUserById()
   
   -- On bidding_db: bidding.bids.project_id no longer FKs to projects.projects
   -- Application validates via projectService.getProject()
   ```

9. **Deploy updated application** — it reads domain URLs from env vars automatically.

10. **Verify:**
    ```bash
    # Test each domain connection
    curl http://app-server/health
    curl -X POST http://app-server/api/auth/login -d '...'
    curl http://app-server/api/projects -H 'Authorization: ...'
    curl http://app-server/api/bids/my-bids -H 'Authorization: ...'
    ```

11. **Remove maintenance mode**

#### Post-Migration

12. **Keep the old bidwork_db for 30 days** as a backup, then decommission.

13. **Add read replicas per domain** as needed (Projects DB benefits most).

14. **Update monitoring** to track each DB independently.

---

## 9. Phase 4: Horizontal Scaling

**When:** 10,000+ projects/day

### Projects DB Sharding (if needed)

Shard by `homeowner_id` using consistent hashing:

```
Shard 0: homeowner_id hash % 4 == 0
Shard 1: homeowner_id hash % 4 == 1
Shard 2: homeowner_id hash % 4 == 2
Shard 3: homeowner_id hash % 4 == 3
```

All project-related tables (projects, media, tasks, ai_jobs) have `project_id`, and every project has `homeowner_id`. A project and all its related data always live on the same shard.

**Implementation:** Use Citus (PostgreSQL extension) for transparent sharding, or implement shard routing in `domainDb.ts`:

```typescript
function getProjectDbForUser(homeownerId: string): DomainDb {
  const shardIndex = hashToShard(homeownerId, SHARD_COUNT);
  return projectDbShards[shardIndex];
}
```

### AI Worker Scaling

The AI worker is stateless — it reads from the DB, calls the API, writes to the DB. Scale by running multiple worker processes:

```
Worker 1 (server A) → polls projects.ai_jobs → FOR UPDATE SKIP LOCKED
Worker 2 (server B) → polls projects.ai_jobs → FOR UPDATE SKIP LOCKED
Worker 3 (server C) → polls projects.ai_jobs → FOR UPDATE SKIP LOCKED
```

Each worker grabs different jobs due to `SKIP LOCKED`. Zero coordination needed.

**Alternative:** Replace PostgreSQL polling with BullMQ + Redis:
- Change `aiWorker.ts` from `setInterval + SQL poll` to `BullMQ.process()`
- `aiPipelineService.ts` stays identical
- Better for high-throughput: Redis pub/sub is faster than SQL polling

---

## 10. Data Migration Runbook

### Checklist for Any Schema Migration

- [ ] New migration is idempotent (IF NOT EXISTS everywhere)
- [ ] No cross-schema JOINs introduced
- [ ] New columns have DEFAULT values (avoid NOT NULL without DEFAULT on existing tables)
- [ ] Indexes added for any new query patterns
- [ ] Migration tested on a copy of production data
- [ ] Rollback plan documented (what to DROP IF EXISTS)

### Adding a New Domain

If a new domain is needed (e.g., `payments`):

1. Create `server/src/config/migrations/paymentMigration.ts`
2. Add `paymentDb` to `domainDb.ts`
3. Add `runPaymentMigration(pool)` call in `migrate.ts`
4. Create service/controller/route files
5. The new domain is immediately split-ready

### Emergency Rollback

If a migration fails in production:

```sql
-- Identify what was created
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('auth', 'projects', 'bidding')
ORDER BY table_schema, table_name;

-- Drop a specific new table (if needed)
DROP TABLE IF EXISTS schema_name.new_table_name CASCADE;

-- Drop a specific new column (if needed)
ALTER TABLE schema_name.table_name DROP COLUMN IF EXISTS column_name;
```

---

## 11. Cross-Domain Data Access Rules

### ALLOWED

```typescript
// Service-level enrichment (separate queries, combined in controller)
const project = await projectService.getProject(id);       // projects schema
const homeowner = await authService.findUserById(project.homeowner_id);  // auth schema
res.json({ project, homeowner: { name: homeowner.first_name } });
```

### FORBIDDEN

```sql
-- NEVER do this — it breaks when schemas are on different DBs
SELECT p.*, u.first_name
FROM projects.projects p
JOIN auth.users u ON p.homeowner_id = u.id;
```

### Denormalization Strategy

For frequently needed cross-domain data, denormalize at write time:

| Table | Denormalized Column | Source | When Set |
|-------|-------------------|--------|----------|
| bidding.bids | contractor_name | auth.users.first_name + last_name | At bid submission |
| bidding.bids | contractor_category | auth.contractor_profiles.category | At bid submission |
| projects.projects | (none currently) | — | — |

If homeowner name is needed on project listings, add `homeowner_name` to `projects.projects` and set it at project creation time.

---

## 12. Monitoring & Alerts

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Connection pool utilization | Each DomainDb pool | >80% of max |
| ai_jobs pending count | `SELECT COUNT(*) FROM projects.ai_jobs WHERE status='pending'` | >50 (queue backing up) |
| ai_jobs avg processing time | `completed_at - started_at` | >60s (AI API slow) |
| ai_jobs failure rate | Failed / total in last hour | >10% |
| Query latency p99 | pg_stat_statements | >500ms |
| Replication lag | pg_stat_replication (Phase 2+) | >1s |

### Health Check Endpoint

```
GET /health
{
  "status": "ok",
  "database": { "auth": "connected", "projects": "connected", "bidding": "connected" },
  "worker": { "running": true, "active_jobs": 2, "concurrency": 3 },
  "timestamp": "..."
}
```

---

## 13. Backup & Recovery

### Phase 1 Backup Strategy

```bash
# Full database backup (all schemas)
pg_dump -h localhost -U postgres -d bidwork_db \
  --format=custom \
  -f backups/bidwork_$(date +%Y%m%d_%H%M%S).dump

# Per-schema backup (for selective restore)
pg_dump -h localhost -U postgres -d bidwork_db --schema=auth -f backups/auth_$(date +%Y%m%d).sql
pg_dump -h localhost -U postgres -d bidwork_db --schema=projects -f backups/projects_$(date +%Y%m%d).sql
pg_dump -h localhost -U postgres -d bidwork_db --schema=bidding -f backups/bidding_$(date +%Y%m%d).sql
```

### Restore

```bash
# Full restore
pg_restore -h localhost -U postgres -d bidwork_db --clean backups/bidwork_20260412.dump

# Schema-specific restore
psql -h localhost -U postgres -d bidwork_db -f backups/auth_20260412.sql
```

### Phase 3 Backup (Separate DBs)

Each database server runs its own backup schedule independently. Auth DB can be backed up less frequently (daily). Projects DB should be backed up more frequently (hourly or continuous WAL archiving) due to AI job data volume.

---

## Appendix A: Entity Relationship Diagram

```
auth.users
  │
  ├── 1:1 ── auth.contractor_profiles (user_id)
  │
  ├── 1:N ── projects.projects (homeowner_id)
  │              │
  │              ├── 1:N ── projects.project_media (project_id)
  │              ├── 1:N ── projects.scope_tasks (project_id)
  │              ├── 1:N ── projects.ai_jobs (project_id)
  │              └── 1:N ── bidding.bids (project_id)
  │
  └── 1:N ── bidding.bids (contractor_id)
```

**Cross-schema references** (UUIDs, not enforced FKs when split):
- `projects.projects.homeowner_id` → `auth.users.id`
- `projects.projects.assigned_contractor_id` → `auth.users.id`
- `bidding.bids.project_id` → `projects.projects.id`
- `bidding.bids.contractor_id` → `auth.users.id`

---

## Appendix B: Environment Variables Reference

| Variable | Default | Phase 1 | Phase 3 |
|----------|---------|---------|---------|
| DB_HOST | localhost | Set | Not used |
| DB_PORT | 5432 | Set | Not used |
| DB_NAME | bidwork_db | Set | Not used |
| DB_USER | postgres | Set | Not used |
| DB_PASSWORD | postgres | Set | Not used |
| AUTH_DB_URL | (uses default DB) | Not set | `postgresql://user:pass@auth-db:5432/auth_db` |
| PROJECT_DB_URL | (uses default DB) | Not set | `postgresql://user:pass@project-db:5432/projects_db` |
| BIDDING_DB_URL | (uses default DB) | Not set | `postgresql://user:pass@bid-db:5432/bidding_db` |
| AI_WORKER_CONCURRENCY | 3 | 3 | 5-10 (more workers on dedicated DB) |
| AI_POLL_INTERVAL_MS | 3000 | 3000 | 1000 (faster polling with dedicated pool) |
