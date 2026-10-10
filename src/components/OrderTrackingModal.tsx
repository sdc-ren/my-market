import React from 'react';
import { Order } from '../types';
import { formatVND, formatDate } from '../utils/vietqr';
import { X, CheckCircle2, Clock, Package, Truck, Check, AlertCircle, Phone, MapPin } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface OrderTrackingModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const ORDER_STEPS = [
  { key: 'PENDING', label: 'Chờ xác nhận', desc: 'Đơn hàng đã được gửi tới tiệm', icon: Clock },
  { key: 'CONFIRMED', label: 'Đã xác nhận', desc: 'Tiệm đã duyệt và chuẩn bị hàng', icon: CheckCircle2 },
  { key: 'PACKING', label: 'Đang đóng gói', desc: 'Sản phẩm đang được kiểm đếm & đóng túi', icon: Package },
  { key: 'SHIPPING', label: 'Đang giao hàng', desc: 'Shipper đang trên đường giao hoặc sẵn sàng lấy tại tiệm', icon: Truck },
  { key: 'COMPLETED', label: 'Hoàn thành', desc: 'Khách hàng đã nhận đủ sản phẩm', icon: Check },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.orderStatus);
  const isCancelled = order.orderStatus === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Trạng Thái Đơn Hàng Real-time</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-400">Mã đơn: <strong className="text-white font-mono">{order.code}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Order Status Timeline */}
          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Đơn hàng đã bị hủy</h4>
                <p className="text-xs text-rose-600 mt-0.5">Vui lòng liên hệ tiệm nếu có thắc mắc.</p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="space-y-4">
                {ORDER_STEPS.map((step, idx) => {
                  const isFinished = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex items-start gap-3 relative">
                      {/* Vertical line connecting steps */}
                      {idx < ORDER_STEPS.length - 1 && (
                        <div
                          className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors ${
                            currentStepIndex > idx ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      )}

                      {/* Icon Circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md scale-110'
                            : isFinished
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isCurrent ? 'text-emerald-800' : isFinished ? 'text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                              Đang tiến hành
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery & Customer Info */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Chi tiết giao nhận & thanh toán
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Người nhận:</span>
                <strong className="text-slate-800">{order.customerName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                <strong className="text-slate-800">{order.customerPhone}</strong>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
              <strong className="text-slate-800">{order.customerAddress}</strong>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
              <span className="text-slate-500">Thanh toán:</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.paymentStatus === 'PAID' ? 'Đã thanh toán (VietQR)' : 'Chưa thanh toán (Thu tiền khi nhận)'}
              </span>
            </div>
          </div>

          {/* Order Items Summary */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Sản phẩm trong đơn ({order.items.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 truncate">
                    <ProductImage src={item.image} alt={item.productName} className="w-8 h-8 object-cover rounded-lg border border-slate-200" />
                    <span className="truncate text-slate-800 font-medium">{item.productName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">x{item.quantity}</span>
                  </div>
                  <strong className="text-slate-800 ml-2 shrink-0">
                    {formatVND(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-700">Tổng cộng:</span>
              <span className="font-extrabold text-emerald-700 text-base">
                {formatVND(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
