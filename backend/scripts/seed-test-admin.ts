/**
 * One-shot: insert Test HR Admin only. Does not update any other user (e.g. Mariya).
 * Run: npx tsx scripts/seed-test-admin.ts
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
  (useProduction && process.env.AIVEN_DATABASE_URL) ||
  process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL/AIVEN_DATABASE_URL is not set");
  process.exit(1);
}

const isAivenProd = !!(useProduction && process.env.AIVEN_DATABASE_URL);
const caPath = process.env.AIVEN_CA_CERT_PATH || join(__dirname, "../certs/aiven-ca.pem");
const ca =
  process.env.AIVEN_CA_CERT ||
  (fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : "");

const sql = postgres(connectionString, {
  connect_timeout: 15,
  ssl: isAivenProd
    ? ca
      ? { rejectUnauthorized: true, ca }
      : "require"
    : undefined,
});

async function main() {
  const result = await sql`
    insert into users (
      name,
      email,
      password,
      role,
      initials,
      employee_id,
      password_must_change,
      first_login_verified
    )
    values (
      'Test HR Admin',
      'test.hr.admin@galaxyitt.com.ng',
      '$2a$10$pIgOiNFSiJzN5F8w9jfA5epTHKmlb5nO/aPIWA84bpjLHh8u2t0DG',
      'HR Admin',
      'TA',
      null,
      false,
      true
    )
    on conflict (email) do nothing
    returning id, email
  `;
  if (result.length === 0) {
    console.log("Test admin already present (on conflict — no changes to other users).");
  } else {
    console.log("Inserted test admin:", result[0]);
  }
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sql.end({ timeout: 1 });
  } catch {}
  process.exit(1);
});
