import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from './_db.js';
import { requireAuth, isAuthenticated } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/orders — danh sách đơn hàng (riêng tư: chỉ quản lý)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
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
  }

  // ---------------------------------------------------------------------------
  // POST /api/orders?action=checkout — THANH TOÁN THỐNG NHẤT (atomic).
  // Đặt TRƯỚC handler upsert để không bị nuốt request.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST' && req.query.action === 'checkout') {
    return handleCheckout(req, res);
  }

  // ---------------------------------------------------------------------------
  // POST /api/orders — upsert đơn hàng (idempotent: xóa items cũ rồi insert lại)
  // - Đơn MỚI: khách được tạo public, nhưng ép orderStatus=PENDING,
  //   paymentStatus=PENDING để chủ shop duyệt sau.
  // - Cập nhật đơn CŨ (đổi trạng thái/thanh toán): chỉ quản lý đã đăng nhập.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const order = req.body;
      if (!order.id || !order.code) {
        return res.status(400).json({ error: 'Missing order id or code' });
      }

      let isNewOrder = true;
      if (db) {
        const existing = await db
          .select({ id: schema.orders.id })
          .from(schema.orders)
          .where(eq(schema.orders.id, order.id))
          .limit(1);
        isNewOrder = existing.length === 0;
      }
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
  }

  // ---------------------------------------------------------------------------
  // POST /api/orders?action=checkout — THANH TOÁN THỐNG NHẤT (atomic).
  // Một lần bán = một DB transaction: tạo đơn + trừ kho + (nếu bán chịu)
  // ghi nợ vào sổ nợ. Sổ đơn hàng và sổ nợ vẫn tách riêng về domain,
  // chỉ gộp thao tác ghi tại thời điểm bán để không lệch số liệu.
  //
  // - CASH / VIETQR: ai cũng checkout được (như tạo đơn mới hiện tại).
  // - DEBT (bán chịu): chỉ quản lý đã đăng nhập (chủ shop quyết định cho ai nợ).
  // - Server tự tính tiền từ giá trong DB, không tin totalAmount client gửi.
  // - Idempotent theo order id: gửi lại cùng id không trừ kho 2 lần.
  // ---------------------------------------------------------------------------

  return res.status(405).json({ error: 'Method not allowed' });
}

