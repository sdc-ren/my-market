import type { BusinessHour } from '../types';

function toMinutes(t: string): number {
  const [h, m] = (t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Cửa hàng có đang mở cửa tại thời điểm `now` không (hỗ trợ khung qua đêm). */
export function isStoreOpenNow(hours: BusinessHour[] | undefined, now: Date = new Date()): boolean {
  if (!hours || hours.length === 0) return true; // chưa cấu hình -> mặc định mở
  const cur = now.getHours() * 60 + now.getMinutes();
  return hours.some(({ open, close }) => {
    const o = toMinutes(open);
    const c = toMinutes(close);
    if (c <= o) return cur >= o || cur < c; // khung qua đêm, VD: 18:00–02:00
    return cur >= o && cur < c;
  });
}

/** "06:00–11:30 • 13:30–22:00" — dùng hiển thị gọn trên header. */
export function formatBusinessHours(hours: BusinessHour[] | undefined): string {
  if (!hours || hours.length === 0) return '';
  return hours
    .filter((h) => h.open && h.close)
    .map((h) => `${h.open}–${h.close}`)
    .join(' • ');
}
