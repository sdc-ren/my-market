# 🏪 Tạp Hoá Thông Minh (My Market)

> **English summary:** My Market is an open-source web app for running a Vietnamese grocery/convenience store: storefront with cart & VietQR checkout, inventory management with expiry tracking, order management, customer debt ledger, revenue dashboard, and store settings (name + logo). Built with React 19 + Vite + Tailwind CSS v4, Express (local/Docker) or Vercel serverless functions, and Supabase PostgreSQL via Drizzle ORM.

Hệ thống quản lý cửa hàng tạp hoá: bán hàng, giỏ hàng, thanh toán VietQR, quản lý kho & hạn sử dụng, đơn hàng, sổ ghi nợ và dashboard doanh thu — tất cả trên một web app duy nhất.

---

## ✨ Tính năng

**🛒 Trang bán hàng (khách)**
- Tìm kiếm theo tên / mã vạch, lọc theo danh mục, sắp xếp (giá, HSD, tồn kho)
- Giỏ hàng, đặt hàng (tại quầy / giao hàng), theo dõi trạng thái đơn
- Thanh toán **VietQR** (tự sinh mã QR theo số tiền)
- Quét mã vạch bằng camera để tìm sản phẩm
- Hàng **hết HSD / cận date tự động ẩn** khỏi trang bán (chỉ chủ shop thấy trong quản lý)

**📦 Quản lý (PIN mặc định `1234`)**
- Dashboard doanh thu & lãi (biểu đồ)
- Kiểm kho: nhập / xuất / điều chỉnh tồn, quét mã vạch nhập kho nhanh
- Theo dõi hạn sử dụng, cảnh báo tồn kho thấp
- Quản lý đơn hàng (xác nhận, hoàn thành, đánh dấu đã thanh toán)
- **Sổ ghi nợ** khách hàng: ghi nợ, thu nợ (tiền mặt / VietQR), lịch sử giao dịch
- Quản lý danh mục sản phẩm
- **Cấu hình cửa hàng**: tên, logo (URL hoặc tải ảnh lên), SĐT, địa chỉ, tài khoản VietQR, ngưỡng cảnh báo, đổi PIN

---

## 🛠 Tech stack

| Layer | Công nghệ |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4, lucide-react, recharts, html5-qrcode |
| Backend (local / Docker) | Express (`server.ts`) |
| Backend (Vercel) | Serverless functions (`api/`) |
| Database | Supabase PostgreSQL + Drizzle ORM |
| Runtime | Node.js 20+ |

---

## 📁 Cấu trúc thư mục

```
my-market/
├── api/                    # Vercel serverless functions (GET/POST/DELETE /api/*)
│   ├── _db.ts              # DB client dùng chung (cache connection, serverless-safe)
│   ├── health.ts           # GET /api/health
│   ├── products.ts         # GET + POST /api/products
│   ├── products/[id].ts    # DELETE /api/products/:id
│   ├── categories.ts       # GET + POST /api/categories
│   ├── debtors.ts          # GET + POST /api/debtors
│   ├── debtors/[id].ts     # DELETE /api/debtors/:id
│   ├── debt-transactions.ts# POST /api/debt-transactions
│   ├── orders.ts           # GET + POST /api/orders
│   └── settings.ts         # GET + POST /api/settings
├── server.ts               # Express backend — dùng khi dev local & Docker
├── src/
│   ├── components/         # UI: Navbar, ProductCard, CartDrawer, OwnerDashboard, ...
│   ├── data/               # Dữ liệu mẫu (mockData: 20 sản phẩm, 7 danh mục)
│   ├── db/                 # Drizzle schema, DB client, seed script
│   ├── utils/              # apiClient, localStorage cache, VietQR helpers
│   ├── App.tsx
│   └── main.tsx
├── Dockerfile              # Multi-stage build → image node:20-alpine
├── docker-compose.yml      # 1 service duy nhất (DB dùng Supabase managed)
├── vercel.json             # Cấu hình build + SPA fallback cho Vercel
└── drizzle.config.ts       # Cấu hình Drizzle Kit
```

