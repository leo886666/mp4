#!/usr/bin/env node
/** Row counts for every table — a quick "is the platform actually populated?". */
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const file = path.resolve(process.cwd(), process.env.VESPER_DATA_DIR || "./storage", "vesper.db");
const db = new DatabaseSync(file);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log(`\n${file}\n`);
let width = Math.max(...tables.map((t) => t.length));
for (const t of tables) {
  const n = db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
  console.log(`  ${t.padEnd(width)}  ${String(n).padStart(9)}`);
}
console.log();
db.close();
