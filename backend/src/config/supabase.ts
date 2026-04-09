import postgres from "postgres";
import dns from "dns";
import fs from "fs";
import { env } from "./env.js";

dns.setDefaultResultOrder("ipv4first");

export const isSupabaseEnabled =
  env.PRODUCTION ||
  env.NODE_ENV === "production" ||
  env.USE_SUPABASE === "true";

let sql: ReturnType<typeof postgres> | null = null;

export const getSql = () => {
  if (!isSupabaseEnabled) return null;

  // Strict: use only Aiven connection for all environments.
  const connectionString = env.AIVEN_DATABASE_URL;
  if (!connectionString) {
    throw new Error("AIVEN_DATABASE_URL is required");
  }

  if (!sql) {
    const caFromPath =
      env.AIVEN_CA_CERT_PATH && fs.existsSync(env.AIVEN_CA_CERT_PATH)
        ? fs.readFileSync(env.AIVEN_CA_CERT_PATH, "utf8")
        : "";
    const ca = env.AIVEN_CA_CERT || caFromPath;

    sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: /aivencloud\.com/i.test(connectionString)
        ? (ca
            ? { rejectUnauthorized: true, ca }
            : "require")
        : undefined,
    });
  }

  return sql;
};
