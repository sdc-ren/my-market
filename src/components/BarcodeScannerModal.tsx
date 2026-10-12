import React, { useState, useEffect, useRef } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../types';
import { playDingSound } from '../utils/storage';
import { formatVND } from '../utils/vietqr';
import { X, Camera, SwitchCamera, Upload, Search, CheckCircle2, AlertTriangle, Barcode, Plus, Minus, ArrowRight } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  actionType: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE';
  onBarcodeScanned: (scannedBarcode: string, actionType: 'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE', quantity?: number, note?: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  actionType: initialActionType,
  onBarcodeScanned,
}) => {
  const [currentAction, setCurrentAction] = useState<'LOOKUP' | 'STOCK_IN' | 'STOCK_OUT' | 'SALE'>(initialActionType);
  const [manualCode, setManualCode] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerSuccessMsg, setScannerSuccessMsg] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-reader-viewport';
  // Chống camera bắn callback nhiều lần cho cùng 1 mã
  const scanHandledRef = useRef(false);
  // Ref giữ giá trị mới nhất (tránh stale closure vì callback camera đăng ký 1 lần lúc mở)
  const quantityRef = useRef(quantity);
  const noteRef = useRef(note);
  const actionRef = useRef(currentAction);
  useEffect(() => {
    quantityRef.current = quantity;
    noteRef.current = note;
    actionRef.current = currentAction;
  });

  useLockBodyScroll(isOpen);

  useEffect(() => {
    setCurrentAction(initialActionType);
  }, [initialActionType]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMatchedProduct(null);
      setManualCode('');
      setScannerSuccessMsg(null);
      scanHandledRef.current = false;
      return;
    }

    // Auto-start camera when modal opens
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleBarcodeDetected = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode || scanHandledRef.current) return;
    scanHandledRef.current = true;
    playDingSound('beep');
    // Quét xong thực hiện ngay + đóng dialog, khỏi chờ bấm Xác nhận
    // (dùng ref để lấy đúng số lượng/ghi chú mới nhất)
    onBarcodeScanned(cleanCode, actionRef.current, quantityRef.current, noteRef.current);
    onClose();
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          // ITF (Interleaved 2 of 5): mã vạch thùng carton 14 số, rất phổ biến khi nhập hàng tạp hoá
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsCameraActive(false);
      setCameraError('Không thể mở camera hoặc chưa cấp quyền. Bạn có thể gõ mã hoặc chọn mã mẫu bên dưới.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Stop camera error:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleManualSearch = (codeToSearch?: string) => {
    const targetCode = (codeToSearch || manualCode).trim();
    if (!targetCode) return;
    const found = products.find((p) => p.barcode === targetCode || p.name.toLowerCase().includes(targetCode.toLowerCase()));
    if (found) {
      playDingSound('beep');
      setMatchedProduct(found);
      setManualCode(found.barcode);
      setScannerSuccessMsg(`Đã tìm thấy: ${found.name}`);
    } else {
      setMatchedProduct(null);
      setScannerSuccessMsg(`Mã: ${targetCode} không khớp với sản phẩm nào`);
    }
  };

  const handleConfirmAction = () => {
    if (!manualCode.trim()) return;
    onBarcodeScanned(manualCode.trim(), currentAction, quantity, note);
    playDingSound('alert');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Quét Mã Vạch Thông Minh</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Nhận diện EAN-13, QR Code bao bì</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Type Tabs */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setCurrentAction('LOOKUP')}
            className={`py-1.5 rounded-lg transition text-center ${
              currentAction === 'LOOKUP'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tra cứu
          </button>
          <button
            onClick={() => setCurrentAction('STOCK_IN')}
            className={`py-1.5 rounded-lg transition text-center ${
              currentAction === 'STOCK_IN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Nhập kho
          </button>
          <button
            onClick={() => setCurrentAction('STOCK_OUT')}
            className={`py-1.5 rounded-lg transition text-center ${
              currentAction === 'STOCK_OUT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            - Xuất kho
          </button>
          <button
            onClick={() => setCurrentAction('SALE')}
            className={`py-1.5 rounded-lg transition text-center ${
              currentAction === 'SALE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bán hàng
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Scanner Viewport Box */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800">
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-xl relative">
                {/* Laser scan animation line */}
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse top-1/2" />
                <div className="absolute top-1 left-2 text-[10px] text-emerald-300 font-mono tracking-wider">
                  ĐẶT MÃ VẠCH VÀO KHUNG
                </div>
              </div>
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs text-slate-300 mb-3">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  Thử lại camera
                </button>
              </div>
            )}
          </div>

          {/* Scanned status feedback */}
          {scannerSuccessMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{scannerSuccessMsg}</span>
            </div>
          )}

          {/* Manual Barcode Input & Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="manual-barcode-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                placeholder="Nhập mã vạch hoặc tên..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <button
              onClick={() => handleManualSearch()}
              className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm</span>
            </button>
          </div>

          {/* Quick-Test Sample Barcodes in Store */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Mã vạch mẫu có sẵn để thử nghiệm:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    handleBarcodeDetected(p.barcode);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium transition text-left"
                >
                  <span className="font-bold">{p.name.split(' ')[0]} {p.name.split(' ')[1]}</span>: <span className="font-mono text-slate-500">{p.barcode.slice(-4)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Matched Product Details Card */}
          {matchedProduct && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-3">
                <ProductImage
                  src={matchedProduct.image}
                  alt={matchedProduct.name}
                  className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {matchedProduct.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kho: <strong className="text-emerald-700">{matchedProduct.stock} {matchedProduct.unit}</strong> | Kệ: {matchedProduct.shelfLocation}
                  </p>
                  <p className="text-xs font-bold text-emerald-700">
                    {formatVND(matchedProduct.sellingPrice)}
                  </p>
                </div>
              </div>

              {/* Quantity Selector for Stock In / Out / Sale */}
              {currentAction !== 'LOOKUP' && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    {currentAction === 'STOCK_IN' ? 'Số lượng nhập:' : currentAction === 'STOCK_OUT' ? 'Số lượng xuất:' : 'Số lượng bán:'}
                  </span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Note input for Stock In / Stock Out */}
              {(currentAction === 'STOCK_IN' || currentAction === 'STOCK_OUT') && (
                <input
                  type="text"
                  placeholder="Ghi chú (nhà cung cấp, lý do xuất...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Đóng
          </button>
          {matchedProduct && currentAction !== 'LOOKUP' && (
            <button
              id="btn-confirm-barcode-action"
              onClick={handleConfirmAction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
            >
              <span>Xác nhận thao tác</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
