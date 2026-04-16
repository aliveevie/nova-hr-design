/**
 * Applies `backend/supabase/apply_attendance_auto_migration.sql` to Aiven Postgres only.
 * Does NOT use DATABASE_URL fallback to respect Aiven-only database requirement.
 */
import "dotenv/config";
import dns from "dns";
import postgres from "postgres";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.AIVEN_DATABASE_URL;
if (!connectionString) {
  console.error("AIVEN_DATABASE_URL is not set");
  process.exit(1);
}

const caFromPath = process.env.AIVEN_CA_CERT_PATH || "";
const caFromFile = caFromPath && fs.existsSync(caFromPath) ? fs.readFileSync(caFromPath, "utf8") : "";
const ca = process.env.AIVEN_CA_CERT || caFromFile;

const isAivenCloud = /aivencloud\.com/i.test(connectionString);

const sql = postgres(connectionString, {
  connect_timeout: 20,
  ssl: isAivenCloud
    ? ca
      ? { rejectUnauthorized: true, ca }
      : "require"
    : undefined,
});

const migrationPath = join(__dirname, "../supabase/apply_attendance_auto_migration.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

async function main() {
  console.log("Applying attendance auto migration (Aiven-only)...");
  await sql.unsafe(migrationSql);
  console.log("Attendance auto migration applied successfully.");
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});

