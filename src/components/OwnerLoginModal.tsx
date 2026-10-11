import React, { useState, useEffect } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Lock, ShieldCheck, X, Delete, KeyRound, AlertCircle, Check } from 'lucide-react';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Xác thực PIN ở server. Trả về { ok, error? }. */
  onVerify: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  storeName?: string;
}

const MAX_PIN_LEN = 8;
const MIN_PIN_LEN = 4;

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onVerify,
  storeName = 'Tiệm Tạp Hóa',
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsShaking(false);
      setVerifying(false);
    }
  }, [isOpen]);

  useLockBodyScroll(isOpen);
  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (verifying) return;
    if (pin.length < MAX_PIN_LEN) {
      setPin(pin + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const verifyPin = async () => {
    const codeToTest = pin;
    if (codeToTest.length < MIN_PIN_LEN || verifying) return;
    setVerifying(true);
    try {
      const res = await onVerify(codeToTest);
      if (res.ok) {
        setError(null);
        onSuccess();
      } else {
        setIsShaking(true);
        setError(res.error || 'Mã PIN không đúng. Vui lòng thử lại!');
        setTimeout(() => setIsShaking(false), 500);
        setPin('');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Xác Thực Quản Lý</h3>
              <p className="mt-0.5 text-[10px] text-slate-400 truncate max-w-[200px]">
                {storeName} • Khu vực riêng cho chủ tiệm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h4 className="text-sm font-extrabold text-slate-900 text-center">
            Nhập mã PIN bảo mật
          </h4>
          <p className="text-xs text-slate-500 text-center mt-1 max-w-xs">
            Vui lòng nhập mã PIN quản lý để truy cập doanh thu, nhập xuất kho và đơn hàng.
          </p>

          {/* PIN Indicators (4–8 số) */}
          <div className="flex items-center justify-center gap-2 my-5">
            {Array.from({ length: Math.max(MIN_PIN_LEN, Math.min(pin.length, MAX_PIN_LEN)) }).map((_, index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-8 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                    isFilled
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 scale-105 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {isFilled ? '●' : ''}
                </div>
              );
            })}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="w-full max-w-[240px] grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                disabled={verifying}
                className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200/80 text-base font-extrabold text-slate-800 flex items-center justify-center transition active:scale-95 shadow-2xs disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={verifying}
              className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center transition active:scale-95 disabled:opacity-50"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              disabled={verifying}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200/80 text-base font-extrabold text-slate-800 flex items-center justify-center transition active:scale-95 shadow-2xs disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={verifying}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/80 text-slate-600 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
              aria-label="Xóa 1 số"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={verifyPin}
            disabled={pin.length < MIN_PIN_LEN || verifying}
            className="mt-4 w-full max-w-[240px] h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95"
          >
            {verifying ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {verifying ? 'Đang kiểm tra…' : 'Xác nhận'}
          </button>

          <p className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            Nhập sai 5 lần sẽ bị khoá 15 phút
          </p>
        </div>
      </div>
    </div>
  );
};
