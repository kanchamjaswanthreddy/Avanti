// Avanti API — Control Plane Service
// All queries against the control plane database.
// Called only from /api/v1/control/* routes.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SchoolRow {
  id:             string;
  name:           string;
  slug:           string;
  tier:           'starter' | 'growth' | 'enterprise';
  status:         'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  region:         string;
  dbSecretId:     string | null;
  dbInstanceId:   string | null;
  storageBucket:  string | null;
  provisionedAt:  string | null;
  createdAt:      string;
}

export interface SubscriptionRow {
  id:                 string;
  schoolId:           string;
  tier:               string;
  billingCycle:       'monthly' | 'annual';
  amountPaise:        number;
  status:             'active' | 'past_due' | 'cancelled';
  currentPeriodStart: string | null;
  currentPeriodEnd:   string | null;
  razorpaySubId:      string | null;
  createdAt:          string;
}

export interface ProvisionLogRow {
  id:         string;
  schoolId:   string;
  schoolName: string;
  event:      string;
  payload:    Record<string, unknown> | null;
  error:      string | null;
  createdAt:  string;
}

export interface PlatformStats {
  activeSchools:   number;
  totalSchools:    number;
  activeSubCount:  number;
  pastDueCount:    number;
  mrrPaise:        number;
  arrPaise:        number;
  openIncidents:   number;  // placeholder until incident table exists
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapSchool(r: {
  id: string; name: string; slug: string;
  tier: string; status: string; region: string;
  db_secret_id: string | null; db_instance_id: string | null;
  storage_bucket: string | null;
  provisioned_at: Date | string | null; created_at: Date | string;
}): SchoolRow {
  return {
    id:            r.id,
    name:          r.name,
    slug:          r.slug,
    tier:          r.tier as SchoolRow['tier'],
    status:        r.status as SchoolRow['status'],
    region:        r.region,
    dbSecretId:    r.db_secret_id,
    dbInstanceId:  r.db_instance_id,
    storageBucket: r.storage_bucket,
    provisionedAt: r.provisioned_at
      ? (r.provisioned_at instanceof Date ? r.provisioned_at.toISOString() : String(r.provisioned_at))
      : null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

function mapSub(r: {
  id: string; school_id: string; tier: string; billing_cycle: string;
  amount_paise: string; status: string;
  current_period_start: Date | string | null;
  current_period_end:   Date | string | null;
  razorpay_sub_id: string | null; created_at: Date | string;
}): SubscriptionRow {
  return {
    id:                 r.id,
    schoolId:           r.school_id,
    tier:               r.tier,
    billingCycle:       r.billing_cycle as SubscriptionRow['billingCycle'],
    amountPaise:        Number(r.amount_paise),
    status:             r.status as SubscriptionRow['status'],
    currentPeriodStart: r.current_period_start
      ? (r.current_period_start instanceof Date ? r.current_period_start.toISOString() : String(r.current_period_start))
      : null,
    currentPeriodEnd: r.current_period_end
      ? (r.current_period_end instanceof Date ? r.current_period_end.toISOString() : String(r.current_period_end))
      : null,
    razorpaySubId: r.razorpay_sub_id,
    createdAt:     r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPlatformStats(db: pg.Pool): Promise<PlatformStats> {
  const [schoolsRes, subsRes] = await Promise.all([
    db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count FROM schools GROUP BY status`
    ),
    db.query<{ status: string; amount_sum: string; count: string }>(
      `SELECT status, SUM(amount_paise) AS amount_sum, COUNT(*) AS count
       FROM subscriptions GROUP BY status`
    ),
  ]);

  let activeSchools = 0, totalSchools = 0;
  for (const r of schoolsRes.rows) {
    totalSchools += Number(r.count);
    if (r.status === 'ACTIVE') activeSchools = Number(r.count);
  }

  let mrrPaise = 0, activeSubCount = 0, pastDueCount = 0;
  for (const r of subsRes.rows) {
    if (r.status === 'active') {
      mrrPaise       = Number(r.amount_sum ?? 0);
      activeSubCount = Number(r.count);
    } else if (r.status === 'past_due') {
      pastDueCount = Number(r.count);
    }
  }

  return {
    activeSchools,
    totalSchools,
    activeSubCount,
    pastDueCount,
    mrrPaise,
    arrPaise:      Math.round(mrrPaise * 12 * 0.85), // 15% annual discount
    openIncidents: 0,  // incident tracking system TBD
  };
}

export async function listSchools(db: pg.Pool): Promise<SchoolRow[]> {
  const res = await db.query<{
    id: string; name: string; slug: string;
    tier: string; status: string; region: string;
    db_secret_id: string | null; db_instance_id: string | null;
    storage_bucket: string | null;
    provisioned_at: Date | null; created_at: Date;
  }>(`SELECT id, name, slug, tier, status, region,
             db_secret_id, db_instance_id, storage_bucket,
             provisioned_at, created_at
      FROM schools
      ORDER BY created_at DESC`);
  return res.rows.map(mapSchool);
}

export async function getSchool(db: pg.Pool, id: string): Promise<SchoolRow | null> {
  const res = await db.query<{
    id: string; name: string; slug: string;
    tier: string; status: string; region: string;
    db_secret_id: string | null; db_instance_id: string | null;
    storage_bucket: string | null;
    provisioned_at: Date | null; created_at: Date;
  }>(`SELECT id, name, slug, tier, status, region,
             db_secret_id, db_instance_id, storage_bucket,
             provisioned_at, created_at
      FROM schools WHERE id = $1`, [id]);
  return res.rows[0] ? mapSchool(res.rows[0]) : null;
}

export async function getSchoolSubscription(
  db: pg.Pool,
  schoolId: string
): Promise<SubscriptionRow | null> {
  const res = await db.query<{
    id: string; school_id: string; tier: string; billing_cycle: string;
    amount_paise: string; status: string;
    current_period_start: Date | null; current_period_end: Date | null;
    razorpay_sub_id: string | null; created_at: Date;
  }>(`SELECT id, school_id, tier, billing_cycle, amount_paise, status,
             current_period_start, current_period_end, razorpay_sub_id, created_at
      FROM subscriptions
      WHERE school_id = $1
      ORDER BY created_at DESC LIMIT 1`, [schoolId]);
  return res.rows[0] ? mapSub(res.rows[0]) : null;
}

export async function getSchoolProvisionLog(
  db: pg.Pool,
  schoolId: string
): Promise<ProvisionLogRow[]> {
  const res = await db.query<{
    id: string; school_id: string; event: string;
    payload: Record<string, unknown> | null; error: string | null; created_at: Date;
  }>(`SELECT id, school_id, event, payload, error, created_at
      FROM provision_log
      WHERE school_id = $1
      ORDER BY created_at ASC`, [schoolId]);
  return res.rows.map(r => ({
    id:         r.id,
    schoolId:   r.school_id,
    schoolName: '',
    event:      r.event,
    payload:    r.payload,
    error:      r.error,
    createdAt:  r.created_at.toISOString(),
  }));
}

export async function getRecentProvisionLog(db: pg.Pool, limit = 20): Promise<ProvisionLogRow[]> {
  const res = await db.query<{
    id: string; school_id: string; school_name: string;
    event: string; payload: Record<string, unknown> | null;
    error: string | null; created_at: Date;
  }>(`SELECT pl.id, pl.school_id, s.name AS school_name,
             pl.event, pl.payload, pl.error, pl.created_at
      FROM provision_log pl
      JOIN schools s ON s.id = pl.school_id
      ORDER BY pl.created_at DESC
      LIMIT $1`, [limit]);
  return res.rows.map(r => ({
    id:         r.id,
    schoolId:   r.school_id,
    schoolName: r.school_name,
    event:      r.event,
    payload:    r.payload,
    error:      r.error,
    createdAt:  r.created_at.toISOString(),
  }));
}

export async function listSubscriptions(db: pg.Pool): Promise<(SubscriptionRow & { schoolName: string; schoolSlug: string })[]> {
  const res = await db.query<{
    id: string; school_id: string; tier: string; billing_cycle: string;
    amount_paise: string; status: string;
    current_period_start: Date | null; current_period_end: Date | null;
    razorpay_sub_id: string | null; created_at: Date;
    school_name: string; school_slug: string;
  }>(`SELECT sub.id, sub.school_id, sub.tier, sub.billing_cycle,
             sub.amount_paise, sub.status,
             sub.current_period_start, sub.current_period_end,
             sub.razorpay_sub_id, sub.created_at,
             s.name AS school_name, s.slug AS school_slug
      FROM subscriptions sub
      JOIN schools s ON s.id = sub.school_id
      ORDER BY sub.created_at DESC`);
  return res.rows.map(r => ({
    ...mapSub(r),
    schoolName: r.school_name,
    schoolSlug: r.school_slug,
  }));
}

export async function suspendSchool(db: pg.Pool, id: string): Promise<boolean> {
  const res = await db.query(
    `UPDATE schools SET status = 'SUSPENDED', updated_at = now()
     WHERE id = $1 AND status = 'ACTIVE'`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function activateSchool(db: pg.Pool, id: string): Promise<boolean> {
  const res = await db.query(
    `UPDATE schools SET status = 'ACTIVE', updated_at = now()
     WHERE id = $1 AND status = 'SUSPENDED'`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}
