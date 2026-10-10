import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc } from 'drizzle-orm';
import { db, schema } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // GET /api/debtors — sổ ghi nợ (kèm transactions + items)
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
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

  return res.status(405).json({ error: 'Method not allowed' });
}
