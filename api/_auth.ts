// =============================================================================
// AUTH — xác thực PIN phía server cho Tạp Hoá Thông Minh.
// - PIN lưu dạng scrypt hash (không bao giờ lưu/trả plaintext).
// - Đăng nhập đúng -> cấp session token ký HMAC trong cookie HttpOnly.
// - Stateless nên chạy tốt trên Vercel serverless (không cần lưu session ở DB).
// - Rate-limit: 5 lần sai / 15 phút / IP (in-memory theo instance).
// Dùng chung cho Vercel functions (api/*) và Express local (server.ts).
// =============================================================================
import { createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

export const SESSION_COOKIE = 'mm_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 giờ

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    console.warn('[auth] SESSION_SECRET chưa cấu hình — dùng secret tạm, session sẽ mất khi restart/deploy.');
  }
  return s || 'dev-only-secret-change-me';
}

// --- PIN hashing (scrypt) ----------------------------------------------------
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export function isHashedPin(stored: string): boolean {
  return stored.startsWith('scrypt$');
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (isHashedPin(stored)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const hash = (await scrypt(pin, salt, 64)) as Buffer;
    const expected = Buffer.from(hashHex, 'hex');
    return hash.length === expected.length && timingSafeEqual(hash, expected);
  }
  // Migration: PIN plaintext cũ (VD: '1234' từ bản seed) — so sánh thường,
  // login thành công sẽ tự nâng cấp lên hash.
  return pin === stored;
}

// --- Session token (HMAC-signed, stateless) -----------------------------------
export function signSession(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function getSessionToken(req: any): string | null {
  const cookie: string = req.headers?.cookie || '';
  const m = cookie.match(/(?:^|;\s*)mm_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function isAuthenticated(req: any): boolean {
  const t = getSessionToken(req);
  return t ? verifySessionToken(t) : false;
}

export function buildSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${encodeURIComponent(signSession())}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Trả về true nếu đã auth, ngược lại tự trả 401 và false. */
export function requireAuth(req: any, res: any): boolean {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: 'Unauthorized — cần đăng nhập quản lý' });
  return false;
}

// --- Rate limiting (5 lần sai / 15 phút / IP, in-memory theo instance) --------
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count += 1;
  return true;
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}

export function getClientIp(req: any): string {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
