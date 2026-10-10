import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Order, StoreSettings } from '../types';
import { formatVND, getVietQRUrl } from '../utils/vietqr';
import { playDingSound } from '../utils/storage';
import { X, Copy, Check, QrCode, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

interface VietQRModalProps {
  isOpen: boolean;
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onMarkPaid: (orderId: string) => void;
  onViewOrderTracking: (order: Order) => void;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({
  isOpen,
  order,
  settings,
  onClose,
  onMarkPaid,
  onViewOrderTracking,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaidLocal, setIsPaidLocal] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const qrUrl = getVietQRUrl(
    settings.bankId,
    settings.bankAccount,
    settings.bankAccountName,
    order.totalAmount,
    order.code,
    settings.qrTemplate
  );

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    playDingSound('beep');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPaid = () => {
    setIsPaidLocal(true);
    playDingSound('order');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    onMarkPaid(order.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm">Thanh Toán VietQR Tự Động</h3>
              <p className="mt-0.5 text-[11px] text-emerald-100">Đơn hàng: {order.code}</p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-center">
          {/* QR Image Container */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner mx-auto">
            <img
              src={qrUrl}
              alt="Mã VietQR"
              className="w-56 h-auto mx-auto rounded-xl shadow-xs"
              loading="eager"
            />
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Mở app ngân hàng bất kỳ (VCB, MB, Techcom, MoMo...) quét mã
            </p>
          </div>

          {/* Amount to pay */}
          <div>
            <span className="text-xs text-slate-500 font-medium">Số tiền cần thanh toán:</span>
            <div className="text-2xl font-black text-emerald-700">
              {formatVND(order.totalAmount)}
            </div>
          </div>

          {/* Copyable Transfer Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-slate-500">Ngân hàng:</span>
              <strong className="text-slate-800">{settings.bankId} ({settings.bankAccountName})</strong>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-slate-500">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <strong className="text-slate-900 font-mono text-sm">{settings.bankAccount}</strong>
                <button
                  onClick={() => copyToClipboard(settings.bankAccount, 'account')}
                  className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100"
                  title="Sao chép"
                >
                  {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Nội dung CK:</span>
              <div className="flex items-center gap-1.5">
                <strong className="text-emerald-700 font-mono text-sm bg-emerald-50 px-1.5 py-0.5 rounded">
                  {order.code}
                </strong>
                <button
                  onClick={() => copyToClipboard(order.code, 'code')}
                  className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100"
                  title="Sao chép"
                >
                  {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Order status indication */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Hệ thống đang kết nối trạng thái đơn hàng thời gian thực</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          {!isPaidLocal && order.paymentStatus !== 'PAID' ? (
            <button
              id="btn-confirm-vietqr-paid"
              onClick={handleConfirmPaid}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition shadow-md flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Tôi đã chuyển tiền thành công</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Đã ghi nhận chuyển khoản thành công!</span>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              onViewOrderTracking(order);
            }}
            className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
          >
            <span>Theo dõi trạng thái đơn hàng</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
