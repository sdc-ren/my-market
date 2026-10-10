import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from '../_db.js';
import {
  hashPin,
  verifyPin,
  isHashedPin,
  buildSessionCookie,
  checkRateLimit,
  resetRateLimit,
  getClientIp,
} from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
