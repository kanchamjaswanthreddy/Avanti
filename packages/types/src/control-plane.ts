// Avanti Control Plane Types
// From TechnicalArchitecture_v1.docx Section 2.2 & 3.1

import type { PermissionSet } from './permissions';

export type SchoolStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export type Tier = 'starter' | 'growth' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

// State machine for the provisioning pipeline
// Transitions: PENDING → DB_PROVISIONING → DB_READY → REDIS_PROVISIONING →
//   REDIS_READY → STORAGE_PROVISIONING → STORAGE_READY →
//   SCHEMA_SEEDING → SCHEMA_SEEDED → ADMIN_CREATING → ACTIVE
// Any step → PROVISION_FAILED (with error logged)
export type ProvisionState =
  | 'PENDING'
  | 'DB_PROVISIONING'
  | 'DB_READY'
  | 'REDIS_PROVISIONING'
  | 'REDIS_READY'
  | 'STORAGE_PROVISIONING'
  | 'STORAGE_READY'
  | 'SCHEMA_SEEDING'
  | 'SCHEMA_SEEDED'
  | 'ADMIN_CREATING'
  | 'ACTIVE'
  | 'PROVISION_FAILED';

export interface School {
  id: string;
  name: string;
  slug: string; // url-safe identifier, unique
  tier: Tier;
  status: SchoolStatus;
  region: string; // default: 'asia-south1'
  dbSecretId: string | null;     // GCP Secret Manager key for DB creds
  redisSecretId: string | null;  // GCP Secret Manager key for Redis creds
  storageBucket: string | null;  // GCP Cloud Storage bucket name
  dbInstanceId: string | null;   // GCP Cloud SQL instance name
  provisionedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Attached to every request after tenant routing middleware runs.
// db and redis are typed as unknown here; the API package types them concretely.
export interface TenantContext {
  schoolId: string;
  db: unknown;          // pg.Pool — typed as PoolClient in apps/api
  redis: unknown;       // ioredis.Redis — typed in apps/api
  permissions: PermissionSet;
  role: string;
  userId: string;
}

export interface Subscription {
  id: string;
  schoolId: string;
  tier: Tier;
  billingCycle: BillingCycle;
  amountPaise: bigint;   // stored in paise (1 INR = 100 paise)
  status: 'active' | 'past_due' | 'cancelled';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  razorpaySubId: string | null;
  createdAt: Date;
}

export interface ProvisionLog {
  id: string;
  schoolId: string;
  event: 'STARTED' | 'DB_READY' | 'REDIS_READY' | 'SEEDED' | 'ADMIN_CREATED' | 'COMPLETE' | 'FAILED';
  payload: Record<string, unknown> | null;
  error: string | null;
  createdAt: Date;
}
