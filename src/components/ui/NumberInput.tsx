import React from 'react';

/**
 * NumberInput — ô nhập số dùng chung toàn app.
 *
 * Giải quyết 2 vấn đề của <input type="number">:
 * 1. Xoá hết chữ số bị kẹt lại số 0 (do `Number('') || 0`) — ở đây xoá hết
 *    được, state cha nhận chuỗi rỗng và tự quyết giá trị mặc định.
 * 2. Giá tiền không có phân cách nghìn — mode `thousands` hiển thị 100.000
 *    trong lúc nhập.
 *
 * State cha VẪN lưu number như cũ, chỉ đổi cách render/onChange:
 *   <NumberInput value={price} onChange={(d) => setPrice(Number(d) || 0)} ... />
 */
export const onlyDigits = (v: string): string => v.replace(/\D/g, '');

/** 100000 -> "100.000" | '' -> '' */
export function formatThousands(value: string | number | null | undefined): string {
  const d = onlyDigits(String(value ?? ''));
  if (!d) return '';
  return Number(d).toLocaleString('vi-VN');
}

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  /** Giá trị số từ state cha (number như cũ) */
  value: string | number | null | undefined;
  /** Trả về chuỗi chữ số thuần ('' khi xoá hết) — cha tự Number() */
  onChange: (digits: string) => void;
  /** 'thousands': hiển thị 100.000 | 'plain': số thuần. Mặc định 'thousands'. */
  format?: 'thousands' | 'plain';
  /** Hiển thị rỗng thay vì 0 khi value = 0. Mặc định true. */
  emptyWhenZero?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  format = 'thousands',
  emptyWhenZero = true,
  ...rest
}) => {
  const isZero = value === 0 || value === '0';
  const display =
    isZero && emptyWhenZero
      ? ''
      : format === 'thousands'
        ? formatThousands(value)
        : onlyDigits(String(value ?? ''));

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={(e) => onChange(onlyDigits(e.target.value))}
      {...rest}
    />
  );
};
