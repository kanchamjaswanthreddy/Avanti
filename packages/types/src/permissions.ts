// Avanti Permission System
// From TechnicalArchitecture_v1.docx Section 5.4
// Permissions are stored in role_permissions table and cached in Redis.
// Enforced at API layer on every Fastify route handler via assertPermission().

export type ResourceType = string; // module names: 'students', 'fees', 'payroll', etc.

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';

export interface FieldPermission {
  fieldId: string;
  readable: boolean;
  writable: boolean;
}

export interface ResourcePermission {
  resource: ResourceType;
  actions: ActionType[];
  fieldPermissions: FieldPermission[];
  // e.g. 'branch_id = :userBranchId' — row-level filter applied to all queries
  rowFilter?: string;
}

export interface PermissionSet {
  roleId: string;
  permissions: ResourcePermission[];
}
