import React from 'react';
import { AppNotification } from '../types';
import { ShoppingBag, AlertTriangle, Package, X, ArrowRight } from 'lucide-react';

interface RealtimeToastProps {
  toast: AppNotification | null;
  onClose: () => void;
  onClickToast?: (toast: AppNotification) => void;
}

export const RealtimeToast: React.FC<RealtimeToastProps> = ({
  toast,
  onClose,
  onClickToast,
}) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[92vw] sm:w-80 bg-slate-950 text-white rounded-2xl shadow-2xl p-3.5 border border-emerald-500/40 animate-slideUp">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          {toast.type === 'ORDER_NEW' ? (
            <ShoppingBag className="w-4 h-4" />
          ) : toast.type === 'EXPIRY_ALERT' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <Package className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white truncate">{toast.title}</h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {toast.message}
          </p>

          {onClickToast && (
            <button
              onClick={() => {
                onClickToast(toast);
                onClose();
              }}
              className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              <span>Xem chi tiết ngay</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
