import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from './_db.js';
import { DEFAULT_STORE_SETTINGS } from '../src/data/mockData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/settings — cấu hình cửa hàng
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (db) {
        const result = await db.select().from(schema.storeSettings).limit(1);
        if (result.length > 0) {
          return res.json(result[0]);
        }
      }
      return res.json(DEFAULT_STORE_SETTINGS);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      return res.json(DEFAULT_STORE_SETTINGS);
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/settings — lưu cấu hình cửa hàng (gồm logoUrl)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const s = req.body;
      if (db) {
        await db
          .insert(schema.storeSettings)
          .values({
            id: 'default',
            storeName: s.storeName,
            phone: s.phone,
            address: s.address,
            bankId: s.bankId || 'MB',
            bankAccount: s.bankAccount || '',
            bankAccountName: s.bankAccountName || '',
            qrTemplate: s.qrTemplate || 'compact2',
            lowStockThreshold: s.lowStockThreshold || 5,
            expiryWarningDays: s.expiryWarningDays || 30,
            ownerPin: s.ownerPin || '1234',
            logoUrl: s.logoUrl || '',
            businessHours: s.businessHours || [],
          })
          .onConflictDoUpdate({
            target: schema.storeSettings.id,
            set: {
              storeName: s.storeName,
              phone: s.phone,
              address: s.address,
              bankId: s.bankId,
              bankAccount: s.bankAccount,
              bankAccountName: s.bankAccountName,
              qrTemplate: s.qrTemplate,
              lowStockThreshold: s.lowStockThreshold,
              expiryWarningDays: s.expiryWarningDays,
              ownerPin: s.ownerPin,
              logoUrl: s.logoUrl || '',
              businessHours: s.businessHours || [],
              updatedAt: new Date(),
            },
          });
      }
      return res.json({ success: true, settings: s });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
