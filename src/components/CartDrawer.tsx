import React, { useState } from 'react';
import { Product, OrderItem, StoreSettings } from '../types';
import { formatVND } from '../utils/vietqr';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, QrCode, Banknote, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { [productId: string]: number };
  products: Product[];
  settings: StoreSettings;
  onUpdateQuantity: (product: Product, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: (orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: 'DELIVERY' | 'PICKUP';
    paymentMethod: 'VIETQR' | 'CASH';
    note: string;
    items: OrderItem[];
    totalAmount: number;
  }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'VIETQR' | 'CASH'>('VIETQR');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Build cart items array
  const orderItems: OrderItem[] = [];
  let totalAmount = 0;

  for (const [productId, rawQty] of Object.entries(cart)) {
    const qty = Number(rawQty);
    if (qty <= 0) continue;
    const prod = products.find((p) => p.id === productId);
    if (!prod) continue;

    orderItems.push({
      productId: prod.id,
      barcode: prod.barcode,
      productName: prod.name,
      price: prod.sellingPrice,
      costPrice: prod.costPrice,
      quantity: qty,
      unit: prod.unit,
      image: prod.image,
    });

    totalAmount += prod.sellingPrice * qty;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    if (!customerName.trim()) {
      setFormError('Vui lòng nhập tên của bạn');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Vui lòng nhập số điện thoại');
      return;
    }
    if (deliveryType === 'DELIVERY' && !customerAddress.trim()) {
      setFormError('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    setFormError(null);
    onCheckout({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: deliveryType === 'PICKUP' ? 'Lấy hàng trực tiếp tại tiệm' : customerAddress.trim(),
      deliveryType,
      paymentMethod,
      note: note.trim(),
      items: orderItems,
      totalAmount,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full sm:max-w-lg md:max-w-xl h-full bg-white shadow-2xl flex flex-col animate-slideLeft">
        {/* Drawer Header */}
        <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Giỏ hàng của bạn</h3>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full">
              {orderItems.reduce((sum, item) => sum + item.quantity, 0)} món
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Đóng giỏ hàng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        {orderItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Giỏ hàng đang trống</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Hãy chọn các sản phẩm bánh kẹo, nước ngọt, đồ khô yêu thích để đặt hàng nhé!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              Tiếp tục mua hàng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* 1. PHẦN BÊN TRONG: Scroll riêng cho danh sách sản phẩm */}
            <div className="mx-3 sm:mx-4 mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col shrink-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  Món đã chọn ({orderItems.reduce((sum, item) => sum + item.quantity, 0)})
                </span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 text-[11px] font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa hết</span>
                </button>
              </div>

              {/* Scrollable list strictly inside this container */}
              <div className="max-h-[28vh] sm:max-h-[32vh] overflow-y-auto space-y-2 pr-1.5">
                {orderItems.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2.5 p-2 bg-white border border-slate-200/80 rounded-xl shadow-2xs"
                    >
                      <ProductImage
                        src={item.image}
                        alt={item.productName}
                        className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-slate-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.productName}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-bold text-emerald-700">
                            {formatVND(item.price)}
                          </p>
                          <span className="text-xs font-extrabold text-slate-800">
                            {formatVND(item.price * item.quantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">
                            ĐVT: {item.unit}
                          </span>
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5">
                            <button
                              type="button"
                              onClick={() => prod && onUpdateQuantity(prod, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => prod && onUpdateQuantity(prod, 1)}
                              disabled={prod ? item.quantity >= prod.stock : false}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. PHẦN BÊN NGOÀI: Form điền thông tin nhận hàng & thanh toán */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Thông tin nhận hàng
                  </h4>
                </div>

                {/* Delivery Type Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('DELIVERY')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      deliveryType === 'DELIVERY'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Giao tận nơi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('PICKUP')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      deliveryType === 'PICKUP'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Lấy tại tiệm</span>
                  </button>
                </div>

                {/* Inputs */}
                <div className="space-y-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Họ và tên người nhận *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Số điện thoại liên hệ *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {deliveryType === 'DELIVERY' && (
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Địa chỉ giao hàng (số nhà, phòng, ngõ...) *"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Ghi chú thêm cho tiệm (nếu có)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Phương thức thanh toán:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      paymentMethod === 'VIETQR'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'VIETQR'}
                      onChange={() => setPaymentMethod('VIETQR')}
                      className="text-emerald-600"
                    />
                    <div className="flex flex-col text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        VietQR
                      </span>
                      <span className="text-[10px] text-emerald-700 font-normal">
                        Mã QR tự động
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'CASH'}
                      onChange={() => setPaymentMethod('CASH')}
                      className="text-emerald-600"
                    />
                    <div className="flex flex-col text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-slate-600" />
                        Tiền mặt
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Khi nhận hàng
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Bottom Sticky Checkout */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">Tổng thanh toán:</span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatVND(totalAmount)}
                </span>
              </div>
              <button
                type="submit"
                id="btn-submit-order"
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition shadow-md flex items-center justify-center gap-2"
              >
                <span>{paymentMethod === 'VIETQR' ? 'Đặt hàng & Mở mã QR' : 'Xác nhận đặt hàng'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
