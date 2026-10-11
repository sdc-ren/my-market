// =============================================================================
// SUPABASE STORAGE CLIENT — upload ảnh sản phẩm lên bucket `product-images`.
// Chạy phía server với SERVICE_ROLE_KEY (bypass RLS). Upload yêu cầu đăng nhập
// quản lý (xem api/upload-image.ts). Serverless-safe: cache trên globalThis.
// =============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

declare global {
  // eslint-disable-next-line no-var
  var __myMarketStorage: SupabaseClient | null | undefined;
}

function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  // Dựng từ DATABASE_URL: user có dạng postgres.<project-ref>@...
  const m = (process.env.DATABASE_URL || '').match(/postgres\.([a-z0-9]+)@/);
  if (m) return `https://${m[1]}.supabase.co`;
  return '';
}

function createStorageClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    if (!key) console.warn('[storage] Thiếu SUPABASE_SERVICE_ROLE_KEY — upload ảnh sẽ báo 503.');
    return null;
  }
  return createClient(url, key);
}

if (globalThis.__myMarketStorage === undefined) {
  globalThis.__myMarketStorage = createStorageClient();
}

export const supabaseAdmin: SupabaseClient | null = globalThis.__myMarketStorage ?? null;

export function publicImageUrl(path: string): string | null {
  if (!supabaseAdmin) return null;
  const { data } = supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Xoá object Storage từ URL public (best-effort, không throw). */
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  try {
    if (!supabaseAdmin || !imageUrl.includes(`/${PRODUCT_IMAGES_BUCKET}/`)) return;
    const path = imageUrl.split(`/${PRODUCT_IMAGES_BUCKET}/`)[1]?.split('?')[0];
    if (!path) return;
    await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  } catch (e) {
    console.warn('[storage] Xoá ảnh thất bại (bỏ qua):', (e as any)?.message);
  }
}