---

## 🚀 Chạy local

### Yêu cầu
- **Node.js 20+**
- Một **Supabase project** (lấy connection string tại *Project Settings → Database*)

### Các bước

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu rồi điền thông tin Supabase
cp .env.example .env
# DATABASE_URL=...  (pooler, port 6543 — backend dùng)
# DIRECT_URL=...    (direct, port 5432 — cho db:push)

# 3. Tạo bảng trong database
npm run db:push

# 4. Nạp dữ liệu mẫu (cấu hình shop, 7 danh mục, 20 sản phẩm, PIN 1234)
npm run db:seed

# 5. Chạy dev server
npm run dev
```

Mở **http://localhost:3000** — vào khu vực quản lý bằng PIN mặc định **`1234`**.

> ⚠️ **Trước khi đưa lên production:** đổi PIN quản lý trong *Quản lý → Cấu hình → Bảo mật*, và không bao giờ commit file `.env`.

---

## ☁️ Deploy lên Vercel

1. Import repo này vào Vercel (Add New → Project → chọn repo).
2. Vercel tự nhận cấu hình từ `vercel.json`: framework **Vite**, build command `npm run build`, output `dist`. API chạy qua các serverless functions trong `api/`.
3. Vào *Project → Settings → Environment Variables*, thêm:
   - `DATABASE_URL` = Supabase **pooler** connection string (**port 6543**), dạng:
     `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
4. Bấm **Deploy**.

> Lưu ý: serverless functions kết nối DB trực tiếp qua pooler — không cần tunnel hay server chạy thường trực.

---

## 🐳 Deploy bằng Docker

Repo đã có sẵn `Dockerfile` (multi-stage: build Vite + bundle server, image `node:20-alpine`) và `docker-compose.yml` — chỉ **1 service duy nhất**, database dùng Supabase managed nên không cần container Postgres/Redis.

```bash
# 1. Điền .env với URL Supabase THẬT (dạng pooler.supabase.com)
#    ⚠️ Không dùng địa chỉ tunnel 127.0.0.1 — chỉ có ý nghĩa trên máy dev.

# 2. Build & chạy
docker compose up -d --build
# Mở http://localhost:3000

# 3. Lần đầu tiên: tạo bảng + seed dữ liệu
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
```

---

## 📜 Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy dev server (Express + Vite) tại http://localhost:3000 |
| `npm run build` | Build frontend production (`vite build` → `dist/`) |
| `npm run start` | Chạy bản production (`NODE_ENV=production`) |
| `npm run preview` | Preview bản đã build |
| `npm run lint` | Kiểm tra TypeScript (`tsc --noEmit`) |
| `npm run clean` | Xoá `dist/` và `server.js` |
| `npm run db:push` | Đẩy Drizzle schema lên database |
| `npm run db:generate` | Sinh migration files từ schema |
| `npm run db:migrate` | Chạy migrations |
| `npm run db:studio` | Mở Drizzle Studio quản trị DB |
| `npm run db:seed` | Nạp dữ liệu mẫu (shop, danh mục, sản phẩm, PIN 1234) |

---

## 🔐 Biến môi trường

Tạo file `.env` từ `.env.example`. Không commit file `.env` (đã có trong `.gitignore`).

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase **pooler** connection string (port **6543**) — backend & API dùng để kết nối DB |
| `DIRECT_URL` | ✅ (cho db:push) | Supabase **direct** connection string (port **5432**) — Drizzle Kit dùng cho migration/DDL |
| `PORT` | ❌ (mặc định `3000`) | Cổng HTTP khi chạy Express local / Docker |
| `NODE_ENV` | ❌ | `development` / `production` |

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Fork repo, tạo branch, gửi pull request kèm mô tả thay đổi.

## 📄 Giấy phép

Dự án được phát hành dưới giấy phép **MIT** — xem file [LICENSE](./LICENSE) để biết chi tiết.
