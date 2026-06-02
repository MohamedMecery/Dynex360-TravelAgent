import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "database/migrations");
const out = resolve(root, "database/scripts/RUN_IN_SUPABASE_SQL_EDITOR.sql");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let bundle = `-- TravelOS: run this entire file in Supabase Dashboard → SQL Editor → Run
-- Project: ndomcfohwnvbyufnrxek
-- Order: ${files.join(", ")}

`;

for (const file of files) {
  bundle += `\n-- ========== ${file} ==========\n\n`;
  bundle += readFileSync(resolve(migrationsDir, file), "utf8");
  bundle += "\n";
}

writeFileSync(out, bundle, "utf8");
console.log(`Wrote ${out} (${files.length} migrations)`);
