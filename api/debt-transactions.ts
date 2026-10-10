import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db, schema } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // POST /api/debt-transactions — ghi giao dịch nợ (atomic):
  // insert transaction + items, rồi cập nhật tổng nợ & trạng thái của khách.
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
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
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
