import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.json({ authenticated: isAuthenticated(req) });
}
