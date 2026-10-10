export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string; // gói, chai, lon, hộp, bịch, kg, lốc
  costPrice: number; // Giá vốn
  sellingPrice: number; // Giá bán
  stock: number; // Số lượng tồn kho
  minStockAlert: number; // Ngưỡng cảnh báo hết hàng
  mfgDate: string; // Ngày sản xuất (YYYY-MM-DD)
  expiryDate: string; // Hạn sử dụng (YYYY-MM-DD)
  batchNumber: string; // Số lô
  shelfLocation: string; // Vị trí kệ (Kệ A1, Tầng 2, ...)
  image: string; // URL hình ảnh
  description?: string;
  soldCount?: number; // Số lượng đã bán
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export type TransactionType = 'IN' | 'OUT' | 'SALE' | 'ADJUST';

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  type: TransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice: number;
  timestamp: string;
  note: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'VIETQR' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface OrderItem {
  productId: string;
  barcode: string;
  productName: string;
  price: number;
  costPrice: number;
  quantity: number;
  unit: string;
  image: string;
}

export interface Order {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: 'DELIVERY' | 'PICKUP';
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
}

export type NotificationType = 'ORDER_NEW' | 'ORDER_STATUS' | 'EXPIRY_ALERT' | 'STOCK_LOW';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  productId?: string;
}

// ==============================================================================
// KHUNG GIỜ MỞ CỬA (nhiều mốc mỗi ngày: sáng/chiều...)
// ==============================================================================
export interface BusinessHour {
  label: string; // VD: "Buổi sáng"
  open: string; // "06:00"
  close: string; // "11:30"
}

export interface StoreSettings {  storeName: string;
  phone: string;
  address: string;
  bankId: string; // e.g., 'MB', 'VCB', 'TCB'
  bankAccount: string;
  bankAccountName: string;
  qrTemplate: string; // 'compact2', 'qr_only', etc.
  lowStockThreshold: number;
  expiryWarningDays: number;
  ownerPin?: string; // PIN bảo mật quản lý (mặc định '1234')
  logoUrl?: string; // URL logo cửa hàng (hiện ở navbar)
  businessHours?: BusinessHour[]; // Các khung giờ mở cửa mỗi ngày
}

// ==============================================================================
// CÁC KIỂU DỮ LIỆU SỔ GHI NỢ KHÁCH HÀNG (DEBT / CREDIT MANAGEMENT)
// ==============================================================================
export type DebtorStatus = 'ACTIVE' | 'SETTLED' | 'BLOCKED';
export type DebtTransactionType = 'DEBT' | 'PAYMENT';

export interface DebtTransactionItem {
  id: string;
  transactionId?: string;
  productId?: string;
  barcode?: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DebtTransaction {
  id: string;
  debtorId: string;
  type: DebtTransactionType; // 'DEBT': mua nợ, 'PAYMENT': trả tiền nợ
  amount: number;
  balanceAfter: number;
  paymentMethod?: 'CASH' | 'VIETQR' | 'TRANSFER' | 'OTHER';
  note?: string;
  items?: DebtTransactionItem[];
  createdAt: string;
}

export interface Debtor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
  creditLimit: number; // Hạn mức nợ tối đa
  totalDebt: number;   // Dư nợ hiện tại
  status: DebtorStatus;
  createdAt: string;
  updatedAt: string;
  // Transactions can be embedded or linked
  transactions?: DebtTransaction[];
}
