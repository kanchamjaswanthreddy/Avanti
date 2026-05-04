// Avanti Authentication Types
// From TechnicalArchitecture_v1.docx Section 7.1
//
// Access tokens: 15 minutes
// Refresh tokens: 30 days, stored in httpOnly cookie with Secure + SameSite=Strict

export interface JWTPayload {
  sub: string;          // userId
  schoolId: string;
  role: string;
  permHash: string;     // SHA-256 of permission set — detects stale Redis cache
  iat: number;
  exp: number;          // access token: iat + 900 (15 min)
}

export interface RefreshTokenPayload {
  sub: string;          // userId
  schoolId: string;
  tokenFamily: string;  // for rotation — invalidate entire family on reuse detection
  iat: number;
  exp: number;          // iat + 2592000 (30 days)
}

export interface SessionUser {
  userId: string;
  schoolId: string;
  role: string;
  email: string;
  name: string;
}
