import crypto from 'node:crypto';
import { injectable } from 'inversify';
import {
  ForgeJwtPayload,
  MembershipRole,
  UnauthorizedError,
  TokenExpiredError,
} from './types.js';

/**
 * JWT service using Node's built-in crypto module (HS256).
 *
 * Produces compact JWS tokens:  base64url(header).base64url(payload).base64url(sig)
 */
@injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expirySeconds: number;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'CHANGE-ME-IN-PRODUCTION';
    this.expirySeconds = parseInt(process.env.JWT_EXPIRY_SECONDS || '86400', 10); // 24h default

    if (this.secret === 'CHANGE-ME-IN-PRODUCTION' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
  }

  // ── Sign ──────────────────────────────────────────────────────────────────

  signToken(userId: string, tenantId: string, role: MembershipRole): string {
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload: ForgeJwtPayload = {
      sub: userId,
      tid: tenantId,
      role,
      iat: now,
      exp: now + this.expirySeconds,
    };

    const headerB64 = this.base64urlEncode(JSON.stringify(header));
    const payloadB64 = this.base64urlEncode(JSON.stringify(payload));
    const signature = this.sign(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  // ── Verify ────────────────────────────────────────────────────────────────

  verifyToken(token: string): ForgeJwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Malformed token');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSig = this.sign(`${headerB64}.${payloadB64}`);
    if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))) {
      throw new UnauthorizedError('Invalid token signature');
    }

    // Decode payload
    let payload: ForgeJwtPayload;
    try {
      payload = JSON.parse(this.base64urlDecode(payloadB64));
    } catch {
      throw new UnauthorizedError('Malformed token payload');
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new TokenExpiredError();
    }

    return payload;
  }

  // ── Decode without verification (e.g. for logging) ────────────────────────

  decodePayload(token: string): ForgeJwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(this.base64urlDecode(parts[1]));
    } catch {
      return null;
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  private base64urlEncode(str: string): string {
    return Buffer.from(str).toString('base64url');
  }

  private base64urlDecode(b64: string): string {
    return Buffer.from(b64, 'base64url').toString('utf-8');
  }
}
