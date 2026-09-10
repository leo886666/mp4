#!/usr/bin/env node
/** Drops the local database + media so the next boot reseeds from scratch. */
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.cwd(), process.env.VESPER_DATA_DIR || "./storage");
if (!fs.existsSync(dir)) {
  console.log(`Nothing to reset — ${dir} does not exist.`);
  process.exit(0);
}
for (const entry of fs.readdirSync(dir)) {
  fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  console.log("removed", path.join(path.relative(process.cwd(), dir), entry));
}
console.log("\nDone. Start the server to reseed:  npm run dev");
