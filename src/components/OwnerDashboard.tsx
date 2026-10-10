import React, { useState, useMemo, useEffect } from 'react';
import { Product, Order, InventoryTransaction, StoreSettings, Category, Debtor } from '../types';
import { formatVND, formatDate, getExpiryStatus } from '../utils/vietqr';
import { generateInventoryAuditReport, playDingSound } from '../utils/storage';
import { DebtManagementView } from './DebtManagementView';
import { ProductImage } from './ProductImage';
import { StoreSettingsView } from './StoreSettingsView';
import { isStoreOpenNow } from '../utils/businessHours';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  CalendarDays,
  LayoutDashboard,
  CheckCircle2,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  Printer,
  ChevronRight,
  Barcode,
  ShoppingBag,
  Bell,
  Sparkles,
  MapPin,
  Trash2,
  Edit3,
  FolderPlus,
  FolderTree,
  Tag,
  Store,
  CupSoda,
  Soup,
  Cookie,
  Milk,
  Flame,
  PackageCheck,
  Coffee,
  Wine,
  Apple,
  Fish,
  Boxes,
  Heart,
  Layers,
  X,
  Receipt,
  Settings
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

interface OwnerDashboardProps {
  products: Product[];
  orders: Order[];
  transactions: InventoryTransaction[];
  settings: StoreSettings;
  categories: Category[];
  debtors?: Debtor[];
  onUpdateProducts: (newProducts: Product[]) => void;
  onUpdateOrders: (newOrders: Order[]) => void;
  onUpdateTransactions: (newTransactions: InventoryTransaction[]) => void;
  onUpdateSettings: (newSettings: StoreSettings) => Promise<boolean>;
  onUpdateCategories: (newCategories: Category[]) => void;
  onUpdateDebtors?: (newDebtors: Debtor[]) => void;
  onOpenScanner: (type: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE') => void;
  onOpenNewProductModal: () => void;
  onEditProduct: (product: Product) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  products,
  orders,
  transactions,
  settings,
  categories,
  debtors = [],
  onUpdateProducts,
  onUpdateOrders,
  onUpdateTransactions,
  onUpdateSettings,
  onUpdateCategories,
  onUpdateDebtors,
  onOpenScanner,
  onOpenNewProductModal,
  onEditProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'INVENTORY' | 'EXPIRY' | 'ORDERS' | 'CATEGORIES' | 'DEBT' | 'SETTINGS'>(() => {
    const saved = localStorage.getItem('taphoa_owner_tab');
    const valid = ['REVENUE', 'INVENTORY', 'EXPIRY', 'ORDERS', 'CATEGORIES', 'DEBT', 'SETTINGS'];
    return (valid.includes(saved || '') ? saved : 'REVENUE') as 'REVENUE' | 'INVENTORY' | 'EXPIRY' | 'ORDERS' | 'CATEGORIES' | 'DEBT' | 'SETTINGS';
  });
  const [revenueSubTab, setRevenueSubTab] = useState<'OVERVIEW' | 'MONTHLY'>(() => {
    const saved = localStorage.getItem('taphoa_revenue_subtab');
    return saved === 'MONTHLY' ? 'MONTHLY' : 'OVERVIEW';
  });

  // Giữ state màn hình khi F5: lưu tab đang mở
  useEffect(() => {
    localStorage.setItem('taphoa_owner_tab', activeTab);
  }, [activeTab]);
  useEffect(() => {
    localStorage.setItem('taphoa_revenue_subtab', revenueSubTab);
  }, [revenueSubTab]);
  const [searchStock, setSearchStock] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'EXPIRED'>('ALL');

  // Categories management state
  const [searchCategory, setSearchCategory] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    id: '',
    name: '',
    icon: 'Package',
    color: 'bg-emerald-600',
    description: '',
  });

  // Compute Revenue Stats — SỐ LIỆU THẬT từ đơn hàng (không dùng số demo)
  const revenueStats = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dayKeyOf = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const now = new Date();
    const todayKey = dayKeyOf(now.toISOString());
    const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayKey = `${yd.getFullYear()}-${pad(yd.getMonth() + 1)}-${pad(yd.getDate())}`;

    const validOrders = orders.filter((o) => o.orderStatus !== 'CANCELLED');
    const sumDay = (key: string) => {
      const dayOrders = validOrders.filter((o) => dayKeyOf(o.createdAt) === key);
      const revenue = dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const cost = dayOrders.reduce(
        (s, o) => s + o.items.reduce((ss, it) => ss + (it.costPrice || 0) * (it.quantity || 0), 0),
        0
      );
      return { revenue, profit: revenue - cost, count: dayOrders.length };
    };

    const today = sumDay(todayKey);
    const yesterday = sumDay(yesterdayKey);
    const pctVsYesterday =
      yesterday.revenue > 0 ? ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100 : null;
    const margin = today.revenue > 0 ? (today.profit / today.revenue) * 100 : null;

    const allRevenue = validOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    // Biểu đồ 7 ngày gần nhất (số thật)
    const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const chartData = Array.from({ length: 7 }, (_, k) => {
      const i = 6 - k;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const s = sumDay(key);
      return {
        day: i === 0 ? 'Hôm nay' : weekdayNames[d.getDay()],
        doanhThu: s.revenue,
        loiNhuan: s.profit,
      };
    });

    return {
      todayRevenue: today.revenue,
      todayProfit: today.profit,
      todayOrdersCount: today.count,
      pctVsYesterday,
      margin,
      allRevenue,
      chartData,
    };
  }, [orders]);

  // Doanh thu theo tháng — SỐ LIỆU THẬT từ đơn hàng
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthlyStats = useMemo(() => {
    const monthKeyOf = (iso: string): string | null => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const byMonth = new Map<string, { revenue: number; profit: number; count: number }>();
    for (const o of orders) {
      if (o.orderStatus === 'CANCELLED') continue;
      const m = monthKeyOf(o.createdAt);
      if (!m) continue;
      const cost = o.items.reduce((s, it) => s + (it.costPrice || 0) * (it.quantity || 0), 0);
      const e = byMonth.get(m) || { revenue: 0, profit: 0, count: 0 };
      e.revenue += o.totalAmount || 0;
      e.profit += (o.totalAmount || 0) - cost;
      e.count += 1;
      byMonth.set(m, e);
    }
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = [...byMonth.keys()].sort().reverse();
    if (!months.includes(curMonth)) months.unshift(curMonth);

    // 6 tháng gần nhất cho biểu đồ
    const last6: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const chartData = last6.map((m) => {
      const e = byMonth.get(m);
      return {
        month: `T${Number(m.split('-')[1])}`,
        doanhThu: e?.revenue || 0,
        loiNhuan: e?.profit || 0,
      };
    });

    const selected = byMonth.get(selectedMonth) || { revenue: 0, profit: 0, count: 0 };
    const monthLabel = (m: string) => {
      const [y, mm] = m.split('-');
      return `Tháng ${Number(mm)}/${y}`;
    };
    return { months, chartData, selected, monthLabel };
  }, [orders, selectedMonth]);

  // Inventory Audit Data
  const auditReport = useMemo(() => {
    return generateInventoryAuditReport(products, settings);
  }, [products, settings]);

  // Filtered Stock Table
  const filteredStockProducts = useMemo(() => {
    let list = [...products];
    if (searchStock.trim()) {
      const q = searchStock.toLowerCase().trim();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.shelfLocation?.toLowerCase().includes(q)
      );
    }
    if (stockFilter === 'LOW') {
      list = list.filter((p) => p.stock > 0 && p.stock <= (p.minStockAlert || settings.lowStockThreshold));
    } else if (stockFilter === 'OUT') {
      list = list.filter((p) => p.stock <= 0);
    }
    return list;
  }, [products, searchStock, stockFilter, settings.lowStockThreshold]);

  // Filtered Expiry Table
  const filteredExpiryProducts = useMemo(() => {
    let list = products.map((p) => ({
      ...p,
      expiryData: getExpiryStatus(p.expiryDate, settings.expiryWarningDays),
    }));

    if (expiryFilter === 'EXPIRED') {
      list = list.filter((p) => p.expiryData.status === 'EXPIRED');
    } else if (expiryFilter === 'CRITICAL') {
      list = list.filter((p) => p.expiryData.status === 'CRITICAL');
    } else if (expiryFilter === 'WARNING') {
      list = list.filter((p) => p.expiryData.status === 'WARNING');
    } else {
      // Sort by days left ascending
      list.sort((a, b) => a.expiryData.daysLeft - b.expiryData.daysLeft);
    }

    return list;
  }, [products, expiryFilter, settings.expiryWarningDays]);

  // Handle Order Status Change in real-time
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['orderStatus']) => {
    const updated = orders.map((ord) => {
      if (ord.id === orderId) {
        return {
          ...ord,
          orderStatus: newStatus,
          updatedAt: new Date().toISOString(),
          paymentStatus: newStatus === 'COMPLETED' ? ('PAID' as const) : ord.paymentStatus,
        };
      }
      return ord;
    });
    playDingSound('order');
    onUpdateOrders(updated);
  };

  const handlePrintReport = (reportType: string) => {
    playDingSound('beep');
    window.print();
  };

  // Product count mapped to each category
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered categories for owner view
  const filteredOwnerCategories = useMemo(() => {
    return categories
      .filter((c) => c.id !== 'all')
      .filter((c) => {
        if (!searchCategory.trim()) return true;
        const q = searchCategory.toLowerCase().trim();
        return (
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      });
  }, [categories, searchCategory]);

  // Category Icon helper
  const renderCategoryIconHelper = (iconName: string, classNameStr: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'CupSoda':
        return <CupSoda className={classNameStr} />;
      case 'Soup':
        return <Soup className={classNameStr} />;
      case 'Cookie':
        return <Cookie className={classNameStr} />;
      case 'Milk':
        return <Milk className={classNameStr} />;
      case 'Flame':
        return <Flame className={classNameStr} />;
      case 'Sparkles':
        return <Sparkles className={classNameStr} />;
      case 'PackageCheck':
        return <PackageCheck className={classNameStr} />;
      case 'Coffee':
        return <Coffee className={classNameStr} />;
      case 'Wine':
        return <Wine className={classNameStr} />;
      case 'Apple':
        return <Apple className={classNameStr} />;
      case 'Fish':
        return <Fish className={classNameStr} />;
      case 'Tag':
        return <Tag className={classNameStr} />;
      case 'ShoppingBag':
        return <ShoppingBag className={classNameStr} />;
      case 'Boxes':
        return <Boxes className={classNameStr} />;
      case 'Heart':
        return <Heart className={classNameStr} />;
      case 'Layers':
        return <Layers className={classNameStr} />;
      case 'Store':
        return <Store className={classNameStr} />;
      case 'Package':
      default:
        return <Package className={classNameStr} />;
    }
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      id: '',
      name: '',
      icon: 'Package',
      color: 'bg-emerald-600',
      description: '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      description: cat.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = categoryFormData.name.trim();
    if (!trimmedName) return;

    let catId = categoryFormData.id.trim();
    if (!catId) {
      catId =
        trimmedName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;
    }

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: trimmedName,
              icon: categoryFormData.icon,
              color: categoryFormData.color,
              description: categoryFormData.description.trim(),
            }
          : c
      );
      onUpdateCategories(updated);
    } else {
      if (categories.some((c) => c.id === catId)) {
        catId = `${catId}_${Date.now().toString().slice(-4)}`;
      }
      const newCat: Category = {
        id: catId,
        name: trimmedName,
        icon: categoryFormData.icon,
        color: categoryFormData.color,
        description: categoryFormData.description.trim(),
      };
      onUpdateCategories([...categories, newCat]);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string) => {
    if (catId === 'all') {
      return;
    }
    const attachedCount = products.filter((p) => p.category === catId).length;
    if (attachedCount > 0) {
      const confirmDelete = window.confirm(
        `Danh mục này đang có ${attachedCount} sản phẩm. Các sản phẩm này sẽ được chuyển về danh mục khác. Bạn có chắc muốn xóa?`
      );
      if (!confirmDelete) return;

      const fallbackCatId = categories.find((c) => c.id !== 'all' && c.id !== catId)?.id || 'instant_food';
      const updatedProducts = products.map((p) =>
        p.category === catId ? { ...p, category: fallbackCatId } : p
      );
      onUpdateProducts(updatedProducts);
    } else {
      const confirmDelete = window.confirm('Bạn có chắc muốn xóa danh mục này?');
      if (!confirmDelete) return;
    }

    const updated = categories.filter((c) => c.id !== catId);
    onUpdateCategories(updated);
  };

  return (
    <div className="w-full flex flex-col bg-slate-100 min-h-screen">
      {/* Top Banner Navigation & Quick Actions */}
      <div className="w-full bg-white border-b border-slate-200/90 px-3.5 sm:px-6 py-3.5 sm:py-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase">
                Bảng điều khiển Quản Lý
              </span>
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${isStoreOpenNow(settings.businessHours) ? 'bg-emerald-500' : 'bg-rose-400'}`}
                title={isStoreOpenNow(settings.businessHours) ? 'Đang mở cửa' : 'Đã đóng cửa'}
              />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {settings.storeName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{settings.address}</span>
            </p>
          </div>

          {/* Quick Header Actions: 2-column grid on mobile, inline-flex on tablet/desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => {
                setActiveTab('CATEGORIES');
                handleOpenAddCategory();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-4 h-4 shrink-0" />
              <span>+ Thêm danh mục</span>
            </button>
            <button
              onClick={() => onOpenScanner('STOCK_IN')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <Barcode className="w-4 h-4 shrink-0" />
              <span>Quét nhập kho</span>
            </button>
            <button
              onClick={() => onOpenScanner('STOCK_OUT')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <Barcode className="w-4 h-4 shrink-0" />
              <span>Quét xuất kho</span>
            </button>
            <button
              onClick={onOpenNewProductModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Responsive Segmented Grid Matrix (2 cols on mobile, 3-4 cols on tablet, 7 cols on desktop - ZERO horizontal scroll, 100% visible) */}
        <div className="mt-3.5 sm:mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
            {/* Tab 1: REVENUE */}
            <button
              type="button"
              onClick={() => setActiveTab('REVENUE')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'REVENUE'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'REVENUE' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="truncate">Doanh thu & Lãi</span>
              </div>
            </button>

            {/* Tab 2: INVENTORY */}
            <button
              type="button"
              onClick={() => setActiveTab('INVENTORY')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'INVENTORY'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Package className={`w-4 h-4 shrink-0 ${activeTab === 'INVENTORY' ? 'text-white' : 'text-blue-600'}`} />
                <span className="truncate">Kiểm kho</span>
              </div>
              {auditReport.lowStockItems.length > 0 && (
                <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  activeTab === 'INVENTORY' ? 'bg-white text-emerald-800' : 'bg-amber-500 text-white'
                }`}>
                  {auditReport.lowStockItems.length}
                </span>
              )}
            </button>

            {/* Tab 3: EXPIRY */}
            <button
              type="button"
              onClick={() => setActiveTab('EXPIRY')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'EXPIRY'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'EXPIRY' ? 'text-white' : 'text-rose-600'}`} />
                <span className="truncate">Hạn sử dụng</span>
              </div>
              {(auditReport.expiredItems.length > 0 || auditReport.nearExpiryItems.length > 0) && (
                <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  activeTab === 'EXPIRY' ? 'bg-white text-rose-700' : 'bg-rose-500 text-white'
                }`}>
                  {auditReport.expiredItems.length + auditReport.nearExpiryItems.length}
                </span>
              )}
            </button>

            {/* Tab 4: ORDERS */}
            <button
              type="button"
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'ORDERS'
                  ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <ShoppingBag className={`w-4 h-4 shrink-0 ${activeTab === 'ORDERS' ? 'text-white' : 'text-indigo-600'}`} />
                <span className="truncate">Đơn hàng</span>
              </div>
              <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                activeTab === 'ORDERS' ? 'bg-white text-emerald-800' : 'bg-blue-600 text-white'
              }`}>
                {orders.length}
              </span>
            </button>

            {/* Tab 5: CATEGORIES */}
            <button
              type="button"
              onClick={() => setActiveTab('CATEGORIES')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'CATEGORIES'
                  ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FolderTree className={`w-4 h-4 shrink-0 ${activeTab === 'CATEGORIES' ? 'text-white' : 'text-indigo-600'}`} />
                <span className="truncate">Quản lý Danh mục</span>
              </div>
              <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 font-mono ${
                activeTab === 'CATEGORIES' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
              }`}>
                {categories.filter((c) => c.id !== 'all').length}
              </span>
            </button>

            {/* Tab 6: DEBT */}
            <button
              type="button"
              onClick={() => setActiveTab('DEBT')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'DEBT'
                  ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Receipt className={`w-4 h-4 shrink-0 ${activeTab === 'DEBT' ? 'text-white' : 'text-amber-600'}`} />
                <span className="truncate">Sổ Ghi Nợ (DB)</span>
              </div>
              {debtors.filter((d) => d.totalDebt > 0).length > 0 && (
                <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  activeTab === 'DEBT' ? 'bg-white text-amber-800' : 'bg-rose-500 text-white'
                }`}>
                  {debtors.filter((d) => d.totalDebt > 0).length}
                </span>
              )}
            </button>

            {/* Tab 7: SETTINGS */}
            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center justify-between sm:justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-98 ${
                activeTab === 'SETTINGS'
                  ? 'bg-slate-800 text-white shadow-xs ring-1 ring-slate-800'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'SETTINGS' ? 'text-white' : 'text-slate-600'}`} />
                <span className="truncate">Cấu hình</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="w-full p-4 sm:p-6 space-y-6">
        {/* TAB 1: REVENUE */}
        {activeTab === 'REVENUE' && (
          <div className="animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Sub-tabs doanh thu: cột dọc trái (desktop), hàng ngang (mobile) */}
              <div className="w-full md:w-44 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:sticky md:top-24">
                <button
                  onClick={() => setRevenueSubTab('OVERVIEW')}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    revenueSubTab === 'OVERVIEW'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  Tổng quan
                </button>
                <button
                  onClick={() => setRevenueSubTab('MONTHLY')}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    revenueSubTab === 'MONTHLY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  Theo tháng
                </button>
              </div>
              <div className="flex-1 min-w-0 w-full space-y-6">
                {revenueSubTab === 'OVERVIEW' ? (
                  <>
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Doanh thu hôm nay</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {formatVND(revenueStats.todayRevenue)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>
                    {revenueStats.pctVsYesterday === null
                      ? 'Chưa có dữ liệu hôm qua'
                      : `${revenueStats.pctVsYesterday >= 0 ? '+' : ''}${revenueStats.pctVsYesterday.toFixed(1)}% so với hôm qua`}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Lợi nhuận gộp ước tính</span>
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-2">
                  {formatVND(revenueStats.todayProfit)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {revenueStats.margin === null
                    ? 'Chưa có doanh thu hôm nay'
                    : `Tỷ suất lợi nhuận ${revenueStats.margin.toFixed(1)}%`}
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Đơn hàng hoàn tất</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {revenueStats.todayOrdersCount} đơn
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Bao gồm đơn quầy & đơn đặt online
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Giá trị kho hiện tại</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {formatVND(auditReport.totalRetailValue)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Vốn kho: {formatVND(auditReport.totalCostValue)}
                </div>
              </div>
            </div>

            {/* Revenue Chart Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Biểu đồ Doanh thu & Lợi nhuận tuần này</h3>
                  <p className="text-xs text-slate-400">Dữ liệu doanh thu bán lẻ hàng ngày</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                    <span className="text-slate-600">Doanh thu</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-sky-500" />
                    <span className="text-slate-600">Lợi nhuận</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="#64748b"
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => formatVND(Number(val))}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="doanhThu" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={38} />
                    <Bar dataKey="loiNhuan" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

                  </>
                ) : (
                  <>
            {/* Monthly Revenue Section — số thật từ đơn hàng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Doanh thu theo tháng</h3>
                  <p className="text-xs text-slate-400">Chọn tháng để xem chi tiết doanh thu & lợi nhuận</p>
                </div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {monthlyStats.months.map((m) => (
                    <option key={m} value={m}>
                      {monthlyStats.monthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3 Metric Cards for selected month */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Doanh thu {monthlyStats.monthLabel(selectedMonth)}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {formatVND(monthlyStats.selected.revenue)}
                  </div>
                </div>
                <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Lợi nhuận gộp</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-2">
                    {formatVND(monthlyStats.selected.profit)}
                  </div>
                </div>
                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Đơn hàng</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {monthlyStats.selected.count} đơn
                  </div>
                </div>
              </div>

              {/* 6-month chart */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">6 tháng gần nhất</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="#64748b"
                        tickFormatter={(val) => `${(val / 1000000).toFixed(val >= 1000000 ? 1 : 0)}tr`}
                      />
                      <Tooltip
                        formatter={(val: any) => formatVND(Number(val))}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="doanhThu" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={38} />
                      <Bar dataKey="loiNhuan" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

                  </>
                )}
            {/* Recent Transactions List — thuộc tab Tổng quan */}
            {revenueSubTab === 'OVERVIEW' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Lịch sử Nhập / Xuất / Bán hàng gần nhất</h3>
                <span className="text-xs text-slate-400">{transactions.length} giao dịch</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Loại</th>
                      <th className="py-2.5 px-3">Sản phẩm</th>
                      <th className="py-2.5 px-3 text-center">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{tx.timestamp}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              tx.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'OUT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.type === 'IN' ? 'Nhập kho' : tx.type === 'OUT' ? 'Xuất kho' : 'Bán hàng'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{tx.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {tx.type === 'IN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatVND(tx.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{tx.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY */}
        {activeTab === 'INVENTORY' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Automated Audit Report Banner */}
            <div className="bg-emerald-900 text-white p-5 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Báo cáo kiểm kho tự động
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mt-1">
                  Tổng {auditReport.totalStockQuantity} món hàng trong kho
                </h3>
                <p className="text-xs text-emerald-200 mt-1 max-w-xl">
                  {auditReport.lowStockItems.length > 0
                    ? `⚠️ Cảnh báo: Có ${auditReport.lowStockItems.length} sản phẩm sắp hết hàng cần nhập thêm để đảm bảo bán hàng không gián đoạn.`
                    : '✅ Tồn kho ổn định, không có sản phẩm nào chạm ngưỡng thiếu hàng.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintReport('inventory')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>In báo cáo kho</span>
                </button>
              </div>
            </div>

            {/* Inventory Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã vạch hoặc vị trí kệ..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  onClick={() => setStockFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    stockFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({products.length})
                </button>
                <button
                  onClick={() => setStockFilter('LOW')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    stockFilter === 'LOW'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <span>Sắp hết ({auditReport.lowStockItems.length})</span>
                </button>
                <button
                  onClick={() => setStockFilter('OUT')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    stockFilter === 'OUT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Hết hàng (0)
                </button>
              </div>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-3">Mã vạch</th>
                      <th className="py-3 px-3">Vị trí kệ</th>
                      <th className="py-3 px-3 text-right">Giá vốn</th>
                      <th className="py-3 px-3 text-right">Giá bán</th>
                      <th className="py-3 px-3 text-center">Tồn kho</th>
                      <th className="py-3 px-3 text-center">Tình trạng</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStockProducts.map((p) => {
                      const isLow = p.stock <= (p.minStockAlert || settings.lowStockThreshold);
                      const isOut = p.stock <= 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <ProductImage
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900">{p.name}</h4>
                                <span className="text-[11px] text-slate-500">ĐVT: {p.unit}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{p.barcode}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {p.shelfLocation || 'Chưa đặt'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-mono">
                            {formatVND(p.costPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700 font-mono">
                            {formatVND(p.sellingPrice)}
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-sm">
                            {p.stock}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                Hết hàng
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Sắp hết
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                                Đủ hàng
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onEditProduct(p)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Chỉnh sửa sản phẩm"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPIRY */}
        {activeTab === 'EXPIRY' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Expiry Summary Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-rose-700">Đã hết hạn</span>
                  <div className="text-xl font-extrabold text-rose-900">
                    {auditReport.expiredItems.length} sản phẩm
                  </div>
                  <span className="text-[11px] text-rose-600">Cần tiêu hủy hoặc đổi trả</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-amber-800">Cận date (≤ 30 ngày)</span>
                  <div className="text-xl font-extrabold text-amber-900">
                    {auditReport.nearExpiryItems.length} sản phẩm
                  </div>
                  <span className="text-[11px] text-amber-700">Đề xuất giảm giá xả hàng</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-800">Hạn sử dụng xa an toàn</span>
                  <div className="text-xl font-extrabold text-emerald-900">
                    {products.length - auditReport.expiredItems.length - auditReport.nearExpiryItems.length} sản phẩm
                  </div>
                  <span className="text-[11px] text-emerald-600">Lưu kho tiêu chuẩn</span>
                </div>
              </div>
            </div>

            {/* Expiry Action Recommendation Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Danh sách theo dõi Hạn Sử Dụng chi tiết</h3>
                  <p className="text-xs text-slate-400">Tự động cảnh báo và gợi ý xử lý hàng cận hạn</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintReport('expiry')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In phiếu cận date</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-3">Lô hàng</th>
                      <th className="py-3 px-3">Ngày SX (NSX)</th>
                      <th className="py-3 px-3">Hạn sử dụng (HSD)</th>
                      <th className="py-3 px-3 text-center">Tồn kho</th>
                      <th className="py-3 px-3">Tình trạng hạn</th>
                      <th className="py-3 px-4">Gợi ý hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpiryProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <ProductImage src={p.image} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-slate-200" />
                            <div>
                              <h4 className="font-bold text-slate-900">{p.name}</h4>
                              <span className="text-[11px] font-mono text-slate-400">{p.barcode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{p.batchNumber}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{formatDate(p.mfgDate)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{formatDate(p.expiryDate)}</td>
                        <td className="py-3 px-3 text-center font-bold">{p.stock} {p.unit}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.expiryData.badgeBg}`}>
                            {p.expiryData.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {p.expiryData.status === 'EXPIRED' ? (
                            <span className="text-rose-600 font-semibold text-[11px]">
                              🚨 Thu hồi ngay khỏi quầy
                            </span>
                          ) : p.expiryData.status === 'CRITICAL' ? (
                            <span className="text-amber-700 font-semibold text-[11px]">
                              ⚡ Giảm giá 30% xả hàng nhanh
                            </span>
                          ) : p.expiryData.status === 'WARNING' ? (
                            <span className="text-amber-600 font-medium text-[11px]">
                              📦 Đưa ra vị trí mắt nhìn ở kệ
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-[11px]">
                              ✔️ Tồn trữ bình thường
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REAL-TIME ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Quản lý Đơn hàng Khách Đặt Real-time</h3>
                <p className="text-xs text-slate-400">Trạng thái sẽ được đồng bộ ngay tức thì tới thiết bị của khách</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs text-emerald-800 font-semibold">Đang lắng nghe đơn mới</span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <h4 className="font-bold text-slate-700">Chưa có đơn hàng nào</h4>
                <p className="text-xs">Khi khách đặt hàng online hoặc chuyển tiền VietQR, đơn sẽ hiện ở đây ngay lập tức.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900">{ord.code}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              ord.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.paymentStatus === 'PAID' ? 'Đã thanh toán VietQR' : 'Chưa thanh toán'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{formatDate(ord.createdAt)}</span>
                      </div>

                      {/* Current Status Pill */}
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900 text-white">
                        {ord.orderStatus === 'PENDING'
                          ? 'Chờ duyệt'
                          : ord.orderStatus === 'CONFIRMED'
                          ? 'Đã duyệt'
                          : ord.orderStatus === 'PACKING'
                          ? 'Đang gói'
                          : ord.orderStatus === 'SHIPPING'
                          ? 'Đang giao'
                          : ord.orderStatus === 'COMPLETED'
                          ? 'Hoàn thành'
                          : 'Đã hủy'}
                      </span>
                    </div>

                    {/* Customer details */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-1">
                      <p>Khách: <strong className="text-slate-800">{ord.customerName}</strong> ({ord.customerPhone})</p>
                      <p className="truncate">Địa chỉ: <strong className="text-slate-800">{ord.customerAddress}</strong></p>
                      {ord.note && <p className="text-amber-800 italic">Ghi chú: {ord.note}</p>}
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <span className="truncate">{it.productName} <strong className="text-emerald-700">x{it.quantity}</strong></span>
                          <span className="font-mono font-medium">{formatVND(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400">Tổng tiền:</span>
                        <div className="text-base font-black text-emerald-700">
                          {formatVND(ord.totalAmount)}
                        </div>
                      </div>

                      {/* Quick status stepper buttons */}
                      <div className="flex items-center gap-1.5">
                        {ord.orderStatus === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'CONFIRMED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            Xác nhận đơn
                          </button>
                        )}
                        {ord.orderStatus === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'PACKING')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            Đang soạn hàng
                          </button>
                        )}
                        {ord.orderStatus === 'PACKING' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'SHIPPING')}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            Bắt đầu giao
                          </button>
                        )}
                        {ord.orderStatus === 'SHIPPING' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition"
                          >
                            Đã giao xong
                          </button>
                        )}
                        {ord.orderStatus !== 'COMPLETED' && ord.orderStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'CANCELLED')}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium transition"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CATEGORIES MANAGEMENT */}
        {activeTab === 'CATEGORIES' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Quản lý danh mục hàng hoá</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo mới, tuỳ chỉnh biểu tượng, màu sắc và phân loại hàng hoá linh hoạt cho cửa hàng.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Thêm danh mục mới</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Tổng danh mục</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {categories.filter((c) => c.id !== 'all').length}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">Đang hiển thị trên ứng dụng</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Sản phẩm trong kho</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {products.length}
                  </div>
                  <span className="text-[11px] text-blue-600 font-bold">Đã phân loại đầy đủ</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div className="min-w-0 flex-1 mr-2">
                  <span className="text-xs font-semibold text-slate-500">Danh mục nhiều hàng nhất</span>
                  <div className="text-base font-bold text-slate-900 mt-1 truncate">
                    {(() => {
                      let maxCount = -1;
                      let topCatName = 'Chưa có';
                      categories
                        .filter((c) => c.id !== 'all')
                        .forEach((c) => {
                          const cnt = categoryProductCounts[c.id] || 0;
                          if (cnt > maxCount) {
                            maxCount = cnt;
                            topCatName = `${c.name} (${cnt})`;
                          }
                        });
                      return topCatName;
                    })()}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate">Có lượng SKU phong phú nhất</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  placeholder="Tìm danh mục theo tên, mã..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchCategory && (
                  <button
                    onClick={() => setSearchCategory('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Tìm thấy <span className="font-bold text-slate-900">{filteredOwnerCategories.length}</span> danh mục
              </div>
            </div>

            {/* Categories Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredOwnerCategories.map((cat) => {
                const count = categoryProductCounts[cat.id] || 0;
                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Icon & Slug */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${cat.color}`}
                        >
                          {renderCategoryIconHelper(cat.icon, 'w-5 h-5')}
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200/80">
                          #{cat.id}
                        </span>
                      </div>

                      {/* Name & Description */}
                      <div className="mt-3">
                        <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                          {cat.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                          {cat.description || 'Chưa có mô tả chi tiết cho danh mục này.'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row: Product count and actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {count} sản phẩm
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Chỉnh sửa danh mục"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredOwnerCategories.length === 0 && (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <FolderTree className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy danh mục nào</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Thử tìm kiếm với từ khóa khác hoặc bấm nút bên dưới để tạo danh mục mới.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                >
                  + Thêm danh mục mới ngay
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DEBT MANAGEMENT (SỔ GHI NỢ KHÁCH HÀNG TẠP HOÁ) */}
        {activeTab === 'DEBT' && (
          <div className="space-y-6 animate-fadeIn">
            <DebtManagementView
              debtors={debtors}
              products={products}
              settings={settings}
              onUpdateDebtors={onUpdateDebtors || (() => {})}
            />
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="animate-fadeIn">
            <StoreSettingsView settings={settings} onSave={onUpdateSettings} />
          </div>
        )}
      </div>

      {/* MODAL: CREATE / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingCategory ? 'Cập nhật tên, biểu tượng và màu sắc' : 'Tạo nhóm phân loại mới cho cửa hàng'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCategorySubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Live Preview Box */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Xem trước hiển thị
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs ${categoryFormData.color}`}
                    >
                      {renderCategoryIconHelper(categoryFormData.icon, 'w-4 h-4')}
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {categoryFormData.name.trim() || 'Tên danh mục'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      {categoryFormData.id || 'slug_id'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-semibold">
                  <span className="text-emerald-300">
                    {renderCategoryIconHelper(categoryFormData.icon, 'w-3 h-3')}
                  </span>
                  <span>{categoryFormData.name.trim() || 'Tên'}</span>
                </div>
              </div>

              {/* Tên danh mục */}
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoSlug = newName
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_+|_+$/g, '');
                    setCategoryFormData((prev) => ({
                      ...prev,
                      name: newName,
                      id: editingCategory ? prev.id : autoSlug,
                    }));
                  }}
                  placeholder="Ví dụ: Bia & Rượu giải khát, Văn phòng phẩm..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Mã định danh (ID / Slug) */}
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Mã định danh (ID / Slug)
                </label>
                <input
                  type="text"
                  value={categoryFormData.id}
                  disabled={!!editingCategory}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    }))
                  }
                  placeholder="slug_dinh_danh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dùng để liên kết các sản phẩm. Tự động sinh từ tên danh mục.
                </p>
              </div>

              {/* Chọn Biểu Tượng (Icon Selector) */}
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1.5">
                  Chọn biểu tượng đại diện
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'Store', label: 'Cửa hàng' },
                    { id: 'CupSoda', label: 'Nước ngọt' },
                    { id: 'Soup', label: 'Mì ăn liền' },
                    { id: 'Cookie', label: 'Bánh kẹo' },
                    { id: 'Milk', label: 'Sữa tươi' },
                    { id: 'Flame', label: 'Gia vị' },
                    { id: 'Sparkles', label: 'Hoá phẩm' },
                    { id: 'PackageCheck', label: 'Đồ hộp' },
                    { id: 'Coffee', label: 'Cà phê' },
                    { id: 'Wine', label: 'Bia rượu' },
                    { id: 'Apple', label: 'Trái cây' },
                    { id: 'Fish', label: 'Đồ khô' },
                    { id: 'Tag', label: 'Nhãn mác' },
                    { id: 'ShoppingBag', label: 'Túi xách' },
                    { id: 'Boxes', label: 'Thùng hàng' },
                    { id: 'Heart', label: 'Yêu thích' },
                    { id: 'Layers', label: 'Gia dụng' },
                    { id: 'Package', label: 'Khác' },
                  ].map((iconItem) => {
                    const isSelected = categoryFormData.icon === iconItem.id;
                    return (
                      <button
                        key={iconItem.id}
                        type="button"
                        onClick={() => setCategoryFormData((prev) => ({ ...prev, icon: iconItem.id }))}
                        title={iconItem.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition text-slate-700 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {renderCategoryIconHelper(iconItem.id, 'w-5 h-5')}
                        <span className="text-[9px] mt-1 truncate max-w-full font-medium">
                          {iconItem.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn Màu Sắc (Color Palette) */}
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1.5">
                  Màu sắc nhận diện
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { bg: 'bg-emerald-600', name: 'Xanh lá' },
                    { bg: 'bg-sky-500', name: 'Xanh da trời' },
                    { bg: 'bg-amber-500', name: 'Hổ phách' },
                    { bg: 'bg-rose-500', name: 'Đỏ hồng' },
                    { bg: 'bg-blue-600', name: 'Xanh dương' },
                    { bg: 'bg-orange-500', name: 'Cam' },
                    { bg: 'bg-teal-500', name: 'Xanh ngọc' },
                    { bg: 'bg-indigo-600', name: 'Tím chàm' },
                    { bg: 'bg-purple-600', name: 'Tím hoa' },
                    { bg: 'bg-slate-700', name: 'Xám chì' },
                  ].map((colorItem) => {
                    const isSelected = categoryFormData.color === colorItem.bg;
                    return (
                      <button
                        key={colorItem.bg}
                        type="button"
                        onClick={() => setCategoryFormData((prev) => ({ ...prev, color: colorItem.bg }))}
                        className={`w-7 h-7 rounded-xl ${colorItem.bg} transition-all flex items-center justify-center text-white ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:opacity-90'
                        }`}
                        title={colorItem.name}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mô tả danh mục */}
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">
                  Mô tả ngắn (tuỳ chọn)
                </label>
                <textarea
                  rows={2}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả nhóm sản phẩm, ví dụ: Các loại nước ngọt có ga, nước khoáng và trà giải khát..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition text-center active:scale-95"
                >
                  {editingCategory ? 'Cập nhật danh mục' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
