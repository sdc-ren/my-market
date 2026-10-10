import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // DELETE /api/debtors/:id — xóa khách nợ
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const debtorId = Array.isArray(id) ? id[0] : id;
      if (db) {
        await db.delete(schema.debtors).where(eq(schema.debtors.id, debtorId as string));
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting debtor:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
