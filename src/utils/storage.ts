import { Product, InventoryTransaction, Order, AppNotification, StoreSettings, Category, Debtor, DebtTransaction, DebtTransactionItem } from '../types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, DEFAULT_STORE_SETTINGS, STORE_CATEGORIES, INITIAL_DEBTORS } from '../data/mockData';
import { getExpiryStatus } from './vietqr';
import { apiClient } from './apiClient';

const STORAGE_KEYS = {
  PRODUCTS: 'taphoa_products_v1',
  CATEGORIES: 'taphoa_categories_v1',
  TRANSACTIONS: 'taphoa_transactions_v1',
  ORDERS: 'taphoa_orders_v1',
  NOTIFICATIONS: 'taphoa_notifications_v1',
  SETTINGS: 'taphoa_settings_v1',
  ACTIVE_ORDER_ID: 'taphoa_active_customer_order_id',
  DEBTORS: 'taphoa_debtors_v1',
};

// Real-time broadcast channel across browser tabs/windows
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('taphoa_sync_channel');
  }
} catch {
  console.warn('BroadcastChannel not supported');
}

export function broadcastMessage(type: string, payload?: any) {
  if (channel) {
    try {
      channel.postMessage({ type, payload, timestamp: Date.now() });
    } catch (e) {
      console.error('Error broadcasting message', e);
    }
  }
}

export function subscribeToBroadcast(callback: (event: { type: string; payload?: any }) => void): () => void {
  if (!channel) return () => {};
  const handler = (ev: MessageEvent) => {
    if (ev.data && ev.data.type) {
      callback(ev.data);
    }
  };
  channel.addEventListener('message', handler);
  return () => {
    channel?.removeEventListener('message', handler);
  };
}

// Play notification sound using clean Web Audio API
export function playDingSound(type: 'order' | 'alert' | 'beep' = 'order') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'order') {
      // Pleasant double chime for new order
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'beep') {
      // Barcode scan beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else {
      // Alert warning
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Silent fallback if audio context blocked before user gesture
  }
}

// STORAGE GETTERS & SETTERS
export function getStoredProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    broadcastMessage('PRODUCTS_UPDATED', products);
  } catch (e) {
    console.error('Failed to save products', e);
  }
}

export function getStoredCategories(): Category[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(STORE_CATEGORIES));
      return STORE_CATEGORIES;
    }
    const parsed: Category[] = JSON.parse(data);
    // Ensure 'all' category always exists at index 0
    if (!parsed.some((c) => c.id === 'all')) {
      parsed.unshift(STORE_CATEGORIES[0]);
    }
    return parsed;
  } catch {
    return STORE_CATEGORIES;
  }
}

export function saveStoredCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    broadcastMessage('CATEGORIES_UPDATED', categories);
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

export function getStoredTransactions(): InventoryTransaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveStoredTransactions(transactions: InventoryTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    broadcastMessage('TRANSACTIONS_UPDATED', transactions);
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
}

export function getStoredOrders(): Order[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!data) {
      // Create one sample order
      const sampleOrder: Order = {
        id: 'ord-sample-01',
        code: 'DH-8902',
        customerName: 'Chị Lan (Chung cư 3B)',
        customerPhone: '0912 345 678',
        customerAddress: 'Phòng 402, Lô B Chung cư An Phú',
        deliveryType: 'DELIVERY',
        items: [
          {
            productId: 'prod-001',
            barcode: '8934563028124',
            productName: 'Mì Hảo Hảo Tôm Chua Cay 75g',
            price: 4500,
            costPrice: 3800,
            quantity: 5,
            unit: 'Gói',
            image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
          },
          {
            productId: 'prod-002',
            barcode: '8935049500544',
            productName: 'Nước ngọt Coca-Cola Sleek lon 320ml',
            price: 11000,
            costPrice: 8500,
            quantity: 2,
            unit: 'Lon',
            image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
          },
        ],
        totalAmount: 44500,
        paymentMethod: 'VIETQR',
        paymentStatus: 'PAID',
        orderStatus: 'PACKING',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        note: 'Giao trước 12h trưa giúp em ạ',
      };
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([sampleOrder]));
      return [sampleOrder];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    broadcastMessage('ORDERS_UPDATED', orders);
  } catch (e) {
    console.error('Failed to save orders', e);
  }
}

