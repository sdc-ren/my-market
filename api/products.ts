import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from './_db.js';
import { requireAuth } from './_auth.js';
import { deleteImageByUrl } from './_storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/products — danh sách sản phẩm (public cho trang bán hàng)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (db) {
        const allProducts = await db.select().from(schema.products).orderBy(schema.products.name);
        return res.json(allProducts);
      }
      return res.json([]);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: error.message, fallback: [] });
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/products — upsert sản phẩm (chỉ quản lý đã đăng nhập)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    try {
      const product = req.body;
      if (!product.id || !product.barcode || !product.name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (db) {
        await db
          .insert(schema.products)
          .values({
            id: product.id,
            barcode: product.barcode,
            name: product.name,
            brand: product.brand || '',
            category: product.category || 'other',
            unit: product.unit || 'cái',
            costPrice: product.costPrice || 0,
            sellingPrice: product.sellingPrice || 0,
            stock: product.stock || 0,
            minStockAlert: product.minStockAlert || 5,
            mfgDate: product.mfgDate || '',
            expiryDate: product.expiryDate || '',
            batchNumber: product.batchNumber || '',
            shelfLocation: product.shelfLocation || '',
            image: product.image || '',
            description: product.description || '',
            soldCount: product.soldCount || 0,
          })
          .onConflictDoUpdate({
            target: schema.products.id,
            set: {
              barcode: product.barcode,
              name: product.name,
              brand: product.brand,
              category: product.category,
              unit: product.unit,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              stock: product.stock,
              minStockAlert: product.minStockAlert,
              mfgDate: product.mfgDate,
              expiryDate: product.expiryDate,
              batchNumber: product.batchNumber,
              shelfLocation: product.shelfLocation,
              image: product.image,
              description: product.description,
              soldCount: product.soldCount,
              updatedAt: new Date(),
            },
          });
        return res.json({ success: true, product });
      }

      return res.json({ success: true, product, localOnly: true });
    } catch (error: any) {
      console.error('Error saving product:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/products?id=xxx — xóa sản phẩm (chỉ quản lý đã đăng nhập).
  // Đồng thời xoá ảnh của sản phẩm khỏi Supabase Storage (best-effort).
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    try {
      const idParam = req.query.id;
      const productId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!productId) return res.status(400).json({ error: 'Missing product id' });
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
