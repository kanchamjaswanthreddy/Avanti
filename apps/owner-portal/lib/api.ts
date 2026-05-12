// Avanti Owner Portal — Control Plane API Client
// Server-side only. Called from server components + server actions.
// Uses INTERNAL_API_KEY + API_URL environment variables.

const API_URL = (process.env['API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');
const KEY     = process.env['INTERNAL_API_KEY'] ?? '';

async function cpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1/control${path}`, {
    ...init,
    headers: {
      'Content-Type':   'application/json',
      'X-Internal-Key': KEY,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',  // owner portal data must always be fresh
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Control plane API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Tier         = 'starter' | 'growth' | 'enterprise';
export type SchoolStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface School {
  id:             string;
  name:           string;
  slug:           string;
  tier:           Tier;
  status:         SchoolStatus;
  region:         string;
  dbSecretId:     string | null;
  dbInstanceId:   string | null;
  storageBucket:  string | null;
  provisionedAt:  string | null;
  createdAt:      string;
}

export interface Subscription {
  id:                 string;
  schoolId:           string;
  tier:               Tier;
  billingCycle:       'monthly' | 'annual';
  amountPaise:        number;
  status:             'active' | 'past_due' | 'cancelled';
  currentPeriodStart: string | null;
  currentPeriodEnd:   string | null;
  razorpaySubId:      string | null;
  createdAt:          string;
}

export interface ProvisionLogEntry {
  id:         string;
  schoolId:   string;
  schoolName: string;
  event:      string;
  payload:    Record<string, unknown> | null;
  error:      string | null;
  createdAt:  string;
}

export interface PlatformStats {
  activeSchools:  number;
  totalSchools:   number;
  activeSubCount: number;
  pastDueCount:   number;
  mrrPaise:       number;
  arrPaise:       number;
  openIncidents:  number;
}

export interface SchoolDetail extends School {
  subscription: Subscription | null;
  provisionLog: ProvisionLogEntry[];
}

export interface BillingData {
  stats:         PlatformStats;
  subscriptions: (Subscription & { schoolName: string; schoolSlug: string })[];
}

// ── API methods ───────────────────────────────────────────────────────────────

export const controlApi = {
  getStats():                    Promise<PlatformStats>    { return cpFetch('/stats'); },
  getSchools():                  Promise<School[]>          { return cpFetch('/schools'); },
  getSchool(id: string):         Promise<SchoolDetail>      { return cpFetch(`/schools/${encodeURIComponent(id)}`); },
  getProvisioning():             Promise<ProvisionLogEntry[]> { return cpFetch('/provisioning'); },
  getBilling():                  Promise<BillingData>       { return cpFetch('/billing'); },
  suspendSchool(id: string):     Promise<{ success: boolean }> {
    return cpFetch(`/schools/${encodeURIComponent(id)}/suspend`, { method: 'POST' });
  },
  activateSchool(id: string):    Promise<{ success: boolean }> {
    return cpFetch(`/schools/${encodeURIComponent(id)}/activate`, { method: 'POST' });
  },
};

// ── Formatting helpers ────────────────────────────────────────────────────────

export function fmtRupees(paise: number): string {
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
