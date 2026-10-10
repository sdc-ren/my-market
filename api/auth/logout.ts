import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildClearSessionCookie } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  return res.json({ success: true });
}
