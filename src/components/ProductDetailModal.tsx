import React, { useState } from 'react';
import { Product } from '../types';
import { formatVND, formatDate, getExpiryStatus } from '../utils/vietqr';
import { X, ShoppingCart, Plus, Minus, Barcode, Calendar, PackageCheck, AlertCircle, Edit3 } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  isOpen: boolean;
  product: Product | null;
  mode: 'customer' | 'owner';
  cartQuantity?: number;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
  onQuickAdjustStock?: (product: Product, delta: number) => void;
  onEditProduct?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  product,
  mode,
  cartQuantity = 0,
  onClose,
  onAddToCart,
  onQuickAdjustStock,
  onEditProduct,
}) => {
  const [selectedQty, setSelectedQty] = useState<number>(1);

  if (!isOpen || !product) return null;

  const expiryInfo = getExpiryStatus(product.expiryDate);
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold uppercase">
              {product.brand}
            </span>
            <span className="text-xs text-slate-400">ĐVT: {product.unit}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Main Image with Badges */}
          <div className="relative w-full h-56 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            <ProductImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {/* Nhãn HSD: khách chỉ thấy khi hàng còn date tốt/cảnh báo nhẹ; chủ shop thấy đầy đủ */}
              {(mode === 'owner' || expiryInfo.status === 'GOOD' || expiryInfo.status === 'WARNING') && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${expiryInfo.badgeBg}`}>
                  {expiryInfo.label}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                Kho: {product.stock} {product.unit}
              </span>
            </div>
          </div>

          {/* Title & Price */}
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-700">
                {formatVND(product.sellingPrice)}
              </span>
              {mode === 'owner' && (
                <span className="text-xs text-slate-400">
                  (Giá vốn: {formatVND(product.costPrice)})
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {product.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <Barcode className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Mã vạch:</span>
                <strong className="font-mono text-slate-800">{product.barcode}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Ngày sản xuất:</span>
                <strong className="font-mono text-slate-800">{formatDate(product.mfgDate) || 'N/A'}</strong>
              </div>
            </div>

            {/* Hạn sử dụng: khách không thấy dòng này nếu hàng hết HSD/cận date */}
            {(mode === 'owner' || expiryInfo.status === 'GOOD' || expiryInfo.status === 'WARNING') && (
              <div className="flex items-center gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Hạn sử dụng:</span>
                  <strong className="font-mono text-rose-700">{formatDate(product.expiryDate)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Owner Fast Stock Adjustment */}
          {mode === 'owner' && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-emerald-900 block">
                Điều chỉnh nhanh số lượng kho:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onQuickAdjustStock?.(product, 5)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition"
                >
                  +5 {product.unit}
                </button>
                <button
                  onClick={() => onQuickAdjustStock?.(product, 20)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition"
                >
                  +20 {product.unit}
                </button>
                <button
                  onClick={() => onQuickAdjustStock?.(product, 50)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition"
                >
                  +50 {product.unit}
                </button>
                <button
                  onClick={() => onQuickAdjustStock?.(product, -1)}
                  disabled={product.stock <= 0}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition disabled:opacity-40"
                >
                  -1 {product.unit}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {mode === 'customer' ? (
            <>
              {/* Quantity selector */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-extrabold text-slate-900">
                  {selectedQty}
                </span>
                <button
                  onClick={() => setSelectedQty(Math.min(product.stock, selectedQty + 1))}
                  disabled={selectedQty >= product.stock}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart?.(product, selectedQty);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 shadow-md transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isOutOfStock ? 'Tạm hết hàng' : `Thêm vào giỏ (${formatVND(product.sellingPrice * selectedQty)})`}</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEditProduct?.(product);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                <Edit3 className="w-4 h-4" />
                <span>Chỉnh sửa thông tin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
