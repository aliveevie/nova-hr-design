import "dotenv/config";
import fs from "fs";
import pg from "pg";

const config = {
  user: process.env.AIVEN_DB_USER || "avnadmin",
  password: process.env.AIVEN_DB_PASSWORD || "",
  host: process.env.AIVEN_DB_HOST || "",
  port: Number(process.env.AIVEN_DB_PORT || "27240"),
  database: process.env.AIVEN_DB_NAME || "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca:
      process.env.AIVEN_CA_CERT ||
      fs.readFileSync(process.env.AIVEN_CA_CERT_PATH || "./certs/aiven-ca.pem", "utf8"),
  },
};

const client = new pg.Client(config);

const run = async () => {
  await client.connect();
  const version = await client.query("SELECT VERSION()");
  console.log(version.rows[0].version);
  await client.end();
};

run().catch(async (err) => {
  console.error("Aiven connection failed:", err.message);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
