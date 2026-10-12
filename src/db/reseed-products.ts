// ============================================================================
// RESEED AN TOÀN — chỉ nạp lại danh mục + sản phẩm mẫu.
//
// KHÁC BIỆT với `db:seed` (src/db/seed.ts): script này TUYỆT ĐỐI KHÔNG đụng
// vào `store_settings`. Chạy `db:seed` đầy đủ sẽ ghi đè `ownerPin` về '1234'
// (plaintext) và reset tên/logo cửa hàng về mặc định — undo việc Ren đã đổi
// PIN + branding "Tạp Hoá Cô Phước".
//
// Dùng khi nào: sau khi dọn dữ liệu test làm kho về 0 sản phẩm và Ren yêu cầu
// "seed lại hàng mẫu". Chỉ insert, không xoá dữ liệu Ren đã nhập (products
// dùng onConflictDoNothing theo id, categories cập nhật nhẹ name/icon/color).
//
// Chạy: npx tsx src/db/reseed-products.ts   (từ thư mục my-market)
// LƯU Ý: local và production DÙNG CHUNG 1 Supabase DB — script này ghi lên DB
// thật. Chỉ chạy khi Ren đã đồng ý.
// ============================================================================

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
import * as schema from './schema';
import { STORE_CATEGORIES, INITIAL_PRODUCTS } from '../data/mockData';

dotenv.config();

async function reseed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ LỖI: Chưa cấu hình DIRECT_URL hoặc DATABASE_URL trong file .env');
    process.exit(1);
  }

  console.log('🚀 Kết nối Supabase PostgreSQL qua Drizzle ORM...');
  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    // 1. Categories (không đụng store_settings)
    const categoriesToSeed = STORE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      description: c.description || `Danh mục ${c.name}`,
    }));
    for (const cat of categoriesToSeed) {
      await db
        .insert(schema.categories)
        .values(cat)
        .onConflictDoUpdate({
          target: schema.categories.id,
          set: { name: cat.name, icon: cat.icon, color: cat.color },
        });
    }
    console.log(`   ✅ ${categoriesToSeed.length} danh mục`);

    // 2. Products — chỉ insert, bỏ qua id đã tồn tại
    let inserted = 0;
    for (const p of INITIAL_PRODUCTS) {
      const r = await db
        .insert(schema.products)
        .values({
          id: p.id,
          barcode: p.barcode,
          name: p.name,
          brand: p.brand || '',
          category: p.category || 'other',
          unit: p.unit || 'cái',
          costPrice: p.costPrice || 0,
          sellingPrice: p.sellingPrice || 0,
          stock: p.stock || 0,
          minStockAlert: p.minStockAlert || 5,
          mfgDate: p.mfgDate || '',
          expiryDate: p.expiryDate || '',
          batchNumber: p.batchNumber || '',
          shelfLocation: p.shelfLocation || '',
          image: p.image || '',
          description: p.description || '',
          soldCount: p.soldCount || 0,
        })
        .onConflictDoNothing({ target: schema.products.id })
        .returning({ id: schema.products.id });
      if (r.length > 0) inserted++;
    }
    console.log(`   ✅ ${inserted} sản phẩm mới (bỏ qua ${INITIAL_PRODUCTS.length - inserted} sản phẩm đã có)`);

    console.log('\n🎉 RESEED XONG — store_settings / PIN / branding không bị đụng tới.');
  } catch (error) {
    console.error('❌ Lỗi khi reseed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

reseed();
