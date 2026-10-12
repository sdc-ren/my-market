import React, { useState, useMemo, useEffect } from 'react';
import { NumberInput } from './ui/NumberInput';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Debtor, DebtTransaction, DebtTransactionItem, Product, StoreSettings } from '../types';
import { formatVND } from '../utils/vietqr';
import {
  createNewDebtor,
  recordDebtToDebtor,
  recordPaymentFromDebtor,
  deleteDebtor,
} from '../utils/storage';
import { apiClient } from '../utils/apiClient';
import {
  UserPlus,
  Receipt,
  Wallet,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  X,
  Printer,
  Database,
  Coins,
  ShoppingBag,
  ExternalLink,
  Info,
  Check,
  ChevronRight,
} from 'lucide-react';

interface DebtManagementViewProps {
  debtors: Debtor[];
  products: Product[];
  settings: StoreSettings;
  onUpdateDebtors: (updatedDebtors: Debtor[]) => void;
}

export const DebtManagementView: React.FC<DebtManagementViewProps> = ({
  debtors,
  products,
  settings,
  onUpdateDebtors,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'debt_asc' | 'name_asc' | 'date_desc'>('debt_desc');

  // Modals state
  const [isAddDebtorOpen, setIsAddDebtorOpen] = useState(false);
  const [selectedDebtorForDetail, setSelectedDebtorForDetail] = useState<Debtor | null>(null);
  const [selectedDebtorForDebt, setSelectedDebtorForDebt] = useState<Debtor | null>(null);
  const [selectedDebtorForPay, setSelectedDebtorForPay] = useState<Debtor | null>(null);
  const [showDbInfoModal, setShowDbInfoModal] = useState(false);
  useLockBodyScroll(!!(isAddDebtorOpen || selectedDebtorForDebt || selectedDebtorForPay || selectedDebtorForDetail || showDbInfoModal));

  // New Debtor Form state
  const [newDebtorData, setNewDebtorData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    creditLimit: 2000000,
    initialDebt: 0,
    initialDebtNote: '',
  });

  // Record Debt Form state
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [debtNote, setDebtNote] = useState('');
  const [selectedProductItems, setSelectedProductItems] = useState<{
    product: Product;
    quantity: number;
  }[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR' | 'TRANSFER'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');

  // Backend & Database connection status
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  useEffect(() => {
    apiClient.checkHealth().then((res) => {
      setDbConnected(res.databaseConnected);
    });
  }, []);

  // Filtered & Sorted Debtors list
  const filteredDebtors = useMemo(() => {
    let list = [...debtors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.phone && d.phone.includes(q)) ||
          (d.address && d.address.toLowerCase().includes(q)) ||
          (d.note && d.note.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((d) => d.status === statusFilter);
    }

    if (sortBy === 'debt_desc') {
      list.sort((a, b) => b.totalDebt - a.totalDebt);
    } else if (sortBy === 'debt_asc') {
      list.sort((a, b) => a.totalDebt - b.totalDebt);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else if (sortBy === 'date_desc') {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return list;
  }, [debtors, searchQuery, statusFilter, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalDebt = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
    const activeDebtorsCount = debtors.filter((d) => d.totalDebt > 0).length;
    const settledDebtorsCount = debtors.filter((d) => d.totalDebt === 0).length;
    const totalCreditLimit = debtors.reduce((sum, d) => sum + d.creditLimit, 0);

    return {
      totalDebt,
      activeDebtorsCount,
      settledDebtorsCount,
      totalCreditLimit,
    };
  }, [debtors]);

  // Handle Add Debtor Submit
  const handleCreateDebtorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtorData.name.trim()) return;

    const { updatedDebtors } = createNewDebtor(debtors, newDebtorData);
    onUpdateDebtors(updatedDebtors);
    setIsAddDebtorOpen(false);
    setNewDebtorData({
      name: '',
      phone: '',
      address: '',
      note: '',
      creditLimit: 2000000,
      initialDebt: 0,
      initialDebtNote: '',
    });
  };

  // Handle Add Debt to a debtor
  const handleRecordDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtorForDebt) return;

    const itemsTotal = selectedProductItems.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.quantity,
      0
    );
    const finalAmount = itemsTotal > 0 ? itemsTotal : debtAmount;

    if (finalAmount <= 0) return;

    const items: DebtTransactionItem[] = selectedProductItems.map((item) => ({
      id: `ditem-${Date.now()}-${item.product.id}`,
      productId: item.product.id,
      barcode: item.product.barcode,
      productName: item.product.name,
      unit: item.product.unit,
      quantity: item.quantity,
      unitPrice: item.product.sellingPrice,
      totalPrice: item.product.sellingPrice * item.quantity,
    }));

    const updated = recordDebtToDebtor(
      debtors,
      selectedDebtorForDebt.id,
      finalAmount,
      items,
      debtNote.trim() || undefined
    );

    onUpdateDebtors(updated);
    setSelectedDebtorForDebt(null);
    setDebtAmount(0);
    setDebtNote('');
    setSelectedProductItems([]);
  };

  // Handle Payment Submit
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtorForPay || paymentAmount <= 0) return;

    const updated = recordPaymentFromDebtor(
      debtors,
      selectedDebtorForPay.id,
      paymentAmount,
      paymentMethod,
      paymentNote.trim() || undefined
    );

    onUpdateDebtors(updated);
    setSelectedDebtorForPay(null);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  // Handle Delete Debtor
  const handleDeleteDebtor = (debtor: Debtor) => {
    if (debtor.totalDebt > 0) {
      if (
        !window.confirm(
          `Khách hàng "${debtor.name}" hiện vẫn còn nợ ${formatVND(
            debtor.totalDebt
          )}. Bạn có chắc chắn muốn xóa hồ sơ này khỏi sổ không?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Xoá hồ sơ sổ nợ của "${debtor.name}"?`)) {
        return;
      }
    }

    const updated = deleteDebtor(debtors, debtor.id);
    onUpdateDebtors(updated);
    if (selectedDebtorForDetail?.id === debtor.id) {
      setSelectedDebtorForDetail(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 py-2">
      {/* 1. TOP HEADER & SUPABASE DB STATUS BANNER */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Sổ Ghi Nợ Khách Hàng</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    Tạp Hoá Truyền Thống
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý từng người nợ theo từng phần riêng biệt, theo dõi chi tiết từng lần mua nợ & trả tiền.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Backend Database Info Button */}
            <button
              type="button"
              onClick={() => setShowDbInfoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition"
              title="Xem trạng thái kết nối Backend & PostgreSQL ORM"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Backend & Database</span>
              {dbConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  PostgreSQL Online
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                  Local Cache Active
                </span>
              )}
            </button>

            {/* Add New Debtor Button */}
            <button
              type="button"
              onClick={() => setIsAddDebtorOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Mở Sổ Người Nợ Mới</span>
            </button>
          </div>
        </div>

        {/* 2. STATS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
              Tổng tiền khách đang nợ
            </span>
            <div className="text-lg sm:text-2xl font-black text-rose-700 mt-1">
              {formatVND(stats.totalDebt)}
            </div>
            <span className="text-[11px] text-rose-600/80 mt-0.5 block">
              {stats.activeDebtorsCount} người chưa thanh toán
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              Số người đang có nợ
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-800 mt-1">
              {stats.activeDebtorsCount} <span className="text-xs font-normal text-amber-600">người</span>
            </div>
            <span className="text-[11px] text-amber-600/80 mt-0.5 block">
              Khách quen mua chịu hàng ngày
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Khách đã trả sạch nợ
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-800 mt-1">
              {stats.settledDebtorsCount} <span className="text-xs font-normal text-emerald-600">người</span>
            </div>
            <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
              Dư nợ hiện tại bằng 0đ
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Tổng hạn mức nợ cấp ra
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-800 mt-1">
              {formatVND(stats.totalCreditLimit)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Giới hạn an toàn dòng tiền
            </span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH, FILTERS & SORT */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên người nợ, SĐT, địa chỉ nhà..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 flex-wrap">
          {/* Status buttons */}
          <div className="inline-flex max-w-full overflow-x-auto no-scrollbar rounded-xl bg-slate-100 p-1 text-xs font-semibold whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({debtors.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-rose-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Đang còn nợ ({stats.activeDebtorsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SETTLED')}
              className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg transition ${
                statusFilter === 'SETTLED'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Đã trả hết ({stats.settledDebtorsCount})
            </button>
          </div>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="debt_desc">Nợ nhiều nhất</option>
            <option value="debt_asc">Nợ ít nhất</option>
            <option value="name_asc">Tên A-Z</option>
            <option value="date_desc">Giao dịch mới nhất</option>
          </select>
        </div>
      </div>

      {/* 4. DEBTOR CARDS: "MỖI NGƯỜI NỢ LÀ 1 PHẦN" */}
      {filteredDebtors.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy người nợ phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Không có khách hàng nào trùng khớp với bộ lọc hoặc từ khoá tìm kiếm.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDebtors.map((debtor) => {
            const hasDebt = debtor.totalDebt > 0;
            const percentOfLimit = Math.min(100, Math.round((debtor.totalDebt / debtor.creditLimit) * 100));
            const isNearLimit = percentOfLimit >= 80;

            return (
              <div
                key={debtor.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDebtorForDetail(debtor)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDebtorForDetail(debtor);
                  }
                }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                title="Bấm vào thẻ để xem chi tiết toàn bộ lịch sử sổ nợ"
              >
                {/* Header portion */}
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-base truncate group-hover:text-amber-800 transition-colors">
                          {debtor.name}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      {debtor.phone && (
                        <a
                          href={`tel:${debtor.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700 mt-0.5"
                          title="Bấm để gọi điện thoại"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{debtor.phone}</span>
                        </a>
                      )}
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                        hasDebt
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {hasDebt ? 'Đang nợ' : 'Sạch nợ'}
                    </span>
                  </div>

                  {debtor.address && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{debtor.address}</span>
                    </div>
                  )}

                  {debtor.note && (
                    <div className="text-[11px] text-slate-500 italic bg-amber-50/60 text-amber-900 px-2.5 py-1.5 rounded-lg border border-amber-100/80">
                      {debtor.note}
                    </div>
                  )}

                  {/* DEBT AMOUNT DISPLAY */}
                  <div className="mt-1 pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Số tiền đang nợ
                      </span>
                      <span
                        className={`text-2xl font-black tracking-tight ${
                          hasDebt ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatVND(debtor.totalDebt)}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <span>Hạn mức: </span>
                      <strong className="text-slate-700">{formatVND(debtor.creditLimit)}</strong>
                    </div>
                  </div>

                  {/* Credit limit progress indicator */}
                  <div className="w-full">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isNearLimit ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentOfLimit}%` }}
                      />
                    </div>
                    {isNearLimit && hasDebt && (
                      <span className="text-[10px] text-rose-600 font-bold mt-1 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Đã chạm {percentOfLimit}% hạn mức cho nợ
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action buttons: + Ghi nợ, Thu nợ, Xem sổ */}
                <div
                  className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDebtorForDebt(debtor);
                      setDebtAmount(0);
                      setDebtNote('');
                      setSelectedProductItems([]);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                    title="Ghi nợ thêm cho người này"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ghi nợ</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDebtorForPay(debtor);
                      setPaymentAmount(debtor.totalDebt);
                      setPaymentNote('');
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                    title="Khách trả tiền nợ"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Thu nợ</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDebtorForDetail(debtor);
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-200/70 border border-slate-200 text-slate-700 font-semibold text-xs transition"
                    title="Xem chi tiết sổ nợ"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 1: MỞ SỔ NGƯỜI NỢ MỚI */}
      {/* ============================================================================== */}
      {isAddDebtorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Mở Sổ Ghi Nợ Cho Khách Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDebtorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDebtorSubmit} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên người nợ / Biệt danh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cô Tư đầu hẻm, Anh Ba xe ôm, Bác Năm..."
                  value={newDebtorData.name}
                  onChange={(e) => setNewDebtorData({ ...newDebtorData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={newDebtorData.phone}
                    onChange={(e) => setNewDebtorData({ ...newDebtorData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hạn mức cho nợ (VNĐ)</label>
                  <NumberInput
                    value={newDebtorData.creditLimit}
                    onChange={(d) =>
                      setNewDebtorData({ ...newDebtorData, creditLimit: Number(d) || 0 })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Địa chỉ / Đặc điểm nhận dạng nhà
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhà số 45/2 hẻm cạnh cây bàng, đối diện quán nước..."
                  value={newDebtorData.address}
                  onChange={(e) => setNewDebtorData({ ...newDebtorData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú nhắc nhớ</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thường trả vào ngày 15, mua chịu dầu ăn & mì tôm..."
                  value={newDebtorData.note}
                  onChange={(e) => setNewDebtorData({ ...newDebtorData, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700">Số nợ ban đầu (nếu đã nợ từ trước)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <NumberInput
                    placeholder="Số tiền nợ (VNĐ)"
                    value={newDebtorData.initialDebt || ''}
                    onChange={(d) =>
                      setNewDebtorData({ ...newDebtorData, initialDebt: Number(d) || 0 })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Lý do nợ ban đầu..."
                    value={newDebtorData.initialDebtNote}
                    onChange={(e) =>
                      setNewDebtorData({ ...newDebtorData, initialDebtNote: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDebtorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu Sổ Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: GHI NỢ THÊM CHO KHÁCH */}
      {/* ============================================================================== */}
      {selectedDebtorForDebt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-amber-600 font-black">+ Ghi Nợ Thêm:</span>
                  <span>{selectedDebtorForDebt.name}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Dư nợ hiện tại: <strong className="text-rose-600">{formatVND(selectedDebtorForDebt.totalDebt)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtorForDebt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordDebtSubmit} className="mt-4 flex flex-col gap-4">
              {/* Option 1: Pick items from store */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn món hàng khách lấy (tuỳ chọn)
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm nhanh mì tôm, nước ngọt, dầu ăn..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>

                {productSearch && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 mb-2">
                    {products
                      .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .slice(0, 5)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductItems((prev) => {
                              const existing = prev.find((it) => it.product.id === p.id);
                              if (existing) {
                                return prev.map((it) =>
                                  it.product.id === p.id ? { ...it, quantity: it.quantity + 1 } : it
                                );
                              }
                              return [...prev, { product: p, quantity: 1 }];
                            });
                            setProductSearch('');
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition"
                        >
                          <span className="font-medium text-slate-800 truncate">{p.name}</span>
                          <span className="font-bold text-emerald-700 shrink-0">
                            {formatVND(p.sellingPrice)}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                {/* Selected Items List */}
                {selectedProductItems.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex flex-col gap-1.5 mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Món hàng đã chọn:
                    </span>
                    {selectedProductItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2 text-xs bg-white px-2 py-1 rounded-lg border border-slate-100"
                      >
                        <span className="font-medium truncate max-w-[180px]">{item.product.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductItems((prev) =>
                                prev
                                  .map((it) =>
                                    it.product.id === item.product.id
                                      ? { ...it, quantity: it.quantity - 1 }
                                      : it
                                  )
                                  .filter((it) => it.quantity > 0)
                              );
                            }}
                            className="w-5 h-5 rounded bg-slate-100 font-bold flex items-center justify-center text-slate-700"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductItems((prev) =>
                                prev.map((it) =>
                                  it.product.id === item.product.id
                                    ? { ...it, quantity: it.quantity + 1 }
                                    : it
                                )
                              );
                            }}
                            className="w-5 h-5 rounded bg-slate-100 font-bold flex items-center justify-center text-slate-700"
                          >
                            +
                          </button>
                          <span className="font-bold text-emerald-800 ml-1">
                            {formatVND(item.product.sellingPrice * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductItems((prev) =>
                                prev.filter((it) => it.product.id !== item.product.id)
                              );
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Amount input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số tiền nợ (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <NumberInput
                  required
                  value={
                    selectedProductItems.length > 0
                      ? selectedProductItems.reduce(
                          (sum, it) => sum + it.product.sellingPrice * it.quantity,
                          0
                        )
                      : debtAmount || ''
                  }
                  onChange={(d) => setDebtAmount(Number(d) || 0)}
                  disabled={selectedProductItems.length > 0}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú món hàng hoặc lý do nợ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Con gái qua lấy hộ, hứa thứ 7 trả..."
                  value={debtNote}
                  onChange={(e) => setDebtNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex justify-between items-center">
                <span>Dư nợ mới sau khi ghi:</span>
                <strong className="text-sm font-black text-rose-700">
                  {formatVND(
                    selectedDebtorForDebt.totalDebt +
                      (selectedProductItems.length > 0
                        ? selectedProductItems.reduce(
                            (sum, it) => sum + it.product.sellingPrice * it.quantity,
                            0
                          )
                        : debtAmount)
                  )}
                </strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDebtorForDebt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  Xác Nhận Ghi Nợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: THU TIỀN TRẢ NỢ */}
      {/* ============================================================================== */}
      {selectedDebtorForPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-emerald-700 font-black">Thu Tiền Nợ:</span>
                  <span>{selectedDebtorForPay.name}</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Dư nợ hiện tại:{' '}
                  <strong className="text-rose-600">{formatVND(selectedDebtorForPay.totalDebt)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtorForPay(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số tiền khách trả (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <NumberInput
                  required
                  value={paymentAmount || ''}
                  onChange={(d) => setPaymentAmount(Number(d) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-lg font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedDebtorForPay.totalDebt)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold hover:bg-emerald-200"
                  >
                    Trả hết ({formatVND(selectedDebtorForPay.totalDebt)})
                  </button>
                  {selectedDebtorForPay.totalDebt >= 50000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(50000)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200"
                    >
                      50.000 đ
                    </button>
                  )}
                  {selectedDebtorForPay.totalDebt >= 100000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(100000)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200"
                    >
                      100.000 đ
                    </button>
                  )}
                  {selectedDebtorForPay.totalDebt >= 200000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(200000)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold hover:bg-slate-200"
                    >
                      200.000 đ
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phương thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('VIETQR')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'VIETQR'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Quét VietQR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú thanh toán</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trả đợt 1, trả hết dứt điểm..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex justify-between items-center">
                <span>Dư nợ còn lại sau thanh toán:</span>
                <strong className="text-sm font-black text-emerald-800">
                  {formatVND(Math.max(0, selectedDebtorForPay.totalDebt - paymentAmount))}
                </strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDebtorForPay(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Xác Nhận Đã Thu Tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: CHI TIẾT SỔ NỢ (TIMELINE & LỊCH SỬ GIAO DỊCH TỪNG NGƯỜI) */}
      {/* ============================================================================== */}
      {selectedDebtorForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{selectedDebtorForDetail.name}</h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      selectedDebtorForDetail.totalDebt > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedDebtorForDetail.totalDebt > 0 ? 'Đang nợ' : 'Đã thanh toán hết'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  {selectedDebtorForDetail.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedDebtorForDetail.phone}
                    </span>
                  )}
                  {selectedDebtorForDetail.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedDebtorForDetail.address}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDebtorForDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total debt summary bar */}
            <div className="my-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                  Tổng dư nợ hiện tại
                </span>
                <span
                  className={`text-2xl font-black ${
                    selectedDebtorForDetail.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {formatVND(selectedDebtorForDetail.totalDebt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDebtorForDebt(selectedDebtorForDetail);
                    setSelectedDebtorForDetail(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  + Ghi nợ thêm
                </button>
                {selectedDebtorForDetail.totalDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDebtorForPay(selectedDebtorForDetail);
                      setPaymentAmount(selectedDebtorForDetail.totalDebt);
                      setSelectedDebtorForDetail(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                  >
                    Thu nợ
                  </button>
                )}
              </div>
            </div>

            {/* Transactions Timeline */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Lịch sử ghi nợ & trả tiền:
              </span>

              {!selectedDebtorForDetail.transactions ||
              selectedDebtorForDetail.transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có lịch sử giao dịch nào được ghi lại.
                </div>
              ) : (
                selectedDebtorForDetail.transactions.map((trans) => {
                  const isDebt = trans.type === 'DEBT';
                  return (
                    <div
                      key={trans.id}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 transition ${
                        isDebt
                          ? 'bg-rose-50/40 border-rose-100'
                          : 'bg-emerald-50/40 border-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isDebt ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-black">
                              Mua nợ (+ {formatVND(trans.amount)})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black">
                              Trả nợ (- {formatVND(trans.amount)})
                            </span>
                          )}
                          {trans.paymentMethod && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              [{trans.paymentMethod === 'VIETQR' ? 'VietQR' : 'Tiền mặt'}]
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {trans.createdAt}
                        </span>
                      </div>

                      {trans.note && (
                        <p className="text-xs text-slate-700 font-medium">{trans.note}</p>
                      )}

                      {/* Items details if available */}
                      {trans.items && trans.items.length > 0 && (
                        <div className="bg-white/80 rounded-lg p-2 border border-slate-100 flex flex-col gap-1 text-[11px]">
                          {trans.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-slate-600"
                            >
                              <span>
                                {item.productName} (x{item.quantity} {item.unit})
                              </span>
                              <strong className="text-slate-800">{formatVND(item.totalPrice)}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100/80">
                        <span>Dư nợ sau giao dịch:</span>
                        <strong className="text-slate-900">{formatVND(trans.balanceAfter)}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteDebtor(selectedDebtorForDetail)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa người nợ</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDebtorForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đóng sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 5: THÔNG TIN SCHEMA & KẾT NỐI SUPABASE */}
      {/* ============================================================================== */}
      {showDbInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Kiến Trúc Backend & PostgreSQL (Drizzle ORM)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDbInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Trạng thái kết nối Server:</span>
                </div>
                <div className="text-[12px] font-semibold text-emerald-900 mt-1">
                  {dbConnected
                    ? '🟢 Backend Express đã kết nối thành công tới Supabase PostgreSQL qua Drizzle ORM.'
                    : '🟡 Backend đang dùng Local Cache (chưa cấu hình DATABASE_URL trong .env).'}
                </div>
              </div>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mt-1">
                Ưu điểm kiến trúc Backend trung tâm:
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-slate-800">Không cần VITE_SUPABASE_URL hay ANON_KEY:</strong> Frontend chỉ gọi RESTful API qua <code>/api/*</code> của backend.
                </li>
                <li>
                  <strong className="text-slate-800">Bảo mật tuyệt đối:</strong> Chuỗi kết nối Database nằm an toàn trên Server, không lộ ra trình duyệt.
                </li>
                <li>
                  <strong className="text-slate-800">Toàn vẹn giao dịch (Atomic Transactions):</strong> Ghi nợ, trừ kho và thanh toán được chạy qua Drizzle Transaction trên server.
                </li>
              </ul>

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mt-1">
                Cách kết nối Database khi chạy dưới máy:
              </h4>
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[11px]">
                DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"<br />
                DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
              </div>

              <p className="text-[11px] text-slate-500 italic mt-1">
                Lệnh đẩy cấu trúc bảng: <code>npm run db:push</code> | Nạp dữ liệu mẫu: <code>npm run db:seed</code>
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDbInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