export function getStoredSettings(): StoreSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_STORE_SETTINGS;
    return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoredSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    broadcastMessage('SETTINGS_UPDATED', settings);
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!data) {
      const initialNotifs: AppNotification[] = [
        {
          id: 'notif-exp-01',
          type: 'EXPIRY_ALERT',
          title: 'Cảnh báo hạn sử dụng',
          message: 'Bánh Oreo Vani 119.6g còn 7 ngày nữa hết hạn. Cần giảm giá hoặc đưa ra vị trí nổi bật!',
          timestamp: new Date().toISOString(),
          read: false,
          productId: 'prod-004',
        },
        {
          id: 'notif-stock-01',
          type: 'STOCK_LOW',
          title: 'Cảnh báo sắp hết hàng',
          message: 'Sữa tươi Vinamilk 1L chỉ còn 4 hộp trong kho (dưới mức tối thiểu 10).',
          timestamp: new Date().toISOString(),
          read: false,
          productId: 'prod-003',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotifs));
      return initialNotifs;
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifs: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    broadcastMessage('NOTIFICATIONS_UPDATED', notifs);
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

// Generate automatic inventory & expiry audit reports
export function generateInventoryAuditReport(products: Product[], settings: StoreSettings): {
  lowStockItems: Product[];
  expiredItems: Product[];
  nearExpiryItems: Product[];
  totalStockQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  estimatedProfit: number;
} {
  const lowStockItems = products.filter(p => p.stock <= (p.minStockAlert || settings.lowStockThreshold));
  const expiredItems: Product[] = [];
  const nearExpiryItems: Product[] = [];

  let totalStockQuantity = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;

  for (const p of products) {
    totalStockQuantity += p.stock;
    totalCostValue += p.stock * p.costPrice;
    totalRetailValue += p.stock * p.sellingPrice;

    const exp = getExpiryStatus(p.expiryDate, settings.expiryWarningDays);
    if (exp.status === 'EXPIRED') {
      expiredItems.push(p);
    } else if (exp.status === 'CRITICAL' || exp.status === 'WARNING') {
      nearExpiryItems.push(p);
    }
  }

  return {
    lowStockItems,
    expiredItems,
    nearExpiryItems,
    totalStockQuantity,
    totalCostValue,
    totalRetailValue,
    estimatedProfit: totalRetailValue - totalCostValue,
  };
}

// ==============================================================================
// QUẢN LÝ SỔ GHI NỢ KHÁCH HÀNG (DEBTOR MANAGEMENT)
// ==============================================================================

export function getStoredDebtors(): Debtor[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEBTORS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify(INITIAL_DEBTORS));
      return INITIAL_DEBTORS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_DEBTORS;
  }
}

export function saveStoredDebtors(debtors: Debtor[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify(debtors));
    broadcastMessage('DEBTORS_UPDATED', debtors);

    // Asynchronous background sync to Backend API
    debtors.forEach((d) => {
      apiClient.saveDebtor(d).catch(() => {});
    });
  } catch (e) {
    console.error('Failed to save debtors', e);
  }
}

/**
 * Tạo người nợ mới
 */
