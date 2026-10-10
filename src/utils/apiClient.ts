// =============================================================================
// API CLIENT - KẾT NỐI TRỰC TIẾP VỚI BACKEND SERVER (/api/*)
// Không cần VITE_SUPABASE_URL hay VITE_SUPABASE_ANON_KEY!
// =============================================================================
import { Debtor, DebtTransaction, DebtTransactionItem, Product, Order, Category, StoreSettings } from '../types';

export const apiClient = {
  // Check backend health & database connection
  async checkHealth(): Promise<{ status: string; databaseConnected: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'error', databaseConnected: false };
    }
  },

  // 1. PRODUCTS
  async getProducts(): Promise<Product[] | null> {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getProducts error:', err);
      return null;
    }
  },

  async saveProduct(product: Product): Promise<boolean> {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveProduct error:', err);
      return false;
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('Backend API deleteProduct error:', err);
      return false;
    }
  },

  // 2. CATEGORIES
  async getCategories(): Promise<Category[] | null> {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getCategories error:', err);
      return null;
    }
  },

  async saveCategory(cat: Category): Promise<boolean> {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveCategory error:', err);
      return false;
    }
  },

  // 3. DEBTORS & DEBT TRANSACTIONS (SỔ GHI NỢ)
  async getDebtors(): Promise<Debtor[] | null> {
    try {
      const res = await fetch('/api/debtors');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getDebtors error:', err);
      return null;
    }
  },

  async saveDebtor(debtor: Debtor): Promise<boolean> {
    try {
      const res = await fetch('/api/debtors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtor),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveDebtor error:', err);
      return false;
    }
  },

  async deleteDebtor(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/debtors/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('Backend API deleteDebtor error:', err);
      return false;
    }
  },

  async recordDebtTransaction(
    transaction: DebtTransaction,
    items: DebtTransactionItem[] = [],
    newTotalDebt?: number,
    newStatus?: 'ACTIVE' | 'SETTLED'
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/debt-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction,
          items,
          newTotalDebt,
          newStatus,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API recordDebtTransaction error:', err);
      return false;
    }
  },

  // 4. ORDERS
  async getOrders(): Promise<Order[] | null> {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getOrders error:', err);
      return null;
    }
  },

  async saveOrder(order: Order): Promise<boolean> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveOrder error:', err);
      return false;
    }
  },

  // 5. SETTINGS
  async getSettings(): Promise<StoreSettings | null> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getSettings error:', err);
      return null;
    }
  },

  async saveSettings(settings: StoreSettings): Promise<boolean> {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (err) {
      console.warn('Backend API saveSettings error:', err);
      return false;
    }
  },
};
