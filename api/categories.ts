import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from './_db.js';
import { requireAuth } from './_auth.js';
import { STORE_CATEGORIES } from '../src/data/mockData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/categories — danh sách danh mục
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (db) {
        const allCategories = await db.select().from(schema.categories);
        return res.json(allCategories);
      }
      return res.json(STORE_CATEGORIES);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return res.json(STORE_CATEGORIES);
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/categories — upsert danh mục (chỉ quản lý đã đăng nhập)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    try {
      const cat = req.body;
      if (db) {
        await db
          .insert(schema.categories)
          .values({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || 'Folder',
            color: cat.color || 'blue',
            description: cat.description || '',
          })
          .onConflictDoUpdate({
            target: schema.categories.id,
            set: {
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              description: cat.description,
            },
          });
      }
      return res.json({ success: true, category: cat });
    } catch (error: any) {
      console.error('Error saving category:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
