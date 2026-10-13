import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, schema } from './_db.js';
import { requireAuth, hashPin } from './_auth.js';
import { geocodeAddress } from './_geo.js';
import { DEFAULT_STORE_SETTINGS } from '../src/data/mockData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // POST /api/settings?action=geocode — địa chỉ → tọa độ (chỉ quản lý).
  // Dùng để lấy tọa độ cửa hàng / kiểm tra địa chỉ giao hàng.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST' && req.query.action === 'geocode') {
    if (!requireAuth(req, res)) return;
    const apiKey = process.env.GEOAPIFY_API_KEY || '';
    if (!apiKey) return res.status(503).json({ error: 'Chưa cấu hình GEOAPIFY_API_KEY' });
    const address = (req.body?.address || '').trim();
    if (!address) return res.status(400).json({ error: 'Thiếu địa chỉ' });
    try {
      const geo = await geocodeAddress(address, apiKey);
      if (!geo) return res.status(404).json({ error: 'Không tìm thấy tọa độ cho địa chỉ này' });
      return res.json(geo);
    } catch (error: any) {
      console.error('Geocode error:', error);
      return res.status(502).json({ error: 'Lỗi gọi Geoapify' });
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/settings — cấu hình cửa hàng (KHÔNG bao giờ trả ownerPin)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (db) {
        const result = await db.select().from(schema.storeSettings).limit(1);
        if (result.length > 0) {
          const { ownerPin: _pin, ...publicSettings } = result[0];
          return res.json({ ...publicSettings, geoapifyConfigured: !!process.env.GEOAPIFY_API_KEY });
        }
      }
      const { ownerPin: _pin, ...publicDefaults } = DEFAULT_STORE_SETTINGS as any;
      return res.json({ ...publicDefaults, geoapifyConfigured: !!process.env.GEOAPIFY_API_KEY });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      return res.json(DEFAULT_STORE_SETTINGS);
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/settings — lưu cấu hình (chỉ quản lý đã đăng nhập).
  // ownerPin nếu có thì hash ở server; không gửi PIN thì giữ nguyên PIN cũ.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    try {
      const s = req.body;
      // ownerPin nếu có thì hash ở server; không gửi thì giữ nguyên PIN cũ
      let ownerPinUpdate: string | undefined;
      if (s.ownerPin && typeof s.ownerPin === 'string' && s.ownerPin.trim() !== '') {
        ownerPinUpdate = await hashPin(s.ownerPin.trim());
      }
      if (db) {
        // Merge với giá trị hiện tại để update thiếu field không làm lỗi NOT NULL
        const cur = (await db.select().from(schema.storeSettings).limit(1))[0] as any;
        const merged = {
          storeName: s.storeName ?? cur?.storeName ?? 'Tạp Hóa',
          phone: s.phone ?? cur?.phone ?? '',
          address: s.address ?? cur?.address ?? '',
          bankId: s.bankId ?? cur?.bankId ?? 'MB',
          bankAccount: s.bankAccount ?? cur?.bankAccount ?? '',
          bankAccountName: s.bankAccountName ?? cur?.bankAccountName ?? '',
          qrTemplate: s.qrTemplate ?? cur?.qrTemplate ?? 'compact2',
          lowStockThreshold: s.lowStockThreshold ?? cur?.lowStockThreshold ?? 5,
          expiryWarningDays: s.expiryWarningDays ?? cur?.expiryWarningDays ?? 30,
          logoUrl: s.logoUrl ?? cur?.logoUrl ?? '',
          businessHours: s.businessHours ?? cur?.businessHours ?? [],
          shopLat: s.shopLat ?? cur?.shopLat ?? null,
          shopLon: s.shopLon ?? cur?.shopLon ?? null,
          deliveryFeeZones: s.deliveryFeeZones ?? cur?.deliveryFeeZones ?? [],
          deliveryExtraPerKm: s.deliveryExtraPerKm ?? cur?.deliveryExtraPerKm ?? 5000,
        };
        await db
          .insert(schema.storeSettings)
          .values({
            id: 'default',
            ...merged,
            ...(ownerPinUpdate ? { ownerPin: ownerPinUpdate } : {}),
          })
          .onConflictDoUpdate({
            target: schema.storeSettings.id,
            set: {
              ...merged,
              ...(ownerPinUpdate ? { ownerPin: ownerPinUpdate } : {}),
              updatedAt: new Date(),
            },
          });
      }
      const { ownerPin: _pin2, ...echoSettings } = s;
      return res.json({ success: true, settings: echoSettings });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
