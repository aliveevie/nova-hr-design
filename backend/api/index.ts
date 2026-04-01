import app from "../src/app.js";
import { getDatabase } from "../src/config/database.js";
import { isSupabaseEnabled } from "../src/config/supabase.js";

// Initialize local JSON database only when SQL backend is disabled
if (!isSupabaseEnabled) {
  getDatabase();
}

// Export the Express app as a serverless function
export default app;

