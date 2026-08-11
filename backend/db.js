// db.js — sets up the Postgres connection and makes sure the
// "users" and "bottles" tables exist. Every route imports { pool } from here.

import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. The app will not be able to save anything.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway's Postgres requires SSL, but with a self-signed-style cert,
  // so we relax certificate checking rather than disable SSL entirely.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bottles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      producer TEXT DEFAULT '',
      wine_name TEXT DEFAULT '',
      vintage TEXT DEFAULT '',
      varietal TEXT DEFAULT '',
      region TEXT DEFAULT '',
      is_natural BOOLEAN DEFAULT false,
      tasting_notes TEXT DEFAULT '',
      price_range TEXT DEFAULT '',
      instagram_handle TEXT DEFAULT '',
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'in-cellar',
      rating INTEGER,
      rating_notes TEXT DEFAULT '',
      date_added TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_bottles_user_id ON bottles(user_id);
  `);
  console.log("Database ready.");
}
