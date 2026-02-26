import app from "../src/app.js";
import { getDatabase } from "../src/config/database.js";
// Initialize database
getDatabase();
// Export the Express app as a serverless function
export default app;
//# sourceMappingURL=index.js.map