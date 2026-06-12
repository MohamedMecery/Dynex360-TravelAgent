// Applies a list of local migration files to the linked Supabase project via the
// Management API query endpoint. Requires SUPABASE_ACCESS_TOKEN in the environment.
// Usage: node scripts/apply-missing-migrations.mjs 022 023 024 ...
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const PROJECT_REF = "ndomcfohwnvbyufnrxek";
const MIGRATIONS_DIR = path.resolve("database/migrations");
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN not set");
  process.exit(1);
}

const prefixes = process.argv.slice(2);
if (prefixes.length === 0) {
  console.error("No migration prefixes given");
  process.exit(1);
}

const files = await readdir(MIGRATIONS_DIR);

async function runSql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
}

for (const prefix of prefixes) {
  const file = files.find((f) => f.startsWith(`${prefix}_`) && f.endsWith(".sql"));
  if (!file) {
    console.error(`MISSING FILE for prefix ${prefix}`);
    process.exit(1);
  }
  const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
  process.stdout.write(`Applying ${file} (${sql.length} bytes)... `);
  try {
    await runSql(sql);
    // record in the migration ledger so `supabase migration list` stays truthful
    const name = file.replace(/\.sql$/, "").replace(/^\d+_/, "");
    await runSql(
      `insert into supabase_migrations.schema_migrations (version, name, statements)
       values ('${prefix}', '${name.replace(/'/g, "''")}', null)
       on conflict (version) do nothing`
    );
    console.log("OK");
  } catch (err) {
    console.log("FAILED");
    console.error(String(err.message).slice(0, 2000));
    process.exit(1);
  }
}
console.log("All requested migrations applied.");
