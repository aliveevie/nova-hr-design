import { existsSync, rmSync } from "fs";
import { join } from "path";

const dbPath = join(process.cwd(), "database", "db.json");

if (existsSync(dbPath)) {
  rmSync(dbPath);
  console.log("Local database reset: database/db.json removed");
} else {
  console.log("Local database reset: no db.json file found");
}

console.log("Start backend again to reinitialize local dev data.");
