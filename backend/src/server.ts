import app from "./app.js";
import { env } from "./config/env.js";
import { getDatabase } from "./config/database.js";
import { isSupabaseEnabled } from "./config/supabase.js";

// Initialize local database only when Supabase is not enabled
if (!isSupabaseEnabled) {
  getDatabase();
}

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

