// Avanti Input Validation Utilities
// From TechnicalArchitecture_v1.docx Section 4.4 (SME Validation Rules)
// CRITICAL: All user-supplied column/table names MUST pass these checks
// before being used in ANY SQL statement.

// PostgreSQL reserved words that cannot be used as column/table names.
// This is a subset of the most common ones — expand as needed.
const PG_RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc',
  'asymmetric', 'authorization', 'between', 'bigint', 'binary', 'bit',
  'boolean', 'both', 'by', 'case', 'cast', 'char', 'character', 'check',
  'coalesce', 'collate', 'collation', 'column', 'concurrently', 'constraint',
  'create', 'cross', 'current_catalog', 'current_date', 'current_role',
  'current_schema', 'current_time', 'current_timestamp', 'current_user',
  'dec', 'decimal', 'default', 'deferrable', 'deferred', 'desc', 'distinct',
  'do', 'else', 'end', 'except', 'extract', 'false', 'fetch', 'float',
  'for', 'foreign', 'freeze', 'from', 'full', 'grant', 'group', 'having',
  'ilike', 'in', 'initially', 'inner', 'int', 'integer', 'intersect',
  'into', 'is', 'isnull', 'join', 'lateral', 'leading', 'left', 'like',
  'limit', 'localtime', 'localtimestamp', 'national', 'natural', 'nchar',
  'none', 'not', 'notnull', 'null', 'nullif', 'numeric', 'offset', 'on',
  'only', 'or', 'order', 'outer', 'over', 'overlaps', 'overlay', 'placing',
  'position', 'precision', 'primary', 'real', 'references', 'returning',
  'right', 'row', 'select', 'session_user', 'similar', 'smallint', 'some',
  'symmetric', 'table', 'tablesample', 'text', 'then', 'time', 'timestamp',
  'to', 'trailing', 'treat', 'trim', 'true', 'union', 'unique', 'user',
  'using', 'values', 'varchar', 'variadic', 'verbose', 'when', 'where',
  'window', 'with', 'xmlexists', 'xmlparse', 'xmlroot', 'xmlserialize',
]);

// Avanti internal table names that must never be used by school admins
const VIDYUT_RESERVED = new Set([
  '_meta_schema', '_migration_log', '_migration_history',
  'users', 'roles', 'role_permissions', 'schools',
]);

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validates a column or table name supplied by a school admin via the canvas.
 * MUST be called before any user-supplied name is used in SQL.
 *
 * Rules (from TechnicalArchitecture_v1.docx Section 4.4):
 * 1. Only lowercase letters, digits, underscores: [a-z0-9_]
 * 2. Must not start with a digit or underscore
 * 3. Max 63 characters (PostgreSQL identifier limit)
 * 4. Must not be a PostgreSQL reserved word
 * 5. Must not be a Avanti internal table name
 */
export function validateIdentifier(name: string): ValidationResult {
  if (!name || name.length === 0) {
    return { ok: false, error: 'Name cannot be empty.' };
  }

  if (name.length > 63) {
    return { ok: false, error: 'Name must be 63 characters or fewer.' };
  }

  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return {
      ok: false,
      error: 'Names can only contain lowercase letters, numbers, and underscores, and must start with a letter.',
    };
  }

  if (PG_RESERVED_WORDS.has(name)) {
    return { ok: false, error: `"${name}" is a reserved word. Choose a different name.` };
  }

  if (VIDYUT_RESERVED.has(name)) {
    return { ok: false, error: `"${name}" is reserved by the platform. Choose a different name.` };
  }

  return { ok: true };
}

/**
 * Safe identifier for use in SQL strings.
 * Call validateIdentifier() first — this is a second layer of defense.
 * Only allows through names that pass the [a-z0-9_] whitelist.
 */
export function sanitizeIdentifier(name: string): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (sanitized !== name.toLowerCase()) {
    throw new Error(
      `Identifier "${name}" contains invalid characters and was not validated before sanitization.`
    );
  }
  return sanitized;
}

/**
 * Validates an email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a school slug (URL-safe identifier).
 * e.g. 'delhi-public-school-rohini'
 */
export function validateSlug(slug: string): ValidationResult {
  if (!slug || slug.length === 0) {
    return { ok: false, error: 'Slug cannot be empty.' };
  }
  if (slug.length > 64) {
    return { ok: false, error: 'Slug must be 64 characters or fewer.' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens.' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, error: 'Slug cannot start or end with a hyphen.' };
  }
  return { ok: true };
}
