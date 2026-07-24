# Dự án Market — Website bán hàng tạp hoá

**QUAN TRỌNG — đọc trước khi làm bất cứ việc gì:**

1. Toàn bộ tài liệu dự án nằm trong [`docs/`](docs/README.md) — đó là **nguồn chân lý**.
2. Mỗi phiên làm việc: đọc [`docs/PROGRESS.md`](docs/PROGRESS.md) TRƯỚC TIÊN để biết đang ở
   task nào, rồi làm theo đúng quy trình trong [`docs/README.md`](docs/README.md).
3. BẮT BUỘC tuân thủ [`docs/07-coding-rules.md`](docs/07-coding-rules.md) (DRY, tách nhỏ,
   naming theo [`docs/11-glossary.md`](docs/11-glossary.md)) và không phá các quyết định trong
   [`docs/10-decisions.md`](docs/10-decisions.md).
4. Xong task nào phải cập nhật `docs/PROGRESS.md` + commit `S{x}-{yy}: mô tả` ngay task đó.
5. Muốn đổi schema/kiến trúc/nghiệp vụ → sửa docs + thêm ADR TRƯỚC, code sau.

Lệnh thường dùng: `npm run dev` · `npm run lint` · `npm run build` · `npx vitest run` ·
`npx prisma migrate dev` · `npx prisma db seed`
