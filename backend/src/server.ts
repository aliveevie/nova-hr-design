import app from "./app.js";
import { env } from "./config/env.js";
import { getDatabase } from "./config/database.js";

// Initialize database
getDatabase();

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

