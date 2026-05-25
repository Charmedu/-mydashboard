import { neon } from '@neondatabase/serverless';
import { DashboardData } from './types';

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

export async function initDb(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      id SERIAL PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function loadUserData(userId: string): Promise<DashboardData | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT data FROM user_data WHERE user_id = ${userId}
  `;
  return (rows[0]?.data as DashboardData) ?? null;
}

export async function saveUserData(userId: string, data: DashboardData): Promise<void> {
  const sql = getDb();
  const serialized = JSON.stringify(data);
  await sql`
    INSERT INTO user_data (user_id, data, updated_at)
    VALUES (${userId}, ${serialized}::jsonb, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET data = ${serialized}::jsonb, updated_at = NOW()
  `;
}
