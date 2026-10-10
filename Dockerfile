# ==============================================================================
# My Market - Tạp Hoá Thông Minh (Full-stack Express + React + Drizzle/Supabase)
# Multi-stage build: build frontend + bundle backend, chạy production gọn nhẹ
# ==============================================================================
# Build:
#   docker build -t my-market:latest .
# Run (dùng file .env chứa DATABASE_URL / DIRECT_URL):
#   docker run -d --name my-market -p 3000:3000 --env-file .env my-market:latest
# Hoặc dùng docker compose:
#   docker compose up -d --build
# ==============================================================================

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# 1. Build frontend React -> dist/
RUN npm run build

# 2. Bundle backend server.ts -> server.mjs (đặt ở /app, cùng cấp với dist/
#    như cấu trúc gốc của project, để __dirname trong code trỏ đúng /app/dist).
#    --packages=external: giữ nguyên import từ node_modules (express, drizzle...).
#    esbuild tự shim __dirname/__filename cho ESM nên không cần banner.
RUN npx esbuild server.ts --bundle --platform=node --packages=external --format=esm \
  --outfile=server.mjs

# ---------- Stage 2: production ----------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
# Chỉ cài dependencies (không cần devDependencies ở runtime).
# Lưu ý: "vite" nằm trong dependencies nên vẫn được cài (server.ts import nó,
# nhưng ở production không gọi tới).
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 3000

# Kiểm tra sức khỏe container (wget có sẵn trên alpine qua busybox)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "server.mjs"]
