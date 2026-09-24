/**
 * Database connection helper.
 * Works with Vercel Postgres and Supabase (both use a similar connection pattern).
 */

const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

async function query(text, params) {
  const dbPool = getPool();
  const result = await dbPool.query(text, params);
  return result;
}

module.exports = { getPool, query };
