// =============================================================================
// API CLIENT - KẾT NỐI TRỰC TIẾP VỚI BACKEND SERVER (/api/*)
// Không cần VITE_SUPABASE_URL hay VITE_SUPABASE_ANON_KEY!
// =============================================================================
import { Debtor, DebtTransaction, DebtTransactionItem, Product, Order, Category, StoreSettings } from '../types';

// Mọi request đều gửi kèm cookie session (HttpOnly) để API xác thực quản lý.
function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'include', ...init });
}

export const apiClient = {
  // Check backend health & database connection
  async checkHealth(): Promise<{ status: string; databaseConnected: boolean }> {
    try {
      const res = await apiFetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'error', databaseConnected: false };
    }
  },

  // 1. PRODUCTS
  async getProducts(): Promise<Product[] | null> {
    try {
      const res = await apiFetch('/api/products');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getProducts error:', err);
      return null;
    }
  },

  async saveProduct(product: Product): Promise<boolean> {
    try {
      const res = await apiFetch('/api/products', {
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
      const res = await apiFetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('Backend API deleteProduct error:', err);
      return false;
    }
  },

  // 2. CATEGORIES
  async getCategories(): Promise<Category[] | null> {
    try {
      const res = await apiFetch('/api/categories');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getCategories error:', err);
      return null;
    }
  },

  async saveCategory(cat: Category): Promise<boolean> {
    try {
      const res = await apiFetch('/api/categories', {
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
      const res = await apiFetch('/api/debtors');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getDebtors error:', err);
      return null;
    }
  },

  async saveDebtor(debtor: Debtor): Promise<boolean> {
    try {
      const res = await apiFetch('/api/debtors', {
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
      const res = await apiFetch(`/api/debtors?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
      const res = await apiFetch('/api/debtors?action=transaction', {
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
      const res = await apiFetch('/api/orders');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getOrders error:', err);
      return null;
    }
  },

  async saveOrder(order: Order): Promise<boolean> {
    try {
      const res = await apiFetch('/api/orders', {
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

  // Thanh toán thống nhất: server tạo đơn + trừ kho + (bán chịu) ghi nợ, atomic.
  async checkout(payload: {
    id: string;
    code: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: 'DELIVERY' | 'PICKUP';
    deliveryFee?: number;
    paymentMethod: 'VIETQR' | 'CASH' | 'DEBT';
    note: string;
    items: { productId: string; quantity: number }[];
    debtorId?: string;
  }): Promise<{
    ok: boolean;
    status?: number;
    order?: any;
    stockUpdates?: { id: string; stock: number; soldCount: number }[];
    debtTransaction?: any;
    insufficient?: { productId: string; name: string; stock: number; requested: number }[];
    error?: string;
  }> {
    try {
      const res = await apiFetch('/api/orders?action=checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, status: res.status, error: data?.error, insufficient: data?.items };
      }
      return {
        ok: true,
        order: data.order,
        stockUpdates: data.stockUpdates,
        debtTransaction: data.debtTransaction,
      };
    } catch (err) {
      console.warn('Backend API checkout error:', err);
      return { ok: false, error: 'network' };
    }
  },

  // 5. SETTINGS
  async getSettings(): Promise<StoreSettings | null> {
    try {
      const res = await apiFetch('/api/settings');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Backend API getSettings error:', err);
      return null;
    }
  },

  async saveSettings(settings: StoreSettings): Promise<boolean> {
    try {
      const res = await apiFetch('/api/settings', {
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

  // Tính phí giao hàng từ địa chỉ (Geoapify, server tính theo bảng giá cài đặt)
  async getDeliveryFee(address: string): Promise<{
    ok: boolean;
    distanceM?: number;
    fee?: number;
    beyondZones?: boolean;
    formattedAddress?: string;
    error?: string;
  }> {
    try {
      const res = await apiFetch('/api/orders?action=delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'unknown' };
      return { ok: true, ...data };
    } catch (err) {
      console.warn('Backend API getDeliveryFee error:', err);
      return { ok: false, error: 'network' };
    }
  },

  // Địa chỉ → tọa độ (chỉ quản lý, dùng khi cài tọa độ cửa hàng)
  async geocodeAddress(address: string): Promise<{
    ok: boolean;
    lat?: number;
    lon?: number;
    formatted?: string;
    error?: string;
  }> {
    try {
      const res = await apiFetch('/api/settings?action=geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'unknown' };
      return { ok: true, ...data };
    } catch (err) {
      console.warn('Backend API geocodeAddress error:', err);
      return { ok: false, error: 'network' };
    }
  },

  // 6. AUTH — đăng nhập quản lý bằng PIN (xác thực ở server)
  async login(pin: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await apiFetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Đăng nhập thất bại' };
    } catch {
      return { ok: false, error: 'Không kết nối được server' };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth?action=logout', { method: 'POST' });
    } catch {
      /* bỏ qua */
    }
  },

  async checkSession(): Promise<boolean> {
    try {
      const res = await apiFetch('/api/auth?action=session');
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.authenticated;
    } catch {
      return false;
    }
  },

  // 7. UPLOAD ẢNH — upload ảnh sản phẩm lên Supabase Storage, trả về public URL
  async uploadImage(dataUrl: string): Promise<string | null> {
    try {
      const res = await apiFetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  },
};
