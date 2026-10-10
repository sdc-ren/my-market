import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
import * as schema from './schema';
import { STORE_CATEGORIES, INITIAL_PRODUCTS, INITIAL_DEBTORS, DEFAULT_STORE_SETTINGS } from '../data/mockData';

dotenv.config();

async function runSeed() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ LỖI: Chưa cấu hình biến môi trường DIRECT_URL hoặc DATABASE_URL trong file .env');
    console.error('👉 Hãy copy .env.example thành .env và điền chuỗi kết nối Supabase của bạn.');
    process.exit(1);
  }

  console.log('🚀 Đang kết nối tới Supabase PostgreSQL qua Drizzle ORM...');
  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    // 1. Seed Store Settings (Admin / Cửa Hàng & PIN Quản Lý)
    console.log('⚙️  1. Đang nạp cấu hình cửa hàng & tài khoản quản lý (store_settings)...');
    await db
      .insert(schema.storeSettings)
      .values({
        id: 'default',
        storeName: DEFAULT_STORE_SETTINGS.storeName,
        phone: DEFAULT_STORE_SETTINGS.phone,
        address: DEFAULT_STORE_SETTINGS.address,
        bankId: DEFAULT_STORE_SETTINGS.bankId,
        bankAccount: DEFAULT_STORE_SETTINGS.bankAccount,
        bankAccountName: DEFAULT_STORE_SETTINGS.bankAccountName,
        qrTemplate: DEFAULT_STORE_SETTINGS.qrTemplate,
        lowStockThreshold: DEFAULT_STORE_SETTINGS.lowStockThreshold,
        expiryWarningDays: DEFAULT_STORE_SETTINGS.expiryWarningDays,
        ownerPin: DEFAULT_STORE_SETTINGS.ownerPin || '1234',
        logoUrl: DEFAULT_STORE_SETTINGS.logoUrl || '',
      })
      .onConflictDoUpdate({
        target: schema.storeSettings.id,
        set: {
          storeName: DEFAULT_STORE_SETTINGS.storeName,
          phone: DEFAULT_STORE_SETTINGS.phone,
          address: DEFAULT_STORE_SETTINGS.address,
          ownerPin: DEFAULT_STORE_SETTINGS.ownerPin || '1234',
          updatedAt: new Date(),
        },
      });
    console.log('   ✅ Đã khởi tạo cấu hình cửa hàng & mã PIN quản lý mặc định: 1234');

    // 2. Seed Categories (Danh Mục Hàng Hoá)
    console.log('📂 2. Đang nạp danh mục hàng hoá (categories)...');
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
    console.log(`   ✅ Đã nạp thành công ${categoriesToSeed.length} danh mục hàng hóa!`);

    // 3. Seed Products (Sản phẩm mẫu)
    console.log('📦 3. Đang nạp sản phẩm mẫu (products)...');
    for (const p of INITIAL_PRODUCTS) {
      await db
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
        .onConflictDoNothing({ target: schema.products.id });
    }
    console.log(`   ✅ Đã nạp thành công ${INITIAL_PRODUCTS.length} sản phẩm mẫu!`);

    console.log('\n🎉 =======================================================');
    console.log('✅ NẠP SEED HOÀN TẤT: Đã tạo tài khoản quản trị, danh mục và sản phẩm mẫu!');
    console.log('👉 Mã PIN chủ cửa hàng: 1234');
    console.log('👉 Bây giờ bạn có thể chạy "npm run dev" để bắt đầu.');
    console.log('=======================================================\n');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình seed database:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
