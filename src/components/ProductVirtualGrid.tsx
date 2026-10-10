import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Category } from '../types';
import { ProductCard } from './ProductCard';
import { CategoryFilterDropdown } from './CategoryFilterDropdown';
import { STORE_CATEGORIES } from '../data/mockData';
import { getExpiryStatus } from '../utils/vietqr';
import {
  PackageOpen,
  Sparkles,
  ArrowUpDown,
  X,
  Store,
  CupSoda,
  Soup,
  Cookie,
  Milk,
  Flame,
  PackageCheck,
  Coffee,
  Apple,
  Wine,
  Fish,
  Tag,
  ShoppingBag,
  Boxes,
  Heart,
  Layers,
  Check
} from 'lucide-react';

interface ProductVirtualGridProps {
  products: Product[];
  mode: 'customer' | 'owner';
  categories?: Category[];
  cartItems?: { [productId: string]: number };
  onAddToCart?: (product: Product) => void;
  onUpdateCartQuantity?: (product: Product, delta: number) => void;
  onQuickStockAction?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  searchQuery?: string;
  selectedCategories?: string[];
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  onToggleCategory?: (categoryId: string) => void;
  onClearCategories?: () => void;
  onSelectOnlyCategory?: (categoryId: string) => void;
}

export const ProductVirtualGrid: React.FC<ProductVirtualGridProps> = ({
  products,
  mode,
  categories = STORE_CATEGORIES,
  cartItems = {},
  onAddToCart,
  onUpdateCartQuantity,
  onQuickStockAction,
  onViewDetails,
  searchQuery = '',
  selectedCategories,
  selectedCategory = 'all',
  onSelectCategory,
  onToggleCategory,
  onClearCategories,
  onSelectOnlyCategory,
}) => {
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'expiry_soon' | 'stock_low'>('default');
  
  // Normalize multi-select categories
  const activeSelectedList = useMemo(() => {
    if (selectedCategories && selectedCategories.length > 0) {
      return selectedCategories;
    }
    if (selectedCategory) {
      return [selectedCategory];
    }
    return ['all'];
  }, [selectedCategories, selectedCategory]);

  const isAllSelected = useMemo(() => {
    return activeSelectedList.length === 0 || activeSelectedList.includes('all');
  }, [activeSelectedList]);

  // Virtual batching state: start with first batch, load more as user scrolls down
  const [visibleCount, setVisibleCount] = useState<number>(24);
  const bottomObserverRef = useRef<HTMLDivElement | null>(null);

  // Trang bán hàng (customer) KHÔNG BAO GIỜ liệt kê hàng hết HSD hoặc cận date:
  // hiện nhãn "Hết HSD / Cận date" trên page bán hàng sẽ khiến khách nghĩ
  // shop bán hàng hết date. Chủ shop vẫn thấy đầy đủ trong dashboard để xử lý.
  const sellableProducts = useMemo(() => {
    if (mode !== 'customer') return products;
    return products.filter((p) => {
      const s = getExpiryStatus(p.expiryDate).status;
      return s !== 'EXPIRED' && s !== 'CRITICAL';
    });
  }, [products, mode]);

  // Compute product count per category (theo những gì mode hiện tại được thấy)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: sellableProducts.length,
    };
    sellableProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [sellableProducts]);

  // Selected category objects for chips & badges
  const activeSelectedCategoryObjects = useMemo(() => {
    if (isAllSelected) return [];
    return categories.filter((c) => activeSelectedList.includes(c.id));
  }, [isAllSelected, activeSelectedList, categories]);

  // Handlers for category actions
  const handleToggle = (catId: string) => {
    if (onToggleCategory) {
      onToggleCategory(catId);
    } else if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const handleClearAll = () => {
    if (onClearCategories) {
      onClearCategories();
    } else if (onSelectCategory) {
      onSelectCategory('all');
    }
  };

  const handleOnlyCategory = (catId: string) => {
    if (onSelectOnlyCategory) {
      onSelectOnlyCategory(catId);
    } else if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  // Category Icon helper
  const renderCategoryIcon = (iconName: string, classNameStr: string = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'CupSoda':
        return <CupSoda className={classNameStr} />;
      case 'Soup':
        return <Soup className={classNameStr} />;
      case 'Cookie':
        return <Cookie className={classNameStr} />;
      case 'Milk':
        return <Milk className={classNameStr} />;
      case 'Flame':
        return <Flame className={classNameStr} />;
      case 'Sparkles':
        return <Sparkles className={classNameStr} />;
      case 'PackageCheck':
        return <PackageCheck className={classNameStr} />;
      case 'Coffee':
        return <Coffee className={classNameStr} />;
      case 'Apple':
        return <Apple className={classNameStr} />;
      case 'Wine':
        return <Wine className={classNameStr} />;
      case 'Fish':
        return <Fish className={classNameStr} />;
      case 'Tag':
        return <Tag className={classNameStr} />;
      case 'ShoppingBag':
        return <ShoppingBag className={classNameStr} />;
      case 'Boxes':
        return <Boxes className={classNameStr} />;
      case 'Heart':
        return <Heart className={classNameStr} />;
      case 'Layers':
        return <Layers className={classNameStr} />;
      case 'Store':
      default:
        return <Store className={classNameStr} />;
    }
  };

  // Filter & Sort (trên nền sản phẩm được phép bán ở mode hiện tại)
  const filteredProducts = useMemo(() => {
    let list = [...sellableProducts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.shelfLocation?.toLowerCase().includes(q)
      );
    }

    // Category Multi-Filter
    if (!isAllSelected) {
      list = list.filter((p) => activeSelectedList.includes(p.category));
    }

    // Sorting
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortBy === 'expiry_soon') {
      list.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } else if (sortBy === 'stock_low') {
      list.sort((a, b) => a.stock - b.stock);
    } else {
      // Default: High soldCount or default order
      list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    }

    return list;
  }, [sellableProducts, searchQuery, isAllSelected, activeSelectedList, sortBy]);

  // Reset visible count when search or category changes
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, activeSelectedList, sortBy]);

  // Virtual batch scroll intersection observer (prevents app cracking on mobile with heavy images)
  useEffect(() => {
    if (!bottomObserverRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 16, filteredProducts.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(bottomObserverRef.current);
    return () => observer.disconnect();
  }, [filteredProducts.length]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  return (
    <div className="w-full flex flex-col">
      {/* Grid Controls Header (Modern 2-Tier responsive layout, full width) */}
      <div className="w-full bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2 sm:gap-2.5">
          {/* TIER 1: Category Filter Navigation Strip */}
          {(onSelectCategory || onToggleCategory) && (
            <div className="w-full">
              {/* Mobile (< sm): Smart single-button dropdown that opens thumb-friendly Bottom Sheet */}
              <div className="sm:hidden w-full">
                <CategoryFilterDropdown
                  selectedCategories={activeSelectedList}
                  onToggleCategory={handleToggle}
                  onClearCategories={handleClearAll}
                  onSelectOnlyCategory={handleOnlyCategory}
                  products={sellableProducts}
                  categories={categories}
                  className="w-full"
                />
              </div>

              {/* Tablet & Desktop (sm+): Dedicated Category Ribbon that wraps naturally with ZERO horizontal scroll */}
              <div className="hidden sm:flex items-center flex-wrap gap-1.5">
                {/* All products button */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                    isAllSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                  }`}
                  title="Xem toàn bộ sản phẩm"
                >
                  <span className={`${isAllSelected ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    <Store className="w-3.5 h-3.5" />
                  </span>
                  <span>Tất cả</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isAllSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {sellableProducts.length}
                  </span>
                </button>

                {/* Specific category buttons - Click to toggle in/out of multi-selection */}
                {categories
                  .filter((cat) => cat.id !== 'all')
                  .map((cat) => {
                    const isCatSelected = !isAllSelected && activeSelectedList.includes(cat.id);
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggle(cat.id)}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border select-none ${
                          isCatSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                        }`}
                        title={isCatSelected ? `Bỏ chọn ${cat.name}` : `Thêm ${cat.name} vào bộ lọc`}
                      >
                        <span className={`${isCatSelected ? 'text-emerald-200' : 'text-slate-500 group-hover:text-slate-700'}`}>
                          {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5')}
                        </span>
                        <span>{cat.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
                            isCatSelected
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          {isCatSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          {count}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TIER 2: Status & Tool Controls Bar (Guaranteed never to wrap unexpectedly) */}
          <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
            {/* Left: Product count & active category indicator */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-medium text-slate-600 shrink-0">
                Hiển thị <strong className="text-slate-900">{filteredProducts.length}</strong> sản phẩm
              </span>

              {/* Multi-category filter badges / chips */}
              {!isAllSelected && activeSelectedCategoryObjects.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  <span className="text-slate-400 font-medium text-[11px] hidden xs:inline">Lọc:</span>
                  {activeSelectedCategoryObjects.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggle(cat.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium hover:bg-emerald-100 transition truncate group text-[11px]"
                      title={`Bấm để bỏ lọc danh mục ${cat.name}`}
                    >
                      <span className="truncate max-w-[120px]">{cat.name}</span>
                      <X className="w-3 h-3 text-emerald-700 group-hover:text-rose-600 shrink-0" />
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold ml-1 px-1 py-0.5"
                    title="Bỏ toàn bộ lọc danh mục"
                  >
                    Xóa hết ({activeSelectedCategoryObjects.length})
                  </button>
                </div>
              )}
            </div>

            {/* Right: Sort Selector */}
            <div className="flex items-center gap-1.5 text-slate-500 shrink-0 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden xs:inline" />
              <select
                id="sort-products-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                <option value="default">Phổ biến nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="expiry_soon">HSD gần nhất</option>
                <option value="stock_low">Tồn kho ít nhất</option>
              </select>
            </div>
          </div>

          {/* Search query feedback banner */}
          {searchQuery && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Kết quả tìm kiếm cho: <strong>&quot;{searchQuery}&quot;</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Virtual Grid Container (full width, balanced padding) */}
      <div className="w-full px-3 sm:px-6 py-4 sm:py-5 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Thử tìm kiếm với từ khóa khác hoặc bấm nút bỏ lọc danh mục.
            </p>
            {!isAllSelected && (
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
              >
                Xem tất cả sản phẩm
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Responsive grid (card width kept in the ~220-280px sweet spot):
                - On smartphone (mobile): 1 column (horizontal cards)
                - sm (640px+): 2 columns
                - md (768px+): 3 columns
                - lg (1024px+): 4 columns
                - xl (1280px+): 5 columns
                - 2xl (1536px+): 6 columns
                - min-[1900px]: 7 columns
                - min-[2300px]: 8 columns
            */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1900px]:grid-cols-7 min-[2300px]:grid-cols-8 gap-3 sm:gap-4">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  mode={mode}
                  layoutMode="single"
                  cartQuantity={cartItems[product.id] || 0}
                  onAddToCart={onAddToCart}
                  onUpdateCartQuantity={onUpdateCartQuantity}
                  onQuickStockAction={onQuickStockAction}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>

            {/* Virtual Scroll trigger node */}
            {visibleCount < filteredProducts.length && (
              <div
                ref={bottomObserverRef}
                className="w-full py-8 flex flex-col items-center justify-center text-xs text-slate-400"
              >
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span>Đang tải thêm sản phẩm mượt mà... ({visibleCount}/{filteredProducts.length})</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
