import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, Category } from '../types';
import { STORE_CATEGORIES } from '../data/mockData';
import {
  Store,
  CupSoda,
  Soup,
  Cookie,
  Milk,
  Flame,
  Sparkles,
  PackageCheck,
  Package,
  ChevronDown,
  Check,
  X,
  Filter,
  Layers,
  Search,
  Coffee,
  Apple,
  Wine,
  Fish,
  Tag,
  ShoppingBag,
  Boxes,
  Heart
} from 'lucide-react';

interface CategoryFilterDropdownProps {
  selectedCategories?: string[];
  selectedCategory?: string;
  onToggleCategory?: (categoryId: string) => void;
  onSelectCategory?: (categoryId: string) => void;
  onSelectOnlyCategory?: (categoryId: string) => void;
  onClearCategories?: () => void;
  products: Product[];
  categories?: Category[];
  className?: string;
}

export const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  selectedCategories,
  selectedCategory,
  onToggleCategory,
  onSelectCategory,
  onSelectOnlyCategory,
  onClearCategories,
  products,
  categories = STORE_CATEGORIES,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize selected categories into an array
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

  // Compute product count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
    };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Current active categories objects
  const activeCategoryObjects = useMemo(() => {
    if (isAllSelected) {
      return [categories.find((c) => c.id === 'all') || categories[0] || STORE_CATEGORIES[0]];
    }
    return categories.filter((c) => activeSelectedList.includes(c.id));
  }, [isAllSelected, activeSelectedList, categories]);

  // Total products matching current filter
  const totalFilteredCount = useMemo(() => {
    if (isAllSelected) return products.length;
    return products.filter((p) => activeSelectedList.includes(p.category)).length;
  }, [isAllSelected, activeSelectedList, products]);

  // Handle category toggle
  const handleItemToggle = (catId: string) => {
    if (onToggleCategory) {
      onToggleCategory(catId);
    } else if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const handleOnly = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (onSelectOnlyCategory) {
      onSelectOnlyCategory(catId);
    } else if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  const handleResetAll = () => {
    if (onClearCategories) {
      onClearCategories();
    } else if (onSelectCategory) {
      onSelectCategory('all');
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Icon renderer helper
  const renderCategoryIcon = (iconName: string, classNameStr: string = 'w-4 h-4') => {
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

  // Filtered categories in case of search
  const visibleCategories = useMemo(() => {
    if (!filterSearch.trim()) return categories;
    const q = filterSearch.toLowerCase().trim();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(q)
    );
  }, [filterSearch, categories]);

  const handleSelect = (catId: string) => {
    onSelectCategory(catId);
    setIsOpen(false);
    setFilterSearch('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          id="btn-category-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 border ${
            !isAllSelected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
          title="Lọc sản phẩm theo nhiều danh mục"
        >
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0 ${
              !isAllSelected
                ? activeCategoryObjects[0]?.color || 'bg-emerald-600'
                : 'bg-slate-700'
            }`}
          >
            {!isAllSelected ? (
              activeCategoryObjects.length > 1 ? (
                <Layers className="w-3 h-3" />
              ) : (
                renderCategoryIcon(activeCategoryObjects[0]?.icon || 'Package', 'w-3 h-3')
              )
            ) : (
              <Store className="w-3 h-3" />
            )}
          </div>

          <span className="truncate max-w-[130px] sm:max-w-[180px]">
            {isAllSelected
              ? 'Tất cả danh mục'
              : activeCategoryObjects.length === 1
              ? activeCategoryObjects[0].name
              : `${activeSelectedList.length} danh mục đã chọn`}
          </span>

          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              !isAllSelected
                ? 'bg-emerald-200/80 text-emerald-900'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {totalFilteredCount}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </button>

        {/* Quick clear button if any filter is active */}
        {!isAllSelected && (
          <button
            type="button"
            id="btn-clear-category-filter"
            onClick={handleResetAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
            title="Bỏ lọc danh mục (Về tất cả)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* DROPDOWN POPOVER FOR DESKTOP / TABLET / BOTTOM SHEET ON MOBILE */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 z-50 sm:hidden backdrop-blur-2xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Container */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 w-full sm:w-80 md:w-88 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[460px] animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-2 duration-150"
          >
            {/* Header */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Lọc Nhiều Danh Mục
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Tích chọn 1 hoặc nhiều danh mục cùng lúc
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isAllSelected && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-semibold"
                  >
                    Bỏ chọn hết
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search */}
            {categories.length > 5 && (
              <div className="px-3 pt-2 pb-1 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Tìm nhanh danh mục..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Category Multi-select List */}
            <div className="p-1.5 sm:p-2 overflow-y-auto divide-y divide-slate-50 flex-1">
              {/* "Tất cả sản phẩm" option */}
              <button
                type="button"
                onClick={handleResetAll}
                className={`w-full flex items-center justify-between px-3 py-2 sm:py-2 rounded-xl text-left transition group ${
                  isAllSelected
                    ? 'bg-slate-900 text-white font-bold'
                    : 'hover:bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      isAllSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-2xs">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs truncate">Tất cả sản phẩm</span>
                </div>

                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                    isAllSelected
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {products.length} món
                </span>
              </button>

              {/* Specific Categories */}
              {visibleCategories
                .filter((c) => c.id !== 'all')
                .map((category) => {
                  const isChecked = !isAllSelected && activeSelectedList.includes(category.id);
                  const count = categoryCounts[category.id] ?? 0;

                  return (
                    <div
                      key={category.id}
                      onClick={() => handleItemToggle(category.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 sm:py-2 rounded-xl text-left transition cursor-pointer group select-none ${
                        isChecked
                          ? 'bg-emerald-50/80 text-emerald-950 font-bold border border-emerald-200/80'
                          : 'hover:bg-slate-50 text-slate-700 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white group-hover:border-emerald-400'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Category Icon Badge */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs ${category.color}`}
                        >
                          {renderCategoryIcon(category.icon, 'w-3.5 h-3.5')}
                        </div>

                        {/* Category Name */}
                        <span className="text-xs truncate">{category.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Quick "Only" button */}
                        <button
                          type="button"
                          onClick={(e) => handleOnly(e, category.id)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition"
                          title="Chỉ chọn riêng danh mục này"
                        >
                          Chỉ mục này
                        </button>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                            isChecked
                              ? 'bg-emerald-200 text-emerald-900 font-bold'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {visibleCategories.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  Không tìm thấy danh mục phù hợp
                </div>
              )}
            </div>

            {/* Footer Summary & Done Button */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600 font-medium truncate">
                {!isAllSelected ? (
                  <>
                    Đã chọn <strong className="text-emerald-700">{activeSelectedList.length}</strong> danh mục (
                    <strong className="text-slate-900">{totalFilteredCount}</strong> món)
                  </>
                ) : (
                  <span>Hiển thị tất cả ({products.length} món)</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 shrink-0"
              >
                Xong
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
