import React, { useState } from 'react';

// Ảnh mặc định của hệ thống — dùng khi sản phẩm chưa có ảnh hoặc ảnh bị lỗi.
// SVG tự chứa (data URI) nên luôn hiển thị được, không phụ thuộc mạng.
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ecfdf5"/>
      <stop offset="1" stop-color="#a7f3d0"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <circle cx="200" cy="168" r="88" fill="#ffffff" opacity="0.9"/>
  <g fill="none" stroke="#047857" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
    <path d="M152 146 h96 l-9 86 a14 14 0 0 1 -14 12 h-50 a14 14 0 0 1 -14 -12 z"/>
    <path d="M172 146 v-14 a28 28 0 0 1 56 0 v14"/>
  </g>
  <text x="200" y="308" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" fill="#065f46" letter-spacing="3">TẠP HOÁ</text>
  <text x="200" y="340" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#059669">chưa có ảnh sản phẩm</text>
</svg>`;

export const DEFAULT_PRODUCT_IMAGE =
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(DEFAULT_SVG);

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

/**
 * Ảnh sản phẩm dùng chung toàn app.
 * - Nếu src trống hoặc ảnh tải lỗi -> tự động hiện ảnh mặc định của hệ thống.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Sản phẩm',
  ...rest
}) => {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src || failed ? DEFAULT_PRODUCT_IMAGE : src;
  return (
    <img
      src={finalSrc}
      alt={alt}
      {...rest}
      onError={() => setFailed(true)}
    />
  );
};
