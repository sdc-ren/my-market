import React from 'react';
import { AppNotification } from '../types';
import { formatDate } from '../utils/vietqr';
import { X, Bell, AlertTriangle, Package, CheckCheck, Clock, ShoppingBag } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-slideLeft">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Thông Báo Hệ Thống</h3>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                {notifications.filter((n) => !n.read).length} mới
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            {notifications.length} thông báo
          </span>
          <button
            onClick={onMarkAllAsRead}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-[11px]"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đã đọc tất cả</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs text-center p-4">
              <Bell className="w-8 h-8 mb-2 text-slate-300" />
              <span>Chưa có thông báo nào</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    onSelectNotification?.(notif);
                  }}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    isUnread
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {notif.type === 'EXPIRY_ALERT' ? (
                        <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : notif.type === 'STOCK_LOW' ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs truncate ${
                            isUnread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatDate(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
