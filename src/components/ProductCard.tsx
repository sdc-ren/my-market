import React from 'react';
import { Product } from '../types';
import { formatVND, getExpiryStatus } from '../utils/vietqr';
import { ShoppingCart, Plus, Minus, AlertCircle, Barcode, MapPin, PackageCheck, Eye } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  mode: 'customer' | 'owner';
  cartQuantity?: number;
  onAddToCart?: (product: Product) => void;
  onUpdateCartQuantity?: (product: Product, delta: number) => void;
  onQuickStockAction?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  mode,
  cartQuantity = 0,
  onAddToCart,
  onUpdateCartQuantity,
  onQuickStockAction,
  onViewDetails,
}) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.minStockAlert || 5);
  const expiryInfo = getExpiryStatus(product.expiryDate);

  return (
    <div
      id={`product-card-${product.id}`}
      className={`group relative flex flex-row sm:flex-col bg-white rounded-2xl border transition-all duration-200 hover:shadow-md overflow-hidden h-full min-h-[110px] sm:min-h-0 ${
        isOutOfStock
          ? 'border-slate-200 bg-slate-50/60 opacity-85'
          : 'border-slate-200/90 hover:border-emerald-400'
      }`}
    >
      {/* Product Image */}
      <div
        className="relative bg-slate-100 overflow-hidden cursor-pointer select-none shrink-0 w-28 sm:w-full h-auto sm:h-44"
        onClick={() => onViewDetails?.(product)}
      >
        <ProductImage
          src={product.image}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges on Top */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 pointer-events-none">
          {/* Stock Badge */}
          {isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-rose-600 text-white shadow-xs">
              Hết hàng
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-amber-500 text-white shadow-xs">
              Còn {product.stock} {product.unit}
            </span>
          ) : (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-emerald-800/85 text-white backdrop-blur-xs">
              Kho: {product.stock}
            </span>
          )}

          {/* Expiry Warning Badge — chỉ hiện cho chủ shop, không hiện trên page bán hàng */}
          {mode === 'owner' && (expiryInfo.status === 'CRITICAL' || expiryInfo.status === 'EXPIRED') && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                expiryInfo.status === 'EXPIRED'
                  ? 'bg-red-600 text-white'
                  : 'bg-rose-500 text-white animate-pulse'
              }`}
            >
              {expiryInfo.status === 'EXPIRED' ? 'Hết HSD' : 'Cận date'}
            </span>
          )}
        </div>

        {/* Brand Tag (bottom of image) */}
        <div className="absolute bottom-2 left-2 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-black/60 text-white backdrop-blur-xs">
            {product.brand || 'Tạp hoá'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5 justify-between min-w-0">
        <div>
          {/* Barcode & Shelf location */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 gap-1">
            <span className="font-mono flex items-center gap-1 truncate text-slate-600">
              <Barcode className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{product.barcode}</span>
            </span>
            <span className="text-slate-500 font-medium shrink-0">
              ĐVT: <strong className="text-slate-800">{product.unit}</strong>
            </span>
          </div>

          {/* Product Name */}
          <h3
            onClick={() => onViewDetails?.(product)}
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight sm:leading-snug hover:text-emerald-700 cursor-pointer transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Subtitle / Owner Details */}
          {mode === 'owner' ? (
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 gap-1">
              <span className="flex items-center gap-1 text-slate-600 truncate">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{product.shelfLocation || 'Chưa xếp kệ'}</span>
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                Vốn: {formatVND(product.costPrice)}
              </span>
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-500 truncate hidden sm:block">
              {product.description || `Sản phẩm chính hãng từ ${product.brand}`}
            </p>
          )}
        </div>

        {/* Bottom Pricing & Action Section */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
          {/* Price */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-extrabold text-emerald-700 truncate">
              {formatVND(product.sellingPrice)}
            </span>
            {mode === 'owner' && (
              <span className="text-[10px] text-emerald-600/90 font-medium truncate">
                Lời: +{formatVND(product.sellingPrice - product.costPrice)}
              </span>
            )}
          </div>

          {/* Action Button */}
          {mode === 'customer' ? (
            <div className="shrink-0">
              {isOutOfStock ? (
                <button
                  disabled
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                >
                  Hết hàng
                </button>
              ) : cartQuantity > 0 ? (
                <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-lg p-0.5 shadow-2xs">
                  <button
                    id={`cart-minus-${product.id}`}
                    onClick={() => onUpdateCartQuantity?.(product, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-emerald-700 shadow-2xs hover:bg-emerald-100 active:scale-95 transition"
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-emerald-900">
                    {cartQuantity}
                  </span>
                  <button
                    id={`cart-plus-${product.id}`}
                    onClick={() => onUpdateCartQuantity?.(product, 1)}
                    disabled={cartQuantity >= product.stock}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id={`btn-add-cart-${product.id}`}
                  onClick={() => onAddToCart?.(product)}
                  className="flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Mua</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <button
                id={`btn-quick-stock-${product.id}`}
                onClick={() => onQuickStockAction?.(product)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 transition"
                title="Nhập / Xuất kho nhanh"
              >
                <PackageCheck className="w-3 h-3 text-emerald-600" />
                <span>Kho</span>
              </button>
              <button
                id={`btn-view-details-${product.id}`}
                onClick={() => onViewDetails?.(product)}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                Sửa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
