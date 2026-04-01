import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { env } from "./env.js";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DatabaseData {
  users: any[];
  employees: any[];
  applicants: any[];
  attendance: any[];
  leaveRequests: any[];
  leaveBalances: any[];
  payrolls: any[];
  performances: any[];
  trainings: any[];
  disciplines: any[];
  holidays: any[];
  employeeDocuments: any[];
}

const defaultData: DatabaseData = {
  users: [],
  employees: [],
  applicants: [],
  attendance: [],
  leaveRequests: [],
  leaveBalances: [],
  payrolls: [],
  performances: [],
  trainings: [],
  disciplines: [],
  holidays: [],
  employeeDocuments: [],
};

let db: Low<DatabaseData> | null = null;

export const getDatabase = (): Low<DatabaseData> => {
  if (!db) {
    // Ensure database directory exists
    const dbDir = join(__dirname, "../../database");
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = join(dbDir, "db.json");
    const adapter = new JSONFile<DatabaseData>(dbPath);
    db = new Low<DatabaseData>(adapter, defaultData);
    initializeDatabase();
  }
  return db;
};

const initializeDatabase = async () => {
  if (!db) return;

  await db.read();
  
  // In production with Supabase, avoid mutating local JSON fallback data
  if (env.NODE_ENV === "production" || env.USE_SUPABASE === "true") {
    db.data = { ...defaultData, ...(db.data || {}) };
    return;
  }

  // If database is empty, initialize with default data
  if (!db.data || Object.keys(db.data).length === 0) {
    db.data = { ...defaultData };
    await seedInitialData();
    await db.write();
    console.log("Database initialized successfully");
  } else {
    // Ensure all collections exist
    db.data = { ...defaultData, ...db.data };
    await seedInitialData();
    await db.write();
  }
};

const seedInitialData = async () => {
  if (!db) return;

  // Check if user exists
  const existingUser = db.data.users.find(
    (u) => u.email === "mabubakar@galaxyitt.com.ng"
  );

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash("mabubukar$#!0024!", 10);
    db.data.users.push({
      id: "1",
      name: "Mariya Abubakar",
      email: "mabubakar@galaxyitt.com.ng",
      password: hashedPassword,
      role: "HR Admin",
      initials: "MA",
      employeeId: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log("Initial user seeded");
  }
};

// Helper functions for database operations
export const dbHelpers = {
  async read() {
    if (db) await db.read();
  },
  async write() {
    if (db) await db.write();
  },
  get data() {
    return db?.data || defaultData;
  },
};
