import "dotenv/config";
import dns from "dns";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));

const useProduction = (process.env.PRODUCTION || "").toLowerCase() === "true";
const connectionString =
  (useProduction && process.env.AIVEN_DATABASE_URL) ||
  process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL/AIVEN_DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { connect_timeout: 10 });

async function applySchema() {
  console.log("Connecting to Supabase Postgres...");

  const [{ now }] = await sql`select now()`;
  console.log(`Connected. Server time: ${now}`);

  const schemaPath = join(__dirname, "../supabase/schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf-8");

  console.log("Applying schema...");
  await sql.unsafe(schemaSql);
  console.log("Schema applied successfully.");

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  console.log("Tables:", tables.map((t) => t.table_name).join(", "));

  await sql.end();
  console.log("Done.");
}

applySchema().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
