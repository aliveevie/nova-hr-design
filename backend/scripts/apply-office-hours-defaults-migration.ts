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
  ssl: isAivenCloud ? (ca ? { rejectUnauthorized: true, ca } : "require") : undefined,
});

const migrationSql = fs.readFileSync(
  join(__dirname, "../supabase/apply_office_hours_defaults_migration.sql"),
  "utf8"
);

async function main() {
  console.log("Applying office hours defaults migration...");
  await sql.unsafe(migrationSql);
  console.log("Done.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
