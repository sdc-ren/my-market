import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from './_db.js';
import {
  hashPin,
  verifyPin,
  isHashedPin,
  buildSessionCookie,
  buildClearSessionCookie,
  isAuthenticated,
  checkRateLimit,
  resetRateLimit,
  getClientIp,
} from './_auth.js';

// ---------------------------------------------------------------------------
// /api/auth?action=login|logout|logout|session — xác thực PIN quản lý.
// Gộp 3 endpoint vào 1 function để không vượt giới hạn 12 functions của Vercel Hobby.
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string | undefined;

  // GET /api/auth?action=session — kiểm tra phiên đăng nhập
  if (action === 'session') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return res.json({ authenticated: isAuthenticated(req) });
  }

  // POST /api/auth?action=logout — đăng xuất
  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Set-Cookie', buildClearSessionCookie());
    return res.json({ success: true });
  }

  // POST /api/auth?action=login — đăng nhập bằng PIN
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    }

    const pin = (req.body as any)?.pin;
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'Thiếu mã PIN' });
    }

    if (!db) {
      return res.status(503).json({ error: 'Chưa kết nối database' });
    }

    try {
      const rows = await db.select().from(schema.storeSettings).limit(1);
      const stored = rows[0]?.ownerPin || '';
      const ok = await verifyPin(pin, stored);
      if (!ok) {
        return res.status(401).json({ error: 'Sai mã PIN' });
      }

      // Tự nâng cấp PIN plaintext cũ lên hash
      if (stored && !isHashedPin(stored)) {
        const hashed = await hashPin(pin);
        await db
          .update(schema.storeSettings)
          .set({ ownerPin: hashed, updatedAt: new Date() })
          .where(eq(schema.storeSettings.id, 'default'));
      }

      resetRateLimit(ip);
      res.setHeader('Set-Cookie', buildSessionCookie());
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Lỗi server' });
    }
  }

  return res.status(400).json({ error: 'Thiếu action (login|logout|session)' });
}
