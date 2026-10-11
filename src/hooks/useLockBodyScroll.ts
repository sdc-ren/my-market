import { useEffect } from 'react';

// Khoá scroll của trang nền khi có dialog/modal mở.
// Dùng counter để nhiều modal chồng nhau vẫn đúng (chỉ mở khoá khi tất cả đã đóng).
let lockCount = 0;

export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    lockCount += 1;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    // iPad Safari: cần khoá cả documentElement mới chặn được scroll nền
    document.documentElement.style.overflow = 'hidden';
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevBody;
        document.documentElement.style.overflow = prevHtml;
      }
    };
  }, [locked]);
}
