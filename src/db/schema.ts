import { pgTable, text, integer, timestamp, boolean, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { BusinessHour, DeliveryFeeZone } from '../types';

// -----------------------------------------------------------------------------
// 1. CATEGORIES (Danh mục hàng hóa)
// -----------------------------------------------------------------------------
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 2. PRODUCTS (Sản phẩm tạp hóa)
// -----------------------------------------------------------------------------
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode').notNull().unique(),
  name: text('name').notNull(),
  brand: text('brand').default(''),
  category: text('category').notNull().references(() => categories.id),
  unit: text('unit').notNull(),
  costPrice: integer('cost_price').notNull().default(0),
  sellingPrice: integer('selling_price').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  minStockAlert: integer('min_stock_alert').notNull().default(5),
  mfgDate: text('mfg_date').default(''),
  expiryDate: text('expiry_date').default(''),
  batchNumber: text('batch_number').default(''),
  shelfLocation: text('shelf_location').default(''),
  image: text('image').default(''),
  description: text('description').default(''),
  soldCount: integer('sold_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 3. DEBTORS (Danh sách người nợ)
// -----------------------------------------------------------------------------
export const debtors = pgTable('debtors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').default(''),
  address: text('address').default(''),
  note: text('note').default(''),
  creditLimit: integer('credit_limit').notNull().default(2000000),
  totalDebt: integer('total_debt').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SETTLED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 4. DEBT TRANSACTIONS (Lịch sử nợ / trả nợ)
// -----------------------------------------------------------------------------
export const debtTransactions = pgTable('debt_transactions', {
  id: text('id').primaryKey(),
  debtorId: text('debtor_id').notNull().references(() => debtors.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'DEBT' | 'PAYMENT'
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  paymentMethod: text('payment_method').default('CASH'), // 'CASH' | 'VIETQR'
  note: text('note').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 5. DEBT TRANSACTION ITEMS (Chi tiết món hàng trong lần ghi nợ)
// -----------------------------------------------------------------------------
export const debtTransactionItems = pgTable('debt_transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => debtTransactions.id, { onDelete: 'cascade' }),
  productId: text('product_id'),
  barcode: text('barcode'),
  productName: text('product_name').notNull(),
  unit: text('unit').default(''),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  totalPrice: integer('total_price').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 6. ORDERS (Đơn hàng mua sắm)
// -----------------------------------------------------------------------------
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  customerName: text('customer_name').default(''),
  customerPhone: text('customer_phone').default(''),
  customerAddress: text('customer_address').default(''),
  deliveryType: text('delivery_type').default('PICKUP'),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  paymentMethod: text('payment_method').default('CASH'),
  paymentStatus: text('payment_status').default('PENDING'),
  orderStatus: text('order_status').default('COMPLETED'),
  note: text('note').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// 7. ORDER ITEMS (Sản phẩm trong đơn hàng)
// -----------------------------------------------------------------------------
export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  barcode: text('barcode').default(''),
  productName: text('product_name').notNull(),
  price: integer('price').notNull(),
  costPrice: integer('cost_price').default(0),
  quantity: integer('quantity').notNull().default(1),
  unit: text('unit').default(''),
  image: text('image').default(''),
});

// -----------------------------------------------------------------------------
// 8. STORE SETTINGS (Cấu hình cửa hàng)
// -----------------------------------------------------------------------------
export const storeSettings = pgTable('store_settings', {
  id: text('id').primaryKey().default('default'),
  storeName: text('store_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  bankId: text('bank_id').default('MB'),
  bankAccount: text('bank_account').default(''),
  bankAccountName: text('bank_account_name').default(''),
  qrTemplate: text('qr_template').default('compact2'),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  expiryWarningDays: integer('expiry_warning_days').default(30),
  ownerPin: text('owner_pin').default('1234'),
  logoUrl: text('logo_url').default(''),
  businessHours: jsonb('business_hours').$type<BusinessHour[]>().default([]),
  shopLat: doublePrecision('shop_lat'),
  shopLon: doublePrecision('shop_lon'),
  deliveryFeeZones: jsonb('delivery_fee_zones').$type<DeliveryFeeZone[]>().default([]),
  deliveryExtraPerKm: integer('delivery_extra_per_km').default(5000),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// -----------------------------------------------------------------------------
// RELATIONS
// -----------------------------------------------------------------------------
export const debtorsRelations = relations(debtors, ({ many }) => ({
  transactions: many(debtTransactions),
}));

export const debtTransactionsRelations = relations(debtTransactions, ({ one, many }) => ({
  debtor: one(debtors, {
    fields: [debtTransactions.debtorId],
    references: [debtors.id],
  }),
  items: many(debtTransactionItems),
}));

export const debtTransactionItemsRelations = relations(debtTransactionItems, ({ one }) => ({
  transaction: one(debtTransactions, {
    fields: [debtTransactionItems.transactionId],
    references: [debtTransactions.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