export function createNewDebtor(
  debtors: Debtor[],
  data: {
    name: string;
    phone?: string;
    address?: string;
    note?: string;
    creditLimit?: number;
    initialDebt?: number;
    initialDebtNote?: string;
  }
): { updatedDebtors: Debtor[]; newDebtor: Debtor } {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const debtorId = `debt-${Date.now()}`;
  const initialDebt = Math.max(0, data.initialDebt || 0);

  const transactions: DebtTransaction[] = [];
  if (initialDebt > 0) {
    const transId = `dtrans-${Date.now()}`;
    const trans: DebtTransaction = {
      id: transId,
      debtorId,
      type: 'DEBT',
      amount: initialDebt,
      balanceAfter: initialDebt,
      note: data.initialDebtNote || 'Nợ ghi ban đầu khi tạo sổ',
      createdAt: dateStr,
    };
    transactions.push(trans);
    apiClient.recordDebtTransaction(trans, [], initialDebt, 'ACTIVE').catch(() => {});
  }

  const newDebtor: Debtor = {
    id: debtorId,
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    address: data.address?.trim() || '',
    note: data.note?.trim() || '',
    creditLimit: data.creditLimit || 2000000,
    totalDebt: initialDebt,
    status: initialDebt > 0 ? 'ACTIVE' : 'SETTLED',
    createdAt: dateStr,
    updatedAt: dateStr,
    transactions,
  };

  const updatedDebtors = [newDebtor, ...debtors];
  saveStoredDebtors(updatedDebtors);
  apiClient.saveDebtor(newDebtor).catch(() => {});
  return { updatedDebtors, newDebtor };
}

/**
 * Ghi nợ thêm cho một khách hàng
 */
export function recordDebtToDebtor(
  debtors: Debtor[],
  debtorId: string,
  amount: number,
  items: DebtTransactionItem[] = [],
  note?: string
): Debtor[] {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

  const updated = debtors.map((debtor) => {
    if (debtor.id !== debtorId) return debtor;

    const newTotalDebt = debtor.totalDebt + amount;
    const transId = `dtrans-${Date.now()}`;
    const newTrans: DebtTransaction = {
      id: transId,
      debtorId,
      type: 'DEBT',
      amount,
      balanceAfter: newTotalDebt,
      note: note || (items.length > 0 ? `Mua nợ ${items.length} món hàng` : 'Mua nợ tại quầy'),
      items,
      createdAt: dateStr,
    };

    apiClient.recordDebtTransaction(newTrans, items, newTotalDebt, 'ACTIVE').catch(() => {});

    return {
      ...debtor,
      totalDebt: newTotalDebt,
      status: 'ACTIVE' as const,
      updatedAt: dateStr,
      transactions: [newTrans, ...(debtor.transactions || [])],
    };
  });

  saveStoredDebtors(updated);
  return updated;
}

/**
 * Ghi nhận trả nợ (thanh toán một phần hoặc toàn bộ)
 */
export function recordPaymentFromDebtor(
  debtors: Debtor[],
  debtorId: string,
  paymentAmount: number,
  paymentMethod: 'CASH' | 'VIETQR' | 'TRANSFER' = 'CASH',
  note?: string
): Debtor[] {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

  const updated = debtors.map((debtor) => {
    if (debtor.id !== debtorId) return debtor;

    const newTotalDebt = Math.max(0, debtor.totalDebt - paymentAmount);
    const transId = `dtrans-${Date.now()}`;
    const newTrans: DebtTransaction = {
      id: transId,
      debtorId,
      type: 'PAYMENT',
      amount: paymentAmount,
      balanceAfter: newTotalDebt,
      paymentMethod,
      note: note || (newTotalDebt === 0 ? 'Thanh toán dứt điểm toàn bộ nợ' : 'Thanh toán trả nợ một phần'),
      createdAt: dateStr,
    };

    const newStatus = newTotalDebt === 0 ? ('SETTLED' as const) : ('ACTIVE' as const);
    apiClient.recordDebtTransaction(newTrans, [], newTotalDebt, newStatus).catch(() => {});

    return {
      ...debtor,
      totalDebt: newTotalDebt,
      status: newStatus,
      updatedAt: dateStr,
      transactions: [newTrans, ...(debtor.transactions || [])],
    };
  });

  saveStoredDebtors(updated);
  return updated;
}

/**
 * Xoá hồ sơ người nợ
 */
export function deleteDebtor(debtors: Debtor[], debtorId: string): Debtor[] {
  const updated = debtors.filter((d) => d.id !== debtorId);
  saveStoredDebtors(updated);
  apiClient.deleteDebtor(debtorId).catch(() => {});
  return updated;
}

