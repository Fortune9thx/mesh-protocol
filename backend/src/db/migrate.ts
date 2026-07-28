import fs from "node:fs";
import path from "node:path";
import { query, closePool } from "./schema.js";
import "dotenv/config";

async function migrate() {
  console.log("Running migrations...");

  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(import.meta.dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
    if (rows.length > 0) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await query(sql);
    await query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`  ✓ ${file} (applied)`);
  }

  console.log("Migrations complete.");
  await closePool();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
