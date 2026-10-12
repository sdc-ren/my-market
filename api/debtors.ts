import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/debtors — sổ ghi nợ (kèm transactions + items)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
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
  }

  // ---------------------------------------------------------------------------
  // POST /api/debtors — upsert khách nợ
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
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
  }

  // ---------------------------------------------------------------------------
  // POST /api/debtors?action=transaction — ghi giao dịch nợ (atomic):
  // insert transaction + items, rồi cập nhật tổng nợ & trạng thái của khách.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST' && req.query.action === 'transaction') {
    if (!requireAuth(req, res)) return;
    try {
      const { transaction, items, newTotalDebt, newStatus } = req.body;
      if (!transaction || !transaction.id || !transaction.debtorId) {
        return res.status(400).json({ error: 'Invalid transaction payload' });
      }

      if (db) {
        await db.transaction(async (tx) => {
          await tx.insert(schema.debtTransactions).values({
            id: transaction.id,
            debtorId: transaction.debtorId,
            type: transaction.type,
            amount: transaction.amount,
            balanceAfter: transaction.balanceAfter,
            paymentMethod: transaction.paymentMethod || 'CASH',
            note: transaction.note || '',
          });

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
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/debtors?id=xxx — xóa khách nợ (chỉ quản lý đã đăng nhập)
  // ---------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    try {
      const idParam = req.query.id;
      const debtorId = Array.isArray(idParam) ? idParam[0] : idParam;
      if (!debtorId) return res.status(400).json({ error: 'Missing debtor id' });
      if (db) {
        await db.delete(schema.debtors).where(eq(schema.debtors.id, debtorId as string));
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting debtor:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
