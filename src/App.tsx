import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Order, InventoryTransaction, AppNotification, StoreSettings, OrderItem, Category, Debtor } from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredOrders,
  saveStoredOrders,
  getStoredTransactions,
  saveStoredTransactions,
  getStoredNotifications,
  saveStoredNotifications,
  getStoredSettings,
  saveStoredSettings,
  getStoredCategories,
  saveStoredCategories,
  getStoredDebtors,
  saveStoredDebtors,
  subscribeToBroadcast,
  broadcastMessage,
  playDingSound,
  generateInventoryAuditReport
} from './utils/storage';
import { apiClient } from './utils/apiClient';
import { Navbar } from './components/Navbar';
import { ProductVirtualGrid } from './components/ProductVirtualGrid';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { CartDrawer } from './components/CartDrawer';
import { VietQRModal } from './components/VietQRModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RealtimeToast } from './components/RealtimeToast';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { Barcode, ShoppingCart, SlidersHorizontal, Sparkles, Store, PackagePlus } from 'lucide-react';

export default function App() {
  // App state
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(getStoredSettings());
  const [debtors, setDebtors] = useState<Debtor[]>(() => getStoredDebtors());

  // Customer Shopping & UI State
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [mode, setMode] = useState<'customer' | 'owner'>(() => {
    try {
      // Giữ chế độ màn hình khi F5: đang ở Quản lý thì tải lại vẫn ở Quản lý
      return localStorage.getItem('taphoa_mode') === 'owner' ? 'owner' : 'customer';
    } catch {
      return 'customer';
    }
  });
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(false);

  // Xác thực phiên quản lý với server khi tải app (cookie HttpOnly là nguồn chuẩn)
  useEffect(() => {
    apiClient.checkSession().then((ok) => {
      setIsOwnerAuthenticated(ok);
      if (!ok) {
        try {
          sessionStorage.removeItem('taphoa_owner_auth');
        } catch {}
      }
    });
  }, []);
  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<Order | null>(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerAction, setScannerAction] = useState<'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE'>('LOOKUP');
  const [isVietQROpen, setIsVietQROpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // ============================================================================
  // API SYNC — mọi thay đổi dữ liệu đều đẩy lên server (fire-and-forget),
  // localStorage đóng vai trò cache/offline. API lỗi thì giữ local, không crash app.
  // ============================================================================
  const syncProductToApi = (p: Product) => {
    apiClient.saveProduct(p);
  };
  const syncProductsToApi = (list: Product[]) => {
    list.forEach((p) => apiClient.saveProduct(p));
  };

  // Settings handlers — lưu local + đẩy lên server, trả về true nếu server nhận
  const handleUpdateSettings = useCallback(async (newSettings: StoreSettings): Promise<boolean> => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    const ok = await apiClient.saveSettings(newSettings);
    if (!ok) {
      // Server không nhận: giữ nguyên UI nhưng localStorage vẫn có bản mới nhất.
      // Lần tải lại sau server là nguồn chuẩn nên cần báo cho user biết.
      console.warn('Lưu cấu hình lên server thất bại, chỉ lưu local.');
    }
    return ok;
  }, []);

  // Category handlers
  const handleUpdateCategories = useCallback((newCategories: Category[]) => {
    setCategories((prev) => {
      const prevMap = new Map(prev.map((c) => [c.id, JSON.stringify(c)]));
      newCategories.forEach((c) => {
        if (prevMap.get(c.id) !== JSON.stringify(c)) apiClient.saveCategory(c);
      });
      return newCategories;
    });
    saveStoredCategories(newCategories);
  }, []);

  const handleQuickCreateCategory = useCallback((newCat: Category) => {
    setCategories((prev) => {
      const existing = prev.find((c) => c.id === newCat.id);
      if (existing) return prev;
      const updated = [...prev, newCat];
      saveStoredCategories(updated);
      apiClient.saveCategory(newCat);
      return updated;
    });
  }, []);

  const handleToggleCategory = useCallback((categoryId: string) => {
    if (categoryId === 'all') {
      setSelectedCategories(['all']);
      return;
    }
    setSelectedCategories((prev) => {
      const withoutAll = prev.filter((id) => id !== 'all');
      if (withoutAll.includes(categoryId)) {
        const next = withoutAll.filter((id) => id !== categoryId);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, categoryId];
      }
    });
  }, []);

  const handleSelectOnlyCategory = useCallback((categoryId: string) => {
    if (categoryId === 'all') {
      setSelectedCategories(['all']);
    } else {
      setSelectedCategories([categoryId]);
    }
  }, []);

  const handleClearCategories = useCallback(() => {
    setSelectedCategories(['all']);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadedProducts = getStoredProducts();
    const loadedOrders = getStoredOrders();
    const loadedTx = getStoredTransactions();
    const loadedNotifs = getStoredNotifications();
    const loadedSettings = getStoredSettings();
    const loadedCategories = getStoredCategories();
    const loadedDebtors = getStoredDebtors();

    setProducts(loadedProducts);
    setOrders(loadedOrders);
    setTransactions(loadedTx);
    setNotifications(loadedNotifs);
    setSettings(loadedSettings);
    setCategories(loadedCategories);
    setDebtors(loadedDebtors);

    // Đồng bộ trực tiếp từ Backend Server (Express + Drizzle ORM → Supabase)
    // Server là nguồn sự thật: API thành công (kể cả mảng rỗng) thì dùng dữ liệu server;
    // chỉ khi API lỗi (null) mới giữ dữ liệu local.
    apiClient.getProducts().then((serverProds) => {
      if (serverProds !== null) {
        setProducts(serverProds);
        saveStoredProducts(serverProds);
      }
    });

    apiClient.getDebtors().then((serverDebtors) => {
      if (serverDebtors !== null) {
        setDebtors(serverDebtors);
        saveStoredDebtors(serverDebtors);
      }
    });

    apiClient.getCategories().then((serverCats) => {
      if (serverCats !== null) {
        setCategories(serverCats);
        saveStoredCategories(serverCats);
      }
    });

    apiClient.getOrders().then((serverOrders) => {
      if (serverOrders !== null) {
        setOrders(serverOrders);
        saveStoredOrders(serverOrders);
      }
    });

    apiClient.getSettings().then((serverSettings) => {
      if (serverSettings !== null) {
        setSettings(serverSettings);
        saveStoredSettings(serverSettings);
      }
    });

    // Set recent order as active customer order if any
    if (loadedOrders.length > 0) {
      setActiveCustomerOrder(loadedOrders[0]);
    }
  }, []);

  // Multi-tab real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToBroadcast((event) => {
      if (event.type === 'ORDERS_UPDATED') {
        const updated = getStoredOrders();
        setOrders(updated);
        // Refresh active customer order if currently tracked
        setActiveCustomerOrder((prev) => {
          if (!prev) return updated[0] || null;
          return updated.find((o) => o.id === prev.id) || prev;
        });
      } else if (event.type === 'PRODUCTS_UPDATED') {
        setProducts(getStoredProducts());
      } else if (event.type === 'CATEGORIES_UPDATED') {
        setCategories(getStoredCategories());
      } else if (event.type === 'NEW_CUSTOMER_ORDER') {
        playDingSound('order');
        const notif: AppNotification = {
          id: 'notif-' + Date.now(),
          type: 'ORDER_NEW',
          title: 'Đơn hàng mới nhận!',
          message: `Khách ${event.payload?.customerName} vừa đặt đơn #${event.payload?.code}`,
          timestamp: new Date().toISOString(),
          read: false,
          orderId: event.payload?.id,
        };
        setNotifications((prev) => [notif, ...prev]);
        setActiveToast(notif);
        setOrders(getStoredOrders());
      } else if (event.type === 'NOTIFICATIONS_UPDATED') {
        setNotifications(getStoredNotifications());
      } else if (event.type === 'DEBTORS_UPDATED') {
        setDebtors(getStoredDebtors());
      }
    });

    return () => unsubscribe();
  }, []);

  // Total cart calculation
  const { cartCount, cartTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const [prodId, rawQty] of Object.entries(cart)) {
      const qty = Number(rawQty);
      if (qty <= 0) continue;
      count += qty;
      const p = products.find((item) => item.id === prodId);
      if (p) {
        total += p.sellingPrice * qty;
      }
    }
    return { cartCount: count, cartTotal: total };
  }, [cart, products]);

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    playDingSound('beep');
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + quantity,
    }));
  };

  const handleUpdateCartQuantity = (product: Product, delta: number) => {
    playDingSound('beep');
    setCart((prev) => {
      const current = prev[product.id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: next };
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const handleClearCart = () => {
    setCart({});
  };

  // Customer Checkout
  const handleCheckout = (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: 'DELIVERY' | 'PICKUP';
    paymentMethod: 'VIETQR' | 'CASH';
    note: string;
    items: OrderItem[];
    totalAmount: number;
  }) => {
    const orderCode = 'TH-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      code: orderCode,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      deliveryType: orderData.deliveryType,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: orderData.note,
    };

    // Update product stock and generate sales transactions
    const updatedProducts = [...products];
    const newTransactions: InventoryTransaction[] = [...transactions];

    for (const item of orderData.items) {
      const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIdx >= 0) {
        const prevStock = updatedProducts[pIdx].stock;
        const newStock = Math.max(0, prevStock - item.quantity);
        updatedProducts[pIdx] = {
          ...updatedProducts[pIdx],
          stock: newStock,
          soldCount: (updatedProducts[pIdx].soldCount || 0) + item.quantity,
        };

        newTransactions.unshift({
          id: 'tx-' + Date.now() + '-' + item.productId,
          productId: item.productId,
          productName: item.productName,
          barcode: item.barcode,
          type: 'SALE',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          unitPrice: item.price,
          timestamp: new Date().toLocaleString('vi-VN'),
          note: `Đơn hàng ${orderCode}`,
        });
      }
    }

    // Save and broadcast
    const updatedOrders = [newOrder, ...orders];
    saveStoredOrders(updatedOrders);
    saveStoredProducts(updatedProducts);
    saveStoredTransactions(newTransactions);

    // Đồng bộ lên server: đơn mới + tồn kho các sản phẩm trong đơn
    apiClient.saveOrder(newOrder);
    const changedIds = new Set(orderData.items.map((i) => i.productId));
    syncProductsToApi(updatedProducts.filter((p) => changedIds.has(p.id)));

    setOrders(updatedOrders);
    setProducts(updatedProducts);
    setTransactions(newTransactions);
    setActiveCustomerOrder(newOrder);
    setCart({});
    setIsCartOpen(false);

    // Create system notification
    const orderNotif: AppNotification = {
      id: 'notif-' + Date.now(),
      type: 'ORDER_NEW',
      title: 'Đơn hàng mới #' + orderCode,
      message: `Khách ${orderData.customerName} đặt ${orderData.items.length} món (${newOrder.totalAmount.toLocaleString('vi-VN')}đ)`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: newOrder.id,
    };
    const nextNotifs = [orderNotif, ...notifications];
    setNotifications(nextNotifs);
    saveStoredNotifications(nextNotifs);
    setActiveToast(orderNotif);

    broadcastMessage('NEW_CUSTOMER_ORDER', newOrder);
    playDingSound('order');

    // If VietQR, open payment QR modal immediately!
    if (orderData.paymentMethod === 'VIETQR') {
      setIsVietQROpen(true);
    } else {
      setIsOrderTrackingOpen(true);
    }
  };

  // Mark order paid via VietQR
  const handleMarkOrderPaid = (orderId: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: 'PAID' as const,
          orderStatus: o.orderStatus === 'PENDING' ? ('CONFIRMED' as const) : o.orderStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    setOrders(updated);
    saveStoredOrders(updated);
    const paidOrder = updated.find((o) => o.id === orderId);
    if (paidOrder) apiClient.saveOrder(paidOrder);
    if (activeCustomerOrder?.id === orderId) {
      setActiveCustomerOrder(updated.find((o) => o.id === orderId) || null);
    }
  };

  // Handle scanned barcode actions (Stock in, Stock out, Sale, Lookup)
  const handleBarcodeScanned = (
    barcode: string,
    actionType: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE',
    quantity = 1,
    note = ''
  ) => {
    const prod = products.find((p) => p.barcode === barcode);

    if (!prod) {
      // New product with barcode
      setProductToEdit({
        id: 'prod-' + Date.now(),
        barcode,
        name: '',
        brand: '',
        category: 'instant_food',
        unit: 'Gói',
        costPrice: 5000,
        sellingPrice: 7000,
        stock: quantity,
        minStockAlert: 5,
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        batchNumber: 'LO-01',
        shelfLocation: 'Kệ A1',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
        description: '',
      });
      setIsProductFormOpen(true);
      return;
    }

    if (actionType === 'LOOKUP') {
      setSelectedDetailProduct(prod);
    } else if (actionType === 'SALE') {
      handleAddToCart(prod, quantity);
      setIsCartOpen(true);
    } else if (actionType === 'STOCK_IN') {
      const prevStock = prod.stock;
      const newStock = prevStock + quantity;
      const updatedList = products.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p));
      setProducts(updatedList);
      saveStoredProducts(updatedList);
      const synced = updatedList.find((p) => p.id === prod.id);
      if (synced) syncProductToApi(synced);

      const newTx: InventoryTransaction = {
        id: 'tx-' + Date.now(),
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        type: 'IN',
        quantity,
        previousStock: prevStock,
        newStock: newStock,
        unitPrice: prod.costPrice,
        timestamp: new Date().toLocaleString('vi-VN'),
        note: note || 'Quét nhập kho nhanh',
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      saveStoredTransactions(updatedTx);

      setActiveToast({
        id: 'toast-' + Date.now(),
        type: 'STOCK_LOW',
        title: 'Nhập kho thành công',
        message: `Đã nhập +${quantity} ${prod.unit} ${prod.name} (Tồn mới: ${newStock})`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } else if (actionType === 'STOCK_OUT') {
      const prevStock = prod.stock;
      const newStock = Math.max(0, prevStock - quantity);
      const updatedList = products.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p));
      setProducts(updatedList);
      saveStoredProducts(updatedList);
      const synced = updatedList.find((p) => p.id === prod.id);
      if (synced) syncProductToApi(synced);

      const newTx: InventoryTransaction = {
        id: 'tx-' + Date.now(),
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        type: 'OUT',
        quantity,
        previousStock: prevStock,
        newStock: newStock,
        unitPrice: prod.sellingPrice,
        timestamp: new Date().toLocaleString('vi-VN'),
        note: note || 'Quét xuất kho',
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      saveStoredTransactions(updatedTx);

      setActiveToast({
        id: 'toast-' + Date.now(),
        type: 'STOCK_LOW',
        title: 'Xuất kho thành công',
        message: `Đã xuất -${quantity} ${prod.unit} ${prod.name} (Tồn mới: ${newStock})`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  };

  // Quick adjust stock from product detail
  const handleQuickAdjustStock = (product: Product, delta: number) => {
    const prevStock = product.stock;
    const newStock = Math.max(0, prevStock + delta);
    const updatedList = products.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p));
    setProducts(updatedList);
    saveStoredProducts(updatedList);
    const synced = updatedList.find((p) => p.id === product.id);
    if (synced) syncProductToApi(synced);

    const newTx: InventoryTransaction = {
      id: 'tx-' + Date.now(),
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      type: delta > 0 ? 'IN' : 'OUT',
      quantity: Math.abs(delta),
      previousStock: prevStock,
      newStock: newStock,
      unitPrice: delta > 0 ? product.costPrice : product.sellingPrice,
      timestamp: new Date().toLocaleString('vi-VN'),
      note: delta > 0 ? 'Cộng nhanh tại thẻ' : 'Trừ nhanh tại thẻ',
    };
    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    saveStoredTransactions(updatedTx);
    playDingSound('beep');

    if (selectedDetailProduct?.id === product.id) {
      setSelectedDetailProduct({ ...product, stock: newStock });
    }
  };

  // Save product from modal
  const handleSaveProduct = (product: Product) => {
    const exists = products.some((p) => p.id === product.id);
    let updated: Product[];
    if (exists) {
      updated = products.map((p) => (p.id === product.id ? product : p));
    } else {
      updated = [product, ...products];
    }
    setProducts(updated);
    saveStoredProducts(updated);
    syncProductToApi(product);
    playDingSound('beep');
  };

  // Owner mode switch with PIN Authentication gate
  const handleRequestMode = (targetMode: 'customer' | 'owner') => {
    if (targetMode === 'customer') {
      setMode('customer');
    } else {
      if (isOwnerAuthenticated) {
        setMode('owner');
      } else {
        setIsOwnerLoginOpen(true);
      }
    }
  };

  const handleOwnerLoginSuccess = () => {
    setIsOwnerAuthenticated(true);
    try {
      sessionStorage.setItem('taphoa_owner_auth', 'true');
    } catch {}
    setIsOwnerLoginOpen(false);
    setMode('owner');
  };

  const handleOwnerLogout = () => {
    setIsOwnerAuthenticated(false);
    try {
      sessionStorage.removeItem('taphoa_owner_auth');
    } catch {}
    apiClient.logout();
    setMode('customer');
  };

  // Lưu chế độ màn hình để F5 không bị đá về màn hình khách
  useEffect(() => {
    try {
      localStorage.setItem('taphoa_mode', mode);
    } catch {}
  }, [mode]);

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased overflow-x-hidden">
      {/* FULL-WIDTH RESPONSIVE NAVBAR */}
      <Navbar
        mode={mode}
        onToggleMode={handleRequestMode}
        isOwnerAuthenticated={isOwnerAuthenticated}
        onLogoutOwner={handleOwnerLogout}
        selectedCategory={selectedCategories[0] || 'all'}
        onSelectCategory={(id) => setSelectedCategories([id])}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenScanner={() => {
          setScannerAction(mode === 'owner' ? 'STOCK_IN' : 'SALE');
          setIsScannerOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        activeCustomerOrder={activeCustomerOrder}
        onOpenActiveOrderTracking={() => setIsOrderTrackingOpen(true)}
        settings={settings}
      />

      {/* MAIN VIEWPORT: Switch between Customer Storefront and Store Owner Dashboard */}
      <main className="w-full flex-1 flex flex-col">
        {mode === 'customer' ? (
          <div className="w-full flex flex-col">
            {/* Customer Storefront Hero Banner (Compact & balanced on mobile & tablet) */}
            <div className="w-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 shadow-xs">
              <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="max-w-2xl min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-xs text-emerald-200 text-[11px] sm:text-xs font-semibold mb-1.5">
                    <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>Giao hàng nhanh trong 15 phút quanh khu vực</span>
                  </div>
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug text-balance">
                    Tạp Hoá Cô Phước – Đầy Đủ & Tiện Lợi
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 max-w-xl leading-relaxed hidden xs:block text-pretty">
                    Bánh kẹo, nước giải khát, gia vị và đồ hộp tươi mới mỗi ngày. Thanh toán VietQR nhanh gọn, an toàn.
                  </p>
                </div>

                {/* 2 Action Buttons on the SAME ROW on mobile (grid-cols-2) and flex on tablet/desktop */}
                <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center shrink-0">
                  <button
                    onClick={() => {
                      setScannerAction('SALE');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition min-w-0"
                    title="Mở camera quét mã vạch trên sản phẩm"
                  >
                    <Barcode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Quét mã vạch</span>
                  </button>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 border border-emerald-400/50 text-white font-bold text-xs shadow-md hover:bg-emerald-500 active:scale-95 transition min-w-0"
                    title="Mở giỏ hàng"
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    <span className="truncate">Giỏ hàng ({cartCount})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIRTUAL GRID OF PRODUCTS (Uniform card heights, image optimized, smooth scroll) */}
            <ProductVirtualGrid
              products={products}
              categories={categories}
              mode={mode}
              cartItems={cart}
              onAddToCart={(p) => handleAddToCart(p, 1)}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onQuickStockAction={(p) => setSelectedDetailProduct(p)}
              onViewDetails={(p) => setSelectedDetailProduct(p)}
              searchQuery={searchQuery}
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              onSelectOnlyCategory={handleSelectOnlyCategory}
              onClearCategories={handleClearCategories}
            />
          </div>
        ) : (
          /* OWNER DASHBOARD: Inventory, Expiry Tracking, Daily Revenue & Financials */
          <OwnerDashboard
            products={products}
            orders={orders}
            transactions={transactions}
            settings={settings}
            categories={categories}
            debtors={debtors}
            onUpdateCategories={handleUpdateCategories}
            onUpdateDebtors={(updatedDebtors) => {
              // Diff với danh sách cũ để đồng bộ đúng thao tác lên server
              const prevMap = new Map<string, Debtor>(debtors.map((d) => [d.id, d]));
              updatedDebtors.forEach((d) => {
                const prev = prevMap.get(d.id);
                const prevTxIds = new Set((prev?.transactions || []).map((t) => t.id));
                const newTxs = (d.transactions || []).filter((t) => !prevTxIds.has(t.id));
                if (!prev) {
                  // Khách nợ mới: lưu hồ sơ trước (FK), rồi mới ghi các giao dịch
                  apiClient.saveDebtor(d).then((ok) => {
                    if (ok) {
                      newTxs.forEach((t) =>
                        apiClient.recordDebtTransaction(t, t.items || [], d.totalDebt, d.status)
                      );
                    }
                  });
                } else if (newTxs.length > 0) {
                  // Ghi nợ / trả nợ mới: ghi từng giao dịch (server tự cập nhật tổng nợ)
                  newTxs.forEach((t) =>
                    apiClient.recordDebtTransaction(t, t.items || [], d.totalDebt, d.status)
                  );
                } else {
                  // Chỉ sửa thông tin hồ sơ
                  const { transactions: _pt, ...prevHead } = prev;
                  const { transactions: _nt, ...nextHead } = d;
                  if (JSON.stringify(prevHead) !== JSON.stringify(nextHead)) {
                    apiClient.saveDebtor(d);
                  }
                }
              });
              const nextIds = new Set(updatedDebtors.map((d) => d.id));
              debtors.forEach((d) => {
                if (!nextIds.has(d.id)) apiClient.deleteDebtor(d.id);
              });
              setDebtors(updatedDebtors);
              saveStoredDebtors(updatedDebtors);
            }}
            onUpdateProducts={(prods) => {
              // Đồng bộ những sản phẩm có thay đổi (vd: đổi danh mục khi xóa danh mục)
              const prevMap = new Map(products.map((p) => [p.id, JSON.stringify(p)]));
              prods.forEach((p) => {
                if (prevMap.get(p.id) !== JSON.stringify(p)) syncProductToApi(p);
              });
              const prevIds = new Set(prods.map((p) => p.id));
              products.forEach((p) => {
                if (!prevIds.has(p.id)) apiClient.deleteProduct(p.id);
              });
              setProducts(prods);
              saveStoredProducts(prods);
            }}
            onUpdateOrders={(ords) => {
              // Chỉ đồng bộ những đơn có thay đổi lên server
              const prevMap = new Map(orders.map((o) => [o.id, JSON.stringify(o)]));
              ords.forEach((o) => {
                if (prevMap.get(o.id) !== JSON.stringify(o)) apiClient.saveOrder(o);
              });
              setOrders(ords);
              saveStoredOrders(ords);
            }}
            onUpdateTransactions={(txs) => {
              setTransactions(txs);
              saveStoredTransactions(txs);
            }}
            onUpdateSettings={handleUpdateSettings}
            onOpenScanner={(action) => {
              setScannerAction(action);
              setIsScannerOpen(true);
            }}
            onOpenNewProductModal={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setIsProductFormOpen(true);
            }}
          />
        )}
      </main>

      {/* MODALS & DRAWERS */}
      {/* 1. Barcode Scanner Modal (Camera & fast stock in/out) */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        actionType={scannerAction}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* 2. Customer Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        settings={settings}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
      />

      {/* 3. VietQR Payment Modal */}
      <VietQRModal
        isOpen={isVietQROpen}
        order={activeCustomerOrder}
        settings={settings}
        onClose={() => setIsVietQROpen(false)}
        onMarkPaid={handleMarkOrderPaid}
        onViewOrderTracking={(ord) => {
          setActiveCustomerOrder(ord);
          setIsOrderTrackingOpen(true);
        }}
      />

      {/* 4. Real-time Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isOrderTrackingOpen}
        order={activeCustomerOrder}
        onClose={() => setIsOrderTrackingOpen(false)}
      />

      {/* 5. Product Create / Edit Modal */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        productToEdit={productToEdit}
        categories={categories}
        onQuickCreateCategory={handleQuickCreateCategory}
        onSave={handleSaveProduct}
        onOpenScannerForBarcode={() => {
          setScannerAction('LOOKUP');
          setIsScannerOpen(true);
        }}
      />

      {/* 6. Product Details & Stock Adjust Modal */}
      <ProductDetailModal
        isOpen={!!selectedDetailProduct}
        product={selectedDetailProduct}
        mode={mode}
        cartQuantity={selectedDetailProduct ? cart[selectedDetailProduct.id] || 0 : 0}
        onClose={() => setSelectedDetailProduct(null)}
        onAddToCart={(p, qty) => handleAddToCart(p, qty || 1)}
        onQuickAdjustStock={handleQuickAdjustStock}
        onEditProduct={(p) => {
          setSelectedDetailProduct(null);
          setProductToEdit(p);
          setIsProductFormOpen(true);
        }}
      />

      {/* 7. Real-time Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
          saveStoredNotifications(updated);
        }}
        onMarkAllAsRead={() => {
          const updated = notifications.map((n) => ({ ...n, read: true }));
          setNotifications(updated);
          saveStoredNotifications(updated);
        }}
        onSelectNotification={(notif) => {
          if (notif.orderId) {
            const ord = orders.find((o) => o.id === notif.orderId);
            if (ord) {
              setActiveCustomerOrder(ord);
              setIsOrderTrackingOpen(true);
            }
          }
        }}
      />

      {/* 8. Real-time Incoming Toast Alert */}
      <RealtimeToast
        toast={activeToast}
        onClose={() => setActiveToast(null)}
        onClickToast={(toast) => {
          if (toast.orderId) {
            const ord = orders.find((o) => o.id === toast.orderId);
            if (ord) {
              setActiveCustomerOrder(ord);
              setIsOrderTrackingOpen(true);
            }
          }
        }}
      />

      {/* 9. Store Owner PIN Authentication Modal */}
      <OwnerLoginModal
        isOpen={isOwnerLoginOpen}
        onClose={() => setIsOwnerLoginOpen(false)}
        onSuccess={handleOwnerLoginSuccess}
        onVerify={apiClient.login}
        storeName={settings.storeName}
      />
    </div>
  );
}
