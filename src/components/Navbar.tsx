import React from 'react';
import { StoreSettings, Order } from '../types';
import { formatVND } from '../utils/vietqr';
import { isStoreOpenNow, formatBusinessHours } from '../utils/businessHours';
import {
  Store,
  ShoppingCart,
  Barcode,
  Search,
  X,
  Bell,
  SlidersHorizontal,
  Clock,
  Lock,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  mode: 'customer' | 'owner';
  onToggleMode: (mode: 'customer' | 'owner') => void;
  isOwnerAuthenticated?: boolean;
  onLogoutOwner?: () => void;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenScanner: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  activeCustomerOrder: Order | null;
  onOpenActiveOrderTracking: () => void;
  settings: StoreSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onToggleMode,
  isOwnerAuthenticated = false,
  onLogoutOwner,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenScanner,
  onOpenNotifications,
  unreadNotificationsCount,
  activeCustomerOrder,
  onOpenActiveOrderTracking,
  settings,
}) => {
  const openNow = isStoreOpenNow(settings.businessHours);
  const hoursText = formatBusinessHours(settings.businessHours);
  return (
    <header className="w-full sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs select-none">
      {/* Top Bar (Clean, compact, no horizontal overflow) */}
      <div className="w-full px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Store Status */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.storeName}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-xs shrink-0 border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-base text-slate-900 leading-tight truncate">
              {settings.storeName}
            </h1>
            <div
              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium"
              title={hoursText ? `Giờ mở cửa: ${hoursText}` : undefined}
            >
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${openNow ? 'bg-emerald-500' : 'bg-rose-400'}`}
              />
              <span className={`truncate font-semibold ${openNow ? 'text-emerald-700' : 'text-rose-500'}`}>
                {openNow ? 'Đang mở cửa' : 'Đã đóng cửa'}
              </span>
              {hoursText && (
                <span className="hidden md:inline text-slate-400 truncate">• {hoursText}</span>
              )}
              <span className="hidden sm:inline text-slate-400">• Hotline: {settings.phone}</span>
            </div>
          </div>
        </div>

        {/* Search Input (Desktop Large screens only: lg+) */}
        <div className="hidden lg:flex flex-1 max-w-sm xl:max-w-md mx-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm mì tôm, nước ngọt, bánh kẹo, mã vạch..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions Toolbar (Compact & Streamlined) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              id="btn-mode-customer"
              onClick={() => onToggleMode('customer')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mode === 'customer'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chế độ Khách mua hàng"
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Khách</span>
            </button>

            <button
              id="btn-mode-owner"
              onClick={() => onToggleMode('owner')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mode === 'owner'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chế độ Quản lý chủ tiệm"
            >
              {isOwnerAuthenticated ? (
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
              )}
              <span className="hidden sm:inline whitespace-nowrap">Quản lý</span>
            </button>

            {/* Owner Logout / Lock Button */}
            {mode === 'owner' && onLogoutOwner && (
              <button
                id="btn-lock-owner"
                onClick={onLogoutOwner}
                className="ml-0.5 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                title="Khóa bảo vệ / Đăng xuất quản lý"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Barcode Scanner Trigger */}
          <button
            id="btn-nav-scanner"
            onClick={onOpenScanner}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition active:scale-95 shadow-2xs shrink-0 flex items-center gap-1.5 whitespace-nowrap"
            title="Quét mã vạch camera"
          >
            <Barcode className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden xl:inline">Quét mã</span>
          </button>

          {/* Notifications Bell */}
          <button
            id="btn-nav-notifications"
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0"
            title="Thông báo hệ thống"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Active Order Tracker Button */}
          {activeCustomerOrder && (
            <button
              id="btn-nav-order-tracking"
              onClick={onOpenActiveOrderTracking}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold hover:bg-blue-100 transition shrink-0 whitespace-nowrap"
              title={`Xem đơn hàng #${activeCustomerOrder.code}`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden md:inline">Đơn #{activeCustomerOrder.code}</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            id="btn-nav-cart"
            onClick={onOpenCart}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 shrink-0 whitespace-nowrap"
            title="Mở giỏ hàng"
          >
            <div className="relative flex items-center">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline font-mono">
              {cartTotal > 0 ? formatVND(cartTotal) : 'Giỏ hàng'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Search Row (< lg) */}
      <div className="lg:hidden px-3 sm:px-5 pb-2 pt-0.5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 sm:top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm, mã vạch..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 sm:top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
