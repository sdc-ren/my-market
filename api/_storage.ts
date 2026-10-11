// =============================================================================
// SUPABASE STORAGE — upload ảnh sản phẩm lên bucket `product-images`.
// Dùng Storage REST API trực tiếp (fetch) với SERVICE_ROLE_KEY, không cần
// @supabase/supabase-js để function nhẹ và tránh lỗi bundle.
// Upload yêu cầu đăng nhập quản lý (xem api/upload-image.ts).
// =============================================================================

export const PRODUCT_IMAGES_BUCKET = 'product-images';

function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  // Dựng từ DATABASE_URL: user có dạng postgres.<project-ref>@...
  const m = (process.env.DATABASE_URL || '').match(/postgres\.([a-z0-9]+)@/);
  if (m) return `https://${m[1]}.supabase.co`;
  return '';
}

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function isStorageConfigured(): boolean {
  return !!(getSupabaseUrl() && getServiceKey());
}

function authHeaders(contentType?: string): Record<string, string> {
  const key = getServiceKey();
  const h: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

export function publicImageUrl(path: string): string | null {
  const url = getSupabaseUrl();
  if (!url) return null;
  return `${url}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;
}

/** Upload buffer lên Storage. Trả về public URL, throw khi lỗi. */
export async function uploadImageToStorage(
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<{ url: string; path: string }> {
  const url = getSupabaseUrl();
  if (!url || !getServiceKey()) {
    throw new Error('Chưa cấu hình Supabase Storage (thiếu SUPABASE_SERVICE_ROLE_KEY)');
  }
  const { randomUUID } = await import('crypto');
  const path = `products/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  const res = await fetch(
    `${url}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: authHeaders(contentType),
      body: buffer as unknown as BodyInit,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload ảnh thất bại (${res.status}): ${text.slice(0, 200)}`);
  }
  const publicUrl = publicImageUrl(path);
  if (!publicUrl) throw new Error('Không tạo được public URL');
  return { url: publicUrl, path };
}

/** Xoá object Storage từ URL public (best-effort, không throw). */
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  try {
    if (!isStorageConfigured() || !imageUrl.includes(`/${PRODUCT_IMAGES_BUCKET}/`)) return;
    const path = imageUrl.split(`/${PRODUCT_IMAGES_BUCKET}/`)[1]?.split('?')[0];
    if (!path) return;
    const url = getSupabaseUrl();
    await fetch(`${url}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}`, {
      method: 'DELETE',
      headers: authHeaders('application/json'),
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch (e) {
    console.warn('[storage] Xoá ảnh thất bại (bỏ qua):', (e as any)?.message);
  }
}
