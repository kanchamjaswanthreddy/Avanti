// Avanti API — Auth Service
// From TechnicalArchitecture_v1.docx Section 7.1
//
// Handles: login, refresh token rotation, logout, forgot/reset password.
// JWT signing is done in the route handler (needs fastify.jwt); this service
// only handles DB operations and token generation.

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getControlPlanePool, getSchoolPool } from '../lib/db.js';

const BCRYPT_COST = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return randomBytes(40).toString('hex');
}

function generateUUID(): string {
  return randomBytes(16).toString('hex').replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    '$1-$2-$3-$4-$5'
  );
}

async function getSchoolContext(schoolId: string) {
  const controlDB = getControlPlanePool();
  const result = await controlDB.query<{
    id: string;
    status: string;
    db_secret_id: string | null;
  }>(
    `SELECT id, status, db_secret_id FROM schools WHERE id = $1`,
    [schoolId]
  );
  const school = result.rows[0];
  if (!school || school.status !== 'ACTIVE') return null;
  const db = await getSchoolPool(school.id, school.db_secret_id);
  return { db };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  role: string;
  roleId: string;
}

export interface LoginResult {
  user: AuthUser;
  refreshToken: string;  // raw token — caller sets as httpOnly cookie
  permHash: string;      // used in JWT payload for permission cache invalidation
}

export type RefreshResult = LoginResult;

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
  schoolId: string;
}

export async function login(creds: LoginCredentials): Promise<LoginResult | null> {
  const ctx = await getSchoolContext(creds.schoolId);
  if (!ctx) return null;

  const { db } = ctx;

  const userResult = await db.query<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role_id: string | null;
    status: string;
  }>(
    `SELECT id, email, name, password_hash, role_id, status
     FROM users
     WHERE school_id = $1 AND email = $2`,
    [creds.schoolId, creds.email.toLowerCase()]
  );

  const user = userResult.rows[0];
  if (!user || user.status !== 'ACTIVE') return null;

  const validPassword = await bcrypt.compare(creds.password, user.password_hash);
  if (!validPassword) return null;

  let role = 'STAFF';
  if (user.role_id) {
    const roleResult = await db.query<{ name: string }>(
      'SELECT name FROM roles WHERE id = $1',
      [user.role_id]
    );
    role = roleResult.rows[0]?.name ?? 'STAFF';
  }

  const refreshToken = generateRawToken();
  const tokenFamily = generateUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, token_family, expires_at)
     VALUES ($1, $2, $3::uuid, $4)`,
    [user.id, hashToken(refreshToken), tokenFamily, expiresAt]
  );

  const permHash = user.role_id
    ? createHash('sha256').update(user.role_id).digest('hex').slice(0, 16)
    : 'no-role';

  return {
    user: {
      id:       user.id,
      schoolId: creds.schoolId,
      email:    user.email,
      name:     user.name,
      role,
      roleId:   user.role_id ?? '',
    },
    refreshToken,
    permHash,
  };
}

// ── Refresh Token Rotation ────────────────────────────────────────────────────

export async function refreshAccessToken(
  rawToken: string,
  schoolId: string
): Promise<RefreshResult | null> {
  const ctx = await getSchoolContext(schoolId);
  if (!ctx) return null;

  const { db } = ctx;
  const tokenHash = hashToken(rawToken);

  const tokenResult = await db.query<{
    id: string;
    user_id: string;
    token_family: string;
    expires_at: Date;
    revoked_at: Date | null;
  }>(
    `SELECT id, user_id, token_family, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  const token = tokenResult.rows[0];
  if (!token) return null;

  // Token reuse detected — revoke entire family (active session theft attempt)
  if (token.revoked_at) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE token_family = $1::uuid AND revoked_at IS NULL`,
      [token.token_family]
    );
    return null;
  }

  // Expired token
  if (new Date() > token.expires_at) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
      [token.id]
    );
    return null;
  }

  // Revoke current token before issuing new one
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
    [token.id]
  );

  const userResult = await db.query<{
    id: string;
    email: string;
    name: string;
    role_id: string | null;
    status: string;
  }>(
    `SELECT id, email, name, role_id, status FROM users WHERE id = $1`,
    [token.user_id]
  );

  const user = userResult.rows[0];
  if (!user || user.status !== 'ACTIVE') return null;

  let role = 'STAFF';
  if (user.role_id) {
    const roleResult = await db.query<{ name: string }>(
      'SELECT name FROM roles WHERE id = $1',
      [user.role_id]
    );
    role = roleResult.rows[0]?.name ?? 'STAFF';
  }

  const newRefreshToken = generateRawToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, token_family, expires_at)
     VALUES ($1, $2, $3::uuid, $4)`,
    [user.id, hashToken(newRefreshToken), token.token_family, expiresAt]
  );

  const permHash = user.role_id
    ? createHash('sha256').update(user.role_id).digest('hex').slice(0, 16)
    : 'no-role';

  return {
    user: { id: user.id, schoolId, email: user.email, name: user.name, role, roleId: user.role_id ?? '' },
    refreshToken: newRefreshToken,
    permHash,
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(rawToken: string, schoolId: string): Promise<void> {
  const ctx = await getSchoolContext(schoolId);
  if (!ctx) return;

  await ctx.db.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(rawToken)]
  );
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function generatePasswordResetToken(
  email: string,
  schoolId: string
): Promise<{ token: string; userName: string } | null> {
  const ctx = await getSchoolContext(schoolId);
  if (!ctx) return null;

  const { db } = ctx;

  const userResult = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM users
     WHERE school_id = $1 AND email = $2 AND status = 'ACTIVE'`,
    [schoolId, email.toLowerCase()]
  );

  const user = userResult.rows[0];
  if (!user) return null; // Don't reveal if email exists

  // Invalidate any existing unused reset tokens for this user
  await db.query(
    `UPDATE password_reset_tokens SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [user.id]
  );

  const resetToken = generateRawToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(resetToken), expiresAt]
  );

  return { token: resetToken, userName: user.name };
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPassword(
  rawToken: string,
  newPassword: string,
  schoolId: string
): Promise<boolean> {
  const ctx = await getSchoolContext(schoolId);
  if (!ctx) return false;

  const { db } = ctx;
  const tokenHash = hashToken(rawToken);

  const tokenResult = await db.query<{
    id: string;
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  const resetToken = tokenResult.rows[0];
  if (!resetToken || resetToken.used_at) return false;
  if (new Date() > resetToken.expires_at) return false;

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [resetToken.id]
    );
    // Revoke all refresh tokens — full session invalidation after password reset
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [resetToken.user_id]
    );
    await client.query('COMMIT');
    return true;
  } catch {
    await client.query('ROLLBACK');
    return false;
  } finally {
    client.release();
  }
}

// ── Hash Password (used by provision script) ──────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}
