import React, { useState, useEffect, useRef } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Product, Category } from '../types';
import { STORE_CATEGORIES } from '../data/mockData';
import { X, Barcode, Camera, Save, Image as ImageIcon, MapPin, Calendar, Package, Upload, RefreshCw } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  categories?: Category[];
  onSave: (product: Product) => void;
  onOpenScannerForBarcode?: () => void;
  onQuickCreateCategory?: (category: Category) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  categories = STORE_CATEGORIES,
  onSave,
  onOpenScannerForBarcode,
  onQuickCreateCategory,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    barcode: '',
    category: 'instant_food',
    unit: 'Gói',
    costPrice: 5000,
    sellingPrice: 7000,
    stock: 20,
    minStockAlert: 5,
    mfgDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    batchNumber: 'LO-' + Math.floor(1000 + Math.random() * 9000),
    shelfLocation: '',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    description: '',
  });

  const [isAddingQuickCategory, setIsAddingQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Nén ảnh trực tiếp trên trình duyệt (giảm dung lượng xuống <150KB, kích thước chuẩn 600x600)
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsCompressingImg(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Nén WebP hoặc JPEG chất lượng 0.82
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          setFormData((prev) => ({ ...prev, image: compressedBase64 }));
        }
        setIsCompressingImg(false);
      };
      img.onerror = () => setIsCompressingImg(false);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (productToEdit) {
      setFormData(productToEdit);
    } else {
      setFormData({
        name: '',
        brand: '',
        barcode: '893' + Math.floor(1000000000 + Math.random() * 9000000000),
        category: 'instant_food',
        unit: 'Gói',
        costPrice: 5000,
        sellingPrice: 7000,
        stock: 20,
        minStockAlert: 5,
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        batchNumber: 'LO-' + Math.floor(1000 + Math.random() * 9000),
        shelfLocation: '',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
        description: '',
      });
    }
  }, [productToEdit, isOpen]);

  useLockBodyScroll(isOpen);
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.barcode?.trim()) return;

    const newProd: Product = {
      id: productToEdit?.id || 'prod-' + Date.now(),
      name: formData.name.trim(),
      brand: formData.brand?.trim() || 'Tạp hoá',
      barcode: formData.barcode.trim(),
      category: formData.category || 'instant_food',
      unit: formData.unit || 'Gói',
      costPrice: Number(formData.costPrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      stock: Number(formData.stock) || 0,
      minStockAlert: Number(formData.minStockAlert) || 5,
      mfgDate: formData.mfgDate || '',
      expiryDate: formData.expiryDate || '',
      batchNumber: formData.batchNumber || 'LO-01',
      shelfLocation: formData.shelfLocation || '',
      image: formData.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
      description: formData.description || '',
      soldCount: productToEdit?.soldCount || 0,
    };

    onSave(newProd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] sm:h-auto sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              {productToEdit ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới Vào Kho'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs sm:text-xs">
            {/* Row 1: Barcode & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã vạch (Barcode EAN-13) *
                </label>
                <div className="relative flex">
                  <input
                    type="text"
                    required
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm sm:text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="893..."
                  />
                  {onOpenScannerForBarcode && (
                    <button
                      type="button"
                      onClick={onOpenScannerForBarcode}
                      className="absolute right-2 top-2 text-emerald-600 hover:text-emerald-700"
                      title="Quét bằng camera"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Thương hiệu / Nhà sản xuất
                </label>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Acecook, Coca-Cola, Vinamilk..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Product Name */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tên sản phẩm đầy đủ *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Mì Hảo Hảo Tôm Chua Cay 75g"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Row 3: Category & Unit */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">Danh mục</label>
                  {onQuickCreateCategory && !isAddingQuickCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingQuickCategory(true)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                    >
                      + Tạo mới
                    </button>
                  )}
                </div>

                {isAddingQuickCategory ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50/80 p-1.5 rounded-xl border border-emerald-300">
                    <input
                      type="text"
                      value={quickCategoryName}
                      onChange={(e) => setQuickCategoryName(e.target.value)}
                      placeholder="Tên danh mục mới..."
                      className="flex-1 min-w-0 px-2 py-1 bg-white border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = quickCategoryName.trim();
                        if (!trimmed) return;
                        const id = trimmed
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;
                        
                        const newCat: Category = {
                          id,
                          name: trimmed,
                          icon: 'Package',
                          color: 'bg-emerald-600',
                          description: `Danh mục ${trimmed}`,
                        };
                        onQuickCreateCategory(newCat);
                        setFormData((prev) => ({ ...prev, category: id }));
                        setQuickCategoryName('');
                        setIsAddingQuickCategory(false);
                      }}
                      className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shrink-0"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuickCategory(false);
                        setQuickCategoryName('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Đơn vị tính</label>
                <input
                  type="text"
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Gói, Lon, Chai, Hộp, Kg..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 4: Pricing & Stock */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Giá vốn (đ)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formData.costPrice || 0}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm sm:text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-800 block mb-1 text-[11px]">Giá bán (đ)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formData.sellingPrice || 0}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm sm:text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Tồn kho</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock || 0}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm sm:text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Báo sắp hết</label>
                <input
                  type="number"
                  min="1"
                  value={formData.minStockAlert || 5}
                  onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm sm:text-xs font-mono font-bold text-amber-700"
                />
              </div>
            </div>

            {/* Row 5: MFG Date & EXP Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <label className="font-bold text-slate-700 block mb-1">
                  Ngày sản xuất (NSX)
                </label>
                <input
                  type="date"
                  value={formData.mfgDate || ''}
                  onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                  className="w-full min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs font-mono"
                />
              </div>

              <div className="min-w-0">
                <label className="font-bold text-rose-700 block mb-1">
                  Hạn sử dụng (HSD) *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full min-w-0 px-2.5 py-1.5 bg-rose-50/50 border border-rose-200 rounded-xl text-sm sm:text-xs font-mono font-bold text-rose-800"
                />
              </div>
            </div>

            {/* Row 6: Product Image (Chụp ảnh trực tiếp / Tải ảnh từ thư viện / Dán link) */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-700 block text-xs">
                  Hình ảnh sản phẩm
                </label>
                {isCompressingImg && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang tối ưu ảnh...
                  </span>
                )}
              </div>

              {/* Hidden file inputs for Camera and File Picker */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
              />

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Preview Thumbnail */}
                <div className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-emerald-300 bg-white shrink-0 shadow-xs flex items-center justify-center">
                  {formData.image ? (
                    <ProductImage
                      src={formData.image}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px] font-bold"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                {/* Action Buttons: Chụp Camera, Tải từ máy, hoặc Dán URL */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp ảnh sản phẩm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={formData.image || ''}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Hoặc dán URL ảnh tại đây: https://..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    💡 Ảnh chụp từ điện thoại sẽ được tự động nén dung lượng trước khi lưu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>{productToEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
