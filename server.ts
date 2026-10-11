import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db';
import * as schema from './src/db/schema';
import { requireAuth, hashPin, verifyPin, isHashedPin, buildSessionCookie, buildClearSessionCookie, isAuthenticated, checkRateLimit, resetRateLimit, getClientIp } from './api/_auth.js';
import { randomUUID } from 'crypto';
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET, publicImageUrl, deleteImageByUrl } from './api/_storage.js';
import { eq, desc } from 'drizzle-orm';
import { STORE_CATEGORIES, INITIAL_PRODUCTS, INITIAL_DEBTORS, DEFAULT_STORE_SETTINGS } from './src/data/mockData';

dotenv.config();

// ESM không có __dirname sẵn (chỉ có trong CommonJS) — tự định nghĩa để
// chế độ production (serve thư mục dist/) không crash khi deploy.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// HEALTH & STATUS
// =============================================================================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    databaseConnected: Boolean(db),
    timestamp: new Date().toISOString(),
  });
});

// --- AUTH (server-side PIN) ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
    return;
  }
  const pin = (req.body as any)?.pin;
  if (!pin || typeof pin !== 'string') {
    res.status(400).json({ error: 'Thiếu mã PIN' });
    return;
  }
  try {
    const rows = await db.select().from(schema.storeSettings).limit(1);
    const stored = (rows[0] as any)?.ownerPin || '';
    const ok = await verifyPin(pin, stored);
    if (!ok) {
      res.status(401).json({ error: 'Sai mã PIN' });
      return;
    }
    if (stored && !isHashedPin(stored)) {
      const hashed = await hashPin(pin);
      await db.update(schema.storeSettings).set({ ownerPin: hashed, updatedAt: new Date() }).where(eq(schema.storeSettings.id, 'default'));
    }
    resetRateLimit(ip);
    res.setHeader('Set-Cookie', buildSessionCookie());
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', buildClearSessionCookie());
  res.json({ success: true });
});

app.get('/api/auth/session', (req: Request, res: Response) => {
  res.json({ authenticated: isAuthenticated(req) });
});

// =============================================================================
// 1. PRODUCTS API
// =============================================================================
app.get('/api/products', async (req: Request, res: Response) => {
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
});

