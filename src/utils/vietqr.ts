export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  code: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  { id: 'MB', name: 'Ngân hàng Quân Đội', shortName: 'MBBank', code: '970422' },
  { id: 'VCB', name: 'Ngân hàng Ngoại Thương Việt Nam', shortName: 'Vietcombank', code: '970436' },
  { id: 'TCB', name: 'Ngân hàng Kỹ Thương Việt Nam', shortName: 'Techcombank', code: '970407' },
  { id: 'BIDV', name: 'Ngân hàng Đầu tư và Phát triển VN', shortName: 'BIDV', code: '970418' },
  { id: 'ACB', name: 'Ngân hàng Á Châu', shortName: 'ACB', code: '970416' },
  { id: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank', code: '970432' },
  { id: 'TPB', name: 'Ngân hàng Tiên Phong', shortName: 'TPBank', code: '970423' },
  { id: 'VBA', name: 'Ngân hàng Nông nghiệp & PTNT', shortName: 'Agribank', code: '970405' },
];

export function getVietQRUrl(
  bankId: string,
  accountNo: string,
  accountName: string,
  amount: number,
  description: string,
  template = 'compact2'
): string {
  const cleanBank = bankId.trim();
  const cleanAcc = accountNo.trim();
  const cleanName = encodeURIComponent(accountName.trim());
  const cleanDesc = encodeURIComponent(description.trim());
  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${template}.png?amount=${Math.round(amount)}&addInfo=${cleanDesc}&accountName=${cleanName}`;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getExpiryStatus(expiryDate: string, warningDays = 30): {
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
  daysLeft: number;
  label: string;
  colorClass: string;
  badgeBg: string;
} {
  if (!expiryDate) {
    return {
      status: 'GOOD',
      daysLeft: 999,
      label: 'Không xác định',
      colorClass: 'text-slate-500',
      badgeBg: 'bg-slate-100 text-slate-700',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      status: 'EXPIRED',
      daysLeft,
      label: `Đã hết hạn (${Math.abs(daysLeft)} ngày)`,
      colorClass: 'text-red-600',
      badgeBg: 'bg-red-50 text-red-700 border border-red-200',
    };
  }

  if (daysLeft <= 7) {
    return {
      status: 'CRITICAL',
      daysLeft,
      label: `Cận date (${daysLeft} ngày)`,
      colorClass: 'text-rose-600',
      badgeBg: 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse',
    };
  }

  if (daysLeft <= warningDays) {
    return {
      status: 'WARNING',
      daysLeft,
      label: `Còn ${daysLeft} ngày`,
      colorClass: 'text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }

  return {
    status: 'GOOD',
    daysLeft,
    label: `HSD: ${formatDate(expiryDate)}`,
    colorClass: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  };
}
