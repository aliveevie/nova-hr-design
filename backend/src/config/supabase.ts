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

  // In production, prefer dedicated Aiven connection string when provided.
  const connectionString =
    (env.PRODUCTION && env.AIVEN_DATABASE_URL) ||
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Database is enabled but DATABASE_URL/AIVEN_DATABASE_URL is missing");
  }

  if (!sql) {
    const isAivenProd = !!(env.PRODUCTION && env.AIVEN_DATABASE_URL);
    const caFromPath =
      env.AIVEN_CA_CERT_PATH && fs.existsSync(env.AIVEN_CA_CERT_PATH)
        ? fs.readFileSync(env.AIVEN_CA_CERT_PATH, "utf8")
        : "";
    const ca = env.AIVEN_CA_CERT || caFromPath;

    sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: isAivenProd
        ? (ca
            ? { rejectUnauthorized: true, ca }
            : "require")
        : undefined,
    });
  }

  return sql;
};