app.post('/api/products', async (req: Request, res: Response) => {
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
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { id } = req.params;
    if (db) {
      const rows = await db
        .select({ image: schema.products.image })
        .from(schema.products)
        .where(eq(schema.products.id, id))
        .limit(1);
      await db.delete(schema.products).where(eq(schema.products.id, id));
      const img = (rows[0] as any)?.image;
      if (img) await deleteImageByUrl(img);
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Upload ảnh sản phẩm lên Supabase Storage (chỉ quản lý đã đăng nhập)
app.post('/api/upload-image', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Chưa cấu hình Supabase Storage' });
  }
  try {
    const { dataUrl } = (req.body || {}) as { dataUrl?: string };
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ error: 'Ảnh không hợp lệ (chỉ nhận JPEG/PNG/WebP)' });
    }
    const contentType = m[1];
    const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
    const buffer = Buffer.from(m[3], 'base64');
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Ảnh quá lớn (tối đa 5MB)' });
    }
    const path = `products/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) {
      console.error('Storage upload error:', error.message);
      return res.status(500).json({ error: 'Upload ảnh thất bại' });
    }
    return res.json({ success: true, url: publicImageUrl(path), path });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: 'Lỗi server' });
  }
});

// =============================================================================
// 2. CATEGORIES API
// =============================================================================
app.get('/api/categories', async (req: Request, res: Response) => {
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
});

app.post('/api/categories', async (req: Request, res: Response) => {
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
});

// =============================================================================
// 3. DEBTORS & DEBT LEDGER API (SỔ GHI NỢ)
// =============================================================================
app.get('/api/debtors', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    if (db) {
      const debtorsList = await db
        .select()
        .from(schema.debtors)
        .orderBy(desc(schema.debtors.totalDebt));

      const transList = await db
        .select()
        .from(schema.debtTransactions)
        .orderBy(desc(schema.debtTransactions.createdAt));

      const itemsList = await db.select().from(schema.debtTransactionItems);

      const itemsByTx: Record<string, any[]> = {};
      itemsList.forEach((it) => {
        if (!itemsByTx[it.transactionId]) itemsByTx[it.transactionId] = [];
        itemsByTx[it.transactionId].push({
          id: it.id,
          transactionId: it.transactionId,
          productId: it.productId,
          barcode: it.barcode,
          productName: it.productName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
        });
      });

      const txByDebtor: Record<string, any[]> = {};
      transList.forEach((t) => {
        if (!txByDebtor[t.debtorId]) txByDebtor[t.debtorId] = [];
        txByDebtor[t.debtorId].push({
          id: t.id,
          debtorId: t.debtorId,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          paymentMethod: t.paymentMethod,
          note: t.note,
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
          items: itemsByTx[t.id] || [],
        });
      });

      const fullDebtors = debtorsList.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone || '',
        address: d.address || '',
        note: d.note || '',
        creditLimit: d.creditLimit,
        totalDebt: d.totalDebt,
        status: d.status,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        transactions: txByDebtor[d.id] || [],
      }));

      return res.json(fullDebtors);
    }

    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching debtors:', error);
    return res.json([]);
  }
});

app.post('/api/debtors', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const debtor = req.body;
    if (!debtor.id || !debtor.name) {
      return res.status(400).json({ error: 'Missing debtor id or name' });
    }

    if (db) {
      await db
        .insert(schema.debtors)
        .values({
          id: debtor.id,
          name: debtor.name,
          phone: debtor.phone || '',
          address: debtor.address || '',
          note: debtor.note || '',
          creditLimit: debtor.creditLimit || 2000000,
          totalDebt: debtor.totalDebt || 0,
          status: debtor.status || 'ACTIVE',
        })
        .onConflictDoUpdate({
          target: schema.debtors.id,
          set: {
            name: debtor.name,
            phone: debtor.phone,
            address: debtor.address,
            note: debtor.note,
            creditLimit: debtor.creditLimit,
            totalDebt: debtor.totalDebt,
            status: debtor.status,
            updatedAt: new Date(),
          },
        });
    }

    return res.json({ success: true, debtor });
  } catch (error: any) {
    console.error('Error creating/updating debtor:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debtors/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { id } = req.params;
    if (db) {
      await db.delete(schema.debtors).where(eq(schema.debtors.id, id));
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting debtor:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/debt-transactions', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const { transaction, items, newTotalDebt, newStatus } = req.body;
    if (!transaction || !transaction.id || !transaction.debtorId) {
      return res.status(400).json({ error: 'Invalid transaction payload' });
    }

    if (db) {
      // Execute in atomic transaction
      await db.transaction(async (tx) => {
        // 1. Insert transaction
        await tx.insert(schema.debtTransactions).values({
          id: transaction.id,
          debtorId: transaction.debtorId,
          type: transaction.type,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
          paymentMethod: transaction.paymentMethod || 'CASH',
          note: transaction.note || '',
        });

        // 2. Insert items if any
        if (items && Array.isArray(items) && items.length > 0) {
          for (const it of items) {
            await tx.insert(schema.debtTransactionItems).values({
              id: it.id,
              transactionId: transaction.id,
              productId: it.productId || null,
              barcode: it.barcode || null,
              productName: it.productName,
              unit: it.unit || '',
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice || 0,
              totalPrice: it.totalPrice || 0,
            });
          }
        }

        // 3. Update debtor total debt & status
        if (typeof newTotalDebt === 'number') {
          await tx
            .update(schema.debtors)
            .set({
              totalDebt: newTotalDebt,
              status: newStatus || (newTotalDebt > 0 ? 'ACTIVE' : 'SETTLED'),
              updatedAt: new Date(),
            })
            .where(eq(schema.debtors.id, transaction.debtorId));
        }
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error recording debt transaction:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// 4. ORDERS API
// =============================================================================
app.get('/api/orders', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    if (db) {
      const ordersList = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
      const orderItemsList = await db.select().from(schema.orderItems);

      const itemsByOrder: Record<string, any[]> = {};
      orderItemsList.forEach((it) => {
        if (!itemsByOrder[it.orderId]) itemsByOrder[it.orderId] = [];
        itemsByOrder[it.orderId].push({
          id: it.id,
          productId: it.productId,
          barcode: it.barcode,
          name: it.productName,
          price: it.price,
          costPrice: it.costPrice,
          quantity: it.quantity,
          unit: it.unit,
          image: it.image,
        });
      });

      const fullOrders = ordersList.map((o) => ({
        id: o.id,
        code: o.code,
        customerName: o.customerName || '',
        customerPhone: o.customerPhone || '',
        customerAddress: o.customerAddress || '',
        deliveryType: o.deliveryType || 'PICKUP',
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod || 'CASH',
        paymentStatus: o.paymentStatus || 'PENDING',
        orderStatus: o.orderStatus || 'COMPLETED',
        note: o.note || '',
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        items: itemsByOrder[o.id] || [],
      }));

      return res.json(fullOrders);
    }
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.json([]);
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const order = req.body;
    if (!order.id || !order.code) {
      return res.status(400).json({ error: 'Missing order id or code' });
    }

    // Đơn MỚI: khách tạo public nhưng ép PENDING. Cập nhật đơn CŨ: cần đăng nhập.
    let isNewOrder = true;
    const existing = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.id, order.id))
      .limit(1);
    isNewOrder = existing.length === 0;
    if (!isNewOrder && !requireAuth(req, res)) return;
    if (isNewOrder) {
      order.orderStatus = 'PENDING';
      order.paymentStatus = 'PENDING';
    }

    if (db) {
      await db.transaction(async (tx) => {
        await tx
          .insert(schema.orders)
          .values({
            id: order.id,
            code: order.code,
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            customerAddress: order.customerAddress || '',
            deliveryType: order.deliveryType || 'PICKUP',
            totalAmount: order.totalAmount || 0,
            paymentMethod: order.paymentMethod || 'CASH',
            paymentStatus: order.paymentStatus || 'PENDING',
            orderStatus: order.orderStatus || 'COMPLETED',
            note: order.note || '',
          })
          .onConflictDoUpdate({
            target: schema.orders.id,
            set: {
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerAddress: order.customerAddress,
              deliveryType: order.deliveryType,
              totalAmount: order.totalAmount,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              orderStatus: order.orderStatus,
              note: order.note,
              updatedAt: new Date(),
            },
          });

        if (order.items && Array.isArray(order.items)) {
          // Xóa items cũ để lưu lại idempotent (tránh duplicate key khi cập nhật đơn)
          await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
          for (const it of order.items) {
            await tx.insert(schema.orderItems).values({
              id: it.id || `${order.id}-${it.productId}`,
              orderId: order.id,
              productId: it.productId,
              barcode: it.barcode || '',
              productName: it.name || it.productName || 'Sản phẩm',
              price: it.price || 0,
              costPrice: it.costPrice || 0,
              quantity: it.quantity || 1,
              unit: it.unit || '',
              image: it.image || '',
            });
          }
        }
      });
    }

    return res.json({ success: true, order });
  } catch (error: any) {
    console.error('Error saving order:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// 5. STORE SETTINGS API
// =============================================================================
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    if (db) {
      const result = await db.select().from(schema.storeSettings).limit(1);
      if (result.length > 0) {
        // KHÔNG bao giờ trả ownerPin ra ngoài
        const { ownerPin: _pin, ...publicSettings } = result[0] as any;
        return res.json(publicSettings);
      }
    }
    const { ownerPin: _pin2, ...publicDefaults } = DEFAULT_STORE_SETTINGS as any;
    return res.json(publicDefaults);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.json(DEFAULT_STORE_SETTINGS);
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
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
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// DEV SERVER & STATIC HANDLING (FULL-STACK MOUNT)
// =============================================================================
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Full-stack Server] Chạy tại http://localhost:${PORT}`);
    console.log(`📦 Kết nối PostgreSQL: ${db ? '✅ THÀNH CÔNG (qua Drizzle ORM)' : '⚠️ CHƯA CẤU HÌNH DATABASE_URL'}`);
  });
}

startServer();
