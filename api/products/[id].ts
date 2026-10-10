import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // DELETE /api/products/:id — xóa sản phẩm (chỉ quản lý đã đăng nhập)
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    try {
      const { id } = req.query;
      const productId = Array.isArray(id) ? id[0] : id;
      if (db) {
        await db.delete(schema.products).where(eq(schema.products.id, productId as string));
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
