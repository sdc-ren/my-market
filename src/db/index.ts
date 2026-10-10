import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';

// Postgres client for Node environment / CLI / Server endpoints
// Note: prepare: false is required for Supabase transaction connection pooler (port 6543)
export const client = connectionString
  ? postgres(connectionString, {
      prepare: false,
      max: 10,
    })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export * from './schema';
