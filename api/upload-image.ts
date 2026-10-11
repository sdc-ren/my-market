import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { requireAuth } from './_auth.js';
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET, publicImageUrl } from './_storage.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------------------------------------------------------------------------
  // POST /api/upload-image — upload ảnh sản phẩm lên Supabase Storage.
  // Chỉ quản lý đã đăng nhập. Nhận base64 (đã nén ở client), trả về public URL.
  // ---------------------------------------------------------------------------
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Chưa cấu hình Supabase Storage' });
  }

  try {
    const { dataUrl } = (req.body || {}) as { dataUrl?: string };
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ error: 'Ảnh không hợp lệ (chỉ nhận JPEG/PNG/WebP)' });
    }

    const contentType = m[1];
    const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
    const buffer = Buffer.from(m[3], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Ảnh quá lớn (tối đa 5MB)' });
    }

    const path = `products/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) {
      console.error('Storage upload error:', error.message);
      return res.status(500).json({ error: 'Upload ảnh thất bại' });
    }

    return res.json({ success: true, url: publicImageUrl(path), path });
  } catch (e: any) {
    console.error('Upload image error:', e);
    return res.status(500).json({ error: 'Lỗi server' });
  }
}
