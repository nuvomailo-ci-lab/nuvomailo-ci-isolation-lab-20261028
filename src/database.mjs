/**
 * Synthetic shared Pool singleton (public harness).
 *
 * Mirrors the product failure class: module exports one Pool instance;
 * test files call pool.end() in after() without replacing the export.
 * Under --test-isolation=none, a later file reuses the ended Pool and fails with
 * "Cannot use a pool after calling end on the pool".
 * Under --test-isolation=process, each file gets a fresh module/pool.
 */
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "ci_lab",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "ci_lab",
  max: 5,
  connectionTimeoutMillis: 5000,
});

export default pool;
