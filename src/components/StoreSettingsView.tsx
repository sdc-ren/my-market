import React, { useState, useRef } from 'react';
import { StoreSettings, BusinessHour } from '../types';
import {
  Store,
  Phone,
  MapPin,
  QrCode,
  Bell,
  Lock,
  Save,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';

interface StoreSettingsViewProps {
  settings: StoreSettings;
  onSave: (s: StoreSettings) => Promise<boolean>;
}

const inputCls =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1.5';

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [savedTick, setSavedTick] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof StoreSettings, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setSavedTick(false);
  };

  // Khung giờ mở cửa (nhiều mốc mỗi ngày: sáng/chiều...)
  const hours: BusinessHour[] = form.businessHours ?? [];
  const updateHour = (idx: number, patch: Partial<BusinessHour>) => {
    const next = hours.map((h, i) => (i === idx ? { ...h, ...patch } : h));
    setForm((prev) => ({ ...prev, businessHours: next }));
    setSavedTick(false);
  };
  const addHour = () => {
    setForm((prev) => ({
      ...prev,
      businessHours: [...(prev.businessHours ?? []), { label: '', open: '06:00', close: '22:00' }],
    }));
  };
  const removeHour = (idx: number) => {
    setForm((prev) => ({ ...prev, businessHours: (prev.businessHours ?? []).filter((_, i) => i !== idx) }));
  };

  // Upload logo từ máy: tự resize về tối đa 256px rồi lưu dạng data URI (không cần host ảnh ngoài)
  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        set('logoUrl', canvas.toDataURL('image/png'));
        setLogoError(false);
      };
      img.onerror = () => setLogoError(true);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    const ok = await onSave({ ...form, storeName: form.storeName.trim() || settings.storeName });
    setSaving(false);
    if (ok) {
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2500);
    } else {
      // Server không nhận: báo rõ để user thử lại, tránh tưởng đã lưu.
      setSaveError(true);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Cấu hình cửa hàng</h2>
          <p className="text-xs text-slate-500">
            Tên, logo và các thông tin hiển thị trên website & mã VietQR.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {saveError && (
            <p className="text-[11px] font-semibold text-red-600">
              Không lưu được lên server — kiểm tra mạng rồi bấm Lưu lại.
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60"
          >
            {savedTick ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Đang lưu...' : savedTick ? 'Đã lưu!' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      {/* 1. Thương hiệu */}
      <Section
        icon={<Store className="w-4 h-4" />}
        title="Thương hiệu"
        desc="Tên và logo hiển thị trên thanh điều hướng website."
      >
        <div className="sm:col-span-2">
          <label className={labelCls}>Tên cửa hàng</label>
          <input
            className={inputCls}
            value={form.storeName}
            onChange={(e) => set('storeName', e.target.value)}
            placeholder="VD: Tạp Hoá Bảy Thảo (Gia Đình)"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Logo cửa hàng</label>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Preview */}
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl && !logoError ? (
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9`}
                  value={form.logoUrl?.startsWith('data:') ? '' : form.logoUrl || ''}
                  onChange={(e) => {
                    set('logoUrl', e.target.value);
                    setLogoError(false);
                  }}
                  placeholder="Dán link ảnh logo (https://...)"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải ảnh từ máy
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      set('logoUrl', '');
                      setLogoError(false);
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Xóa logo
                  </button>
                )}
              </div>
              {logoError && (
                <p className="text-[11px] text-rose-600">Không tải được ảnh logo, kiểm tra lại link.</p>
              )}
              <p className="text-[11px] text-slate-400">
                Ảnh tải từ máy sẽ tự thu nhỏ về 256px. Để trống sẽ dùng icon mặc định.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 2. Liên hệ */}
      <Section
        icon={<Phone className="w-4 h-4" />}
        title="Thông tin liên hệ"
        desc="Hiển thị cho khách hàng trên website."
      >
        <div>
          <label className={labelCls}>Số điện thoại / Hotline</label>
          <input
            className={inputCls}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="VD: 0987 654 321"
          />
        </div>
        <div>
          <label className={labelCls}>Địa chỉ cửa hàng</label>
          <input
            className={inputCls}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="VD: 142 Nguyễn Trãi, Quận 5, TP.HCM"
          />
        </div>
      </Section>

      {/* 3. Giờ mở cửa */}
      <Section
        icon={<Clock className="w-4 h-4" />}
        title="Giờ mở cửa"
        desc="Các khung giờ bán trong ngày, hiển thị trên thanh header website."
      >
        <div className="sm:col-span-2 space-y-2">
          {hours.length === 0 && (
            <p className="text-xs text-slate-400">Chưa có khung giờ nào — bấm "Thêm khung giờ" để tạo.</p>
          )}
          {hours.map((h, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="flex-1 min-w-28">
                <label className={labelCls}>Tên khung</label>
                <input
                  className={inputCls}
                  value={h.label}
                  onChange={(e) => updateHour(idx, { label: e.target.value })}
                  placeholder="VD: Buổi sáng"
                />
              </div>
              <div>
                <label className={labelCls}>Mở cửa</label>
                <input
                  type="time"
                  className={inputCls}
                  value={h.open}
                  onChange={(e) => updateHour(idx, { open: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Đóng cửa</label>
                <input
                  type="time"
                  className={inputCls}
                  value={h.close}
                  onChange={(e) => updateHour(idx, { close: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeHour(idx)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Xóa khung giờ này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addHour}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm khung giờ
          </button>
        </div>
      </Section>

      {/* 4. VietQR */}
      <Section
        icon={<QrCode className="w-4 h-4" />}
        title="Thanh toán VietQR"
        desc="Thông tin tài khoản dùng để tạo mã QR thanh toán."
      >
        <div>
          <label className={labelCls}>Mã ngân hàng</label>
          <input
            className={inputCls}
            value={form.bankId}
            onChange={(e) => set('bankId', e.target.value.toUpperCase())}
            placeholder="VD: MB, VCB, TCB"
          />
        </div>
        <div>
          <label className={labelCls}>Số tài khoản</label>
          <input
            className={inputCls}
            value={form.bankAccount}
            onChange={(e) => set('bankAccount', e.target.value)}
            placeholder="VD: 0987654321"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tên chủ tài khoản (viết hoa không dấu)</label>
          <input
            className={inputCls}
            value={form.bankAccountName}
            onChange={(e) => set('bankAccountName', e.target.value)}
            placeholder="VD: NGUYEN VAN THAO"
          />
        </div>
      </Section>

      {/* 5. Cảnh báo kho */}
      <Section
        icon={<Bell className="w-4 h-4" />}
        title="Cảnh báo kho & hạn dùng"
        desc="Ngưỡng để hệ thống gắn cờ sắp hết hàng / cận date."
      >
        <div>
          <label className={labelCls}>Ngưỡng tồn kho thấp (sản phẩm)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.lowStockThreshold}
            onChange={(e) => set('lowStockThreshold', Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div>
          <label className={labelCls}>Cảnh báo HSD trước (ngày)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.expiryWarningDays}
            onChange={(e) => set('expiryWarningDays', Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </Section>

      {/* 6. Bảo mật */}
      <Section
        icon={<Lock className="w-4 h-4" />}
        title="Bảo mật quản lý"
        desc="Mã PIN để mở khu vực quản lý."
      >
        <div>
          <label className={labelCls}>Mã PIN quản lý (4–8 ký tự)</label>
          <input
            className={inputCls}
            value={form.ownerPin || ''}
            onChange={(e) => set('ownerPin', e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="VD: 1234"
            inputMode="numeric"
          />
        </div>
        <div className="flex items-end">
          <p className="text-[11px] text-slate-400 pb-2">
            Đổi PIN xong nhớ bấm <strong className="text-slate-600">Lưu cấu hình</strong> ở trên.
          </p>
        </div>
      </Section>

      {/* Địa chỉ icon */}
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <MapPin className="w-3.5 h-3.5" />
        Mọi thay đổi được lưu vào database và áp dụng ngay trên website.
      </p>
    </div>
  );
};
