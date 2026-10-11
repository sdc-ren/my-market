import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { deleteImageByUrl } from '../_storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // DELETE /api/products/:id — xóa sản phẩm (chỉ quản lý đã đăng nhập).
  // Đồng thời xoá ảnh của sản phẩm khỏi Supabase Storage (best-effort).
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    try {
      const { id } = req.query;
      const productId = Array.isArray(id) ? id[0] : id;
      if (db) {
        const rows = await db
          .select({ image: schema.products.image })
          .from(schema.products)
          .where(eq(schema.products.id, productId as string))
          .limit(1);
        await db.delete(schema.products).where(eq(schema.products.id, productId as string));
        const img = rows[0]?.image;
        if (img) await deleteImageByUrl(img);
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
