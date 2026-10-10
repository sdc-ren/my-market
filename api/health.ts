import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.json({
    status: 'ok',
    databaseConnected: Boolean(db),
    timestamp: new Date().toISOString(),
  });
}
