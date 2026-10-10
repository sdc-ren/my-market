import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

// Drizzle Kit dùng DIRECT_URL (cổng 5432) để chạy DDL migration, nếu không có sẽ dùng DATABASE_URL (cổng 6543)
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionUrl,
  },
});
