import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/products — danh sách sản phẩm
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
  // POST /api/products — upsert sản phẩm
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
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

  return res.status(405).json({ error: 'Method not allowed' });
}
