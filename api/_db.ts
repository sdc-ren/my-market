// =============================================================================
// SHARED DATABASE CLIENT — dùng chung cho mọi Vercel serverless function.
// Serverless-safe: client được cache trên globalThis để tái sử dụng giữa các
// invocation ấm (tránh mở connection mới mỗi request), prepare: false + max: 1
// để tương thích Supabase transaction pooler (port 6543).
// Khi không có DATABASE_URL (vd: preview/build), db = null và các endpoint
// trả fallback y hệt bản Express (xem logic `if (db)` trong server.ts).
// =============================================================================
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

type Db = PostgresJsDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __myMarketDb: Db | null | undefined;
}

function createDb(): Db | null {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
  if (!connectionString) return null;
  const client = postgres(connectionString, {
    prepare: false, // bắt buộc cho Supabase pooler
    max: 1, // serverless: 1 connection / invocation
  });
  return drizzle(client, { schema });
}

if (globalThis.__myMarketDb === undefined) {
  globalThis.__myMarketDb = createDb();
}

export const db: Db | null = globalThis.__myMarketDb ?? null;
export { schema };
