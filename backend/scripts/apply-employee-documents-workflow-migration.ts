/**
 * Applies supabase/apply_employee_documents_workflow_migration.sql to Postgres.
 */
import "dotenv/config";
import dns from "dns";
import postgres from "postgres";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const useProduction = (process.env.PRODUCTION || "").toLowerCase() === "true";
const connectionString =
  (useProduction && process.env.AIVEN_DATABASE_URL) || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL/AIVEN_DATABASE_URL is not set");
  process.exit(1);
}

const isAivenProd = !!(useProduction && process.env.AIVEN_DATABASE_URL);
const caPath = process.env.AIVEN_CA_CERT_PATH || join(__dirname, "../certs/aiven-ca.pem");
const ca = process.env.AIVEN_CA_CERT || (fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : "");

const sql = postgres(connectionString, {
  connect_timeout: 20,
  ssl: isAivenProd ? (ca ? { rejectUnauthorized: true, ca } : "require") : undefined,
});

const migrationPath = join(__dirname, "../supabase/apply_employee_documents_workflow_migration.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

async function main() {
  console.log("Applying employee documents workflow migration...");
  await sql.unsafe(migrationSql);
  console.log("Done.");
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
