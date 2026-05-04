// Vidyut AI Incident Intelligence System — Types
// From OperationsDesignReference_v1.docx Section 6
//
// The AIIS monitors all school deployments, detects issues, and delivers
// plain-English incident reports to the Company Owner Portal.

export type IncidentSeverity = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';

export type IncidentSignalType =
  | 'API_ERROR_RATE_SPIKE'
  | 'SCHEMA_MIGRATION_FAILURE'
  | 'PROVISIONING_STUCK'
  | 'DB_CONNECTION_EXHAUSTION'
  | 'MEMORY_CPU_SPIKE'
  | 'CANVAS_SAVE_FAILURE'
  | 'AI_AGENT_TOOL_ERROR'
  | 'SLOW_QUERY_DETECTED'
  | 'BILLING_ANOMALY'
  | 'MOBILE_CRASH_RATE'
  | 'SECURITY_ANOMALY';

export interface IncidentSignal {
  type: IncidentSignalType;
  severity: IncidentSeverity;
  schoolIds: string[];
  detectedAt: string; // ISO timestamp
  metadata: Record<string, unknown>;
}

export interface IncidentReport {
  id: string;
  detectedAt: string;
  resolvedAt: string | null;
  severity: IncidentSeverity;
  type: string;
  affectedSchools: string[];
  affectedUsers: number;
  // Plain English — what the owner reads
  ownerSummary: string;
  rootCause: string;
  immediateAction: string;
  longTermFix: string;
  // Technical detail — for engineering team
  technicalDetail: string;
  stackTrace?: string;
  slowQueries?: string[];
  isAutoResolvable: boolean;
  autoResolved: boolean;
  estimatedImpact: string;
}
