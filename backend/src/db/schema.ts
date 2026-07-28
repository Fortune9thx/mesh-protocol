import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://mesh:mesh@localhost:5432/mesh_protocol",
      max: 20,
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