// ---------------------------------------------------------------------------
// handleCheckout — tách riêng để dispatch đặt trước handler upsert.
// ---------------------------------------------------------------------------
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      id, code, customerName, customerPhone, customerAddress,
      deliveryType, paymentMethod, note, items, debtorId,
    } = req.body || {};
    if (!id || !code) return res.status(400).json({ error: 'Missing order id or code' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Empty cart' });
    }
    const method = paymentMethod || 'CASH';
    if (!['CASH', 'VIETQR', 'DEBT'].includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    if (method === 'DEBT') {
      if (!requireAuth(req, res)) return;
      if (!debtorId) return res.status(400).json({ error: 'Missing debtorId for debt checkout' });
    }
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    // Chủ quán tự tạo đơn (đã đăng nhập) = duyệt ngay khi tạo → CONFIRMED.
    // Khách vãng lai tự đặt → PENDING để chủ quán duyệt sau.
    const ownerApproved = isAuthenticated(req);

    // Idempotent: đơn đã tồn tại thì trả về luôn, không xử lý lại
    const dup = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.id, id as string))
      .limit(1);

    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const dbProducts = await db
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds as string[]));
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    if (dup.length === 0) {
      // Validate tồn kho trước khi trừ (atomic bên trong transaction)
      const insufficient: { productId: string; name: string; stock: number; requested: number }[] = [];
      let totalAmount = 0;
      const lines: { p: (typeof dbProducts)[number]; qty: number }[] = [];
      for (const it of items) {
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
        const p = byId.get(it.productId);
        if (!p) return res.status(400).json({ error: `Product not found: ${it.productId}` });
        if (p.stock < qty) {
          insufficient.push({ productId: p.id, name: p.name, stock: p.stock, requested: qty });
        }
        totalAmount += p.sellingPrice * qty;
        lines.push({ p, qty });
      }
      if (insufficient.length > 0) {
        return res.status(409).json({ error: 'Insufficient stock', items: insufficient });
      }

      // Kiểm tra khách nợ (nếu bán chịu)
      let debtor: (typeof schema.debtors.$inferSelect) | null = null;
      if (method === 'DEBT') {
        const dRows = await db
          .select()
          .from(schema.debtors)
          .where(eq(schema.debtors.id, debtorId as string))
          .limit(1);
        if (dRows.length === 0) return res.status(400).json({ error: 'Debtor not found' });
        debtor = dRows[0];
      }

      const now = new Date();
      const debtTxId = `dt-${id}`;
      await db.transaction(async (tx) => {
        // 1. Tạo đơn (chủ quán tự tạo: CONFIRMED ngay; khách vãng lai: PENDING chờ duyệt)
        await tx.insert(schema.orders).values({
          id: id as string,
          code: code as string,
          customerName: customerName || '',
          customerPhone: customerPhone || '',
          customerAddress: customerAddress || '',
          deliveryType: deliveryType || 'PICKUP',
          totalAmount,
          paymentMethod: method,
          paymentStatus: 'PENDING',
          orderStatus: ownerApproved ? 'CONFIRMED' : 'PENDING',
          note: note || '',
        });

        // 2. Chi tiết đơn + trừ kho
        for (const { p, qty } of lines) {
          await tx.insert(schema.orderItems).values({
            id: `${id}-${p.id}`,
            orderId: id as string,
            productId: p.id,
            barcode: p.barcode || '',
            productName: p.name,
            price: p.sellingPrice,
            costPrice: p.costPrice || 0,
            quantity: qty,
            unit: p.unit || '',
            image: p.image || '',
          });
          await tx
            .update(schema.products)
            .set({ stock: p.stock - qty, soldCount: (p.soldCount || 0) + qty, updatedAt: now })
            .where(eq(schema.products.id, p.id));
        }

        // 3. Ghi nợ vào sổ nợ (nếu bán chịu) — cùng 1 transaction
        if (method === 'DEBT' && debtor) {
          const newTotalDebt = (debtor.totalDebt || 0) + totalAmount;
          await tx.insert(schema.debtTransactions).values({
            id: debtTxId,
            debtorId: debtor.id,
            type: 'DEBT',
            amount: totalAmount,
            balanceAfter: newTotalDebt,
            paymentMethod: 'DEBT',
            note: `Bán chịu đơn ${code}`,
          });
          for (const { p, qty } of lines) {
            await tx.insert(schema.debtTransactionItems).values({
              id: `${debtTxId}-${p.id}`,
              transactionId: debtTxId,
              productId: p.id,
              barcode: p.barcode || '',
              productName: p.name,
              unit: p.unit || '',
              quantity: qty,
              unitPrice: p.sellingPrice,
              totalPrice: p.sellingPrice * qty,
            });
          }
          await tx
            .update(schema.debtors)
            .set({ totalDebt: newTotalDebt, status: 'ACTIVE', updatedAt: now })
            .where(eq(schema.debtors.id, debtor.id));
        }
      });

      // Trả về để frontend cập nhật 1 lần (server là source of truth)
      const stockUpdates = lines.map(({ p, qty }) => ({
        id: p.id,
        stock: p.stock - qty,
        soldCount: (p.soldCount || 0) + qty,
      }));
      const debtTx =
        method === 'DEBT'
          ? {
              id: debtTxId,
              debtorId: debtorId as string,
              type: 'DEBT' as const,
              amount: totalAmount,
              balanceAfter: (debtor!.totalDebt || 0) + totalAmount,
              paymentMethod: 'DEBT' as const,
              note: `Bán chịu đơn ${code}`,
              createdAt: now.toISOString(),
              items: lines.map(({ p, qty }) => ({
                id: `${debtTxId}-${p.id}`,
                productId: p.id,
                barcode: p.barcode || '',
                productName: p.name,
                unit: p.unit || '',
                quantity: qty,
                unitPrice: p.sellingPrice,
                totalPrice: p.sellingPrice * qty,
              })),
            }
          : undefined;
      return res.json({
        success: true,
        order: {
          id, code, customerName: customerName || '', totalAmount,
          paymentMethod: method, paymentStatus: 'PENDING',
          orderStatus: ownerApproved ? 'CONFIRMED' : 'PENDING',
        },
        stockUpdates,
        debtTransaction: debtTx,
      });
    }

    // Đơn đã tồn tại (gửi lại): trả tồn kho hiện tại để frontend đối chiếu
    const stockUpdates = dbProducts.map((p) => ({
      id: p.id, stock: p.stock, soldCount: p.soldCount || 0,
    }));
    return res.json({ success: true, deduped: true, order: { id, code }, stockUpdates });
  } catch (error: any) {
    console.error('Error during checkout:', error);
    return res.status(500).json({ error: error.message });
  }
}
