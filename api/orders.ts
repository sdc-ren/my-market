import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/orders — danh sách đơn hàng (kèm items)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
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
  // POST /api/orders — upsert đơn hàng (idempotent: xóa items cũ rồi insert lại)
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const order = req.body;
      if (!order.id || !order.code) {
        return res.status(400).json({ error: 'Missing order id or code' });
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

  return res.status(405).json({ error: 'Method not allowed' });
}
